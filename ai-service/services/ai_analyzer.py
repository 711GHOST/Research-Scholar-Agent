"""
AI Analyzer Service.

Uses Google Gemini when GEMINI_API_KEY is configured, and falls back to a
deterministic offline analyzer otherwise. All public methods return data shaped
to match the backend Mongoose schemas so the dashboard renders correctly:

  research_gaps        -> [{gap, reasoning, priority}]
  research_questions   -> [{question, category}]
  related_work         -> [{title, authors, reason}]
"""

import json
import re
from typing import Dict, List, Any

from config import GEMINI_API_KEY, USE_GEMINI


def _clean_bullet(text: str) -> str:
    return re.sub(r"^[\s\-\*•\d\.\)]+", "", text or "").strip()


def _extract_json(text: str):
    """Best-effort JSON parsing from an LLM response that may include fences."""
    if not text:
        return None
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    candidate = fenced.group(1).strip() if fenced else text.strip()
    # Narrow to the outermost JSON array/object if there is surrounding prose.
    for opener, closer in (("[", "]"), ("{", "}")):
        start = candidate.find(opener)
        end = candidate.rfind(closer)
        if start != -1 and end > start:
            try:
                return json.loads(candidate[start : end + 1])
            except json.JSONDecodeError:
                continue
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return None


class AIAnalyzer:
    def __init__(self):
        self.use_gemini = USE_GEMINI
        self._gemini_failures = 0
        if self.use_gemini:
            try:
                from google import genai

                self.client = genai.Client(api_key=GEMINI_API_KEY)
                self.model_name = "gemini-flash-lite-latest"
            except Exception as e:  # SDK missing / bad key -> offline mode
                print(f"Gemini unavailable, using offline analyzer: {e}")
                self.use_gemini = False
                self.model_name = "offline-extractive"
        else:
            self.client = None
            self.model_name = "offline-extractive"

    # ---------- PUBLIC API ----------

    def analyze_paper(
        self,
        full_text: str,
        sections: Dict[str, str],
        nlp_results: Dict[str, Any],
    ) -> Dict[str, Any]:
        section_summaries = {}
        for section, text in sections.items():
            if text:
                section_summaries[section] = self._summarize(text, section)

        return {
            "sections": section_summaries,
            "research_gaps": self._identify_research_gaps(full_text),
            "research_questions": self._generate_questions(nlp_results),
            "related_work": self._suggest_related_work(nlp_results),
        }

    def chat(self, message: str, context: Dict[str, Any]) -> str:
        if self.use_gemini:
            papers = context.get("papers", []) if isinstance(context, dict) else []
            paper_brief = "\n".join(
                f"- {p.get('title', 'Untitled')}: {(p.get('summaryText') or '')[:600]}"
                for p in papers[:5]
            )
            domain = context.get("researchDomain", "") if isinstance(context, dict) else ""
            prompt = (
                "You are a helpful research assistant. Answer using the user's "
                "papers when relevant and be concise and academic.\n"
                f"Research domain: {domain}\n"
                f"User's papers:\n{paper_brief}\n\n"
                f"Question: {message}"
            )
            try:
                return self._generate(prompt)
            except Exception as e:
                print(f"Gemini chat error: {e}")
        return self._offline_chat(message, context)

    def suggest_gaps(self, topic: str, domain: str = "") -> List[Dict[str, Any]]:
        if self.use_gemini:
            prompt = (
                f"List 4 research gaps for the topic '{topic}' in the domain "
                f"'{domain}'. Return JSON array of objects with keys "
                f'"gap", "reasoning", "priority" (high|medium|low).'
            )
            try:
                data = _extract_json(self._generate(prompt))
                if isinstance(data, list):
                    return [self._normalize_gap(g) for g in data][:6]
            except Exception as e:
                print(f"Gemini suggest_gaps error: {e}")
        return [
            {
                "gap": f"Limited empirical evaluation of {topic}",
                "reasoning": "Few studies provide large-scale validation.",
                "priority": "medium",
            }
        ]

    # ---------- GEMINI ----------

    def _generate(self, prompt: str) -> str:
        try:
            response = self.client.models.generate_content(
                model=self.model_name, contents=prompt
            )
            self._gemini_failures = 0
            return (response.text or "").strip()
        except Exception as e:
            # Circuit breaker: after repeated failures (e.g. an invalid/wrong
            # key) stop calling Gemini and use the offline analyzer, so analyses
            # stay fast instead of retrying a dead API for every section.
            self._gemini_failures += 1
            if self.use_gemini and self._gemini_failures >= 3:
                self.use_gemini = False
                self.model_name = "offline-extractive"
                print(f"Disabling Gemini after repeated failures: {e}")
            raise

    # ---------- SUMMARIZATION ----------

    def _summarize(self, text: str, section: str) -> str:
        if self.use_gemini:
            prompt = (
                f"Summarize the {section} section of a research paper in formal "
                f"academic language (max 120 words):\n\n{text[:6000]}"
            )
            try:
                return self._generate(prompt)
            except Exception as e:
                print(f"Gemini summarize error ({section}): {e}")
        return self._extractive_summary(text, max_sentences=3)

    @staticmethod
    def _extractive_summary(text: str, max_sentences: int = 3) -> str:
        sentences = re.split(r"(?<=[.!?])\s+", (text or "").strip())
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
        return " ".join(sentences[:max_sentences])

    # ---------- ANALYSIS ----------

    def _identify_research_gaps(self, text: str) -> List[Dict[str, Any]]:
        if self.use_gemini:
            prompt = (
                "Identify 3-5 research gaps from the following paper. Return a "
                'JSON array of objects with keys "gap", "reasoning", "priority" '
                f"(high|medium|low).\n\n{text[:6000]}"
            )
            try:
                data = _extract_json(self._generate(prompt))
                if isinstance(data, list) and data:
                    return [self._normalize_gap(g) for g in data][:6]
            except Exception as e:
                print(f"Gemini gaps error: {e}")
        return self._offline_gaps(text)

    def _generate_questions(self, nlp_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        keywords = [k["word"] for k in nlp_results.get("keywords", [])[:6]]
        topics = [t["topic"] for t in nlp_results.get("topics", [])[:4]]
        if self.use_gemini:
            prompt = (
                "Generate 4 PhD-level research questions. Return a JSON array of "
                'objects with keys "question" and "category".\n'
                f"Keywords: {keywords}\nTopics: {topics}"
            )
            try:
                data = _extract_json(self._generate(prompt))
                if isinstance(data, list) and data:
                    return [self._normalize_question(q) for q in data][:6]
            except Exception as e:
                print(f"Gemini questions error: {e}")
        return self._offline_questions(keywords, topics)

    def _suggest_related_work(self, nlp_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        keywords = [k["word"] for k in nlp_results.get("keywords", [])[:6]]
        if self.use_gemini:
            prompt = (
                "Suggest 3 related academic works based on these keywords: "
                f"{keywords}. Return a JSON array of objects with keys "
                '"title", "authors" (array of strings), and "reason".'
            )
            try:
                data = _extract_json(self._generate(prompt))
                if isinstance(data, list) and data:
                    return [self._normalize_related(r) for r in data][:6]
            except Exception as e:
                print(f"Gemini related work error: {e}")
        return self._offline_related(keywords)

    # ---------- NORMALIZERS (guarantee schema shape) ----------

    @staticmethod
    def _normalize_gap(g: Any) -> Dict[str, Any]:
        if isinstance(g, str):
            return {"gap": _clean_bullet(g), "reasoning": "", "priority": "medium"}
        priority = str(g.get("priority", "medium")).lower()
        if priority not in ("high", "medium", "low"):
            priority = "medium"
        return {
            "gap": _clean_bullet(str(g.get("gap", ""))),
            "reasoning": str(g.get("reasoning", "")),
            "priority": priority,
        }

    @staticmethod
    def _normalize_question(q: Any) -> Dict[str, Any]:
        if isinstance(q, str):
            return {"question": _clean_bullet(q), "category": "general"}
        return {
            "question": _clean_bullet(str(q.get("question", ""))),
            "category": str(q.get("category", "general")),
        }

    @staticmethod
    def _normalize_related(r: Any) -> Dict[str, Any]:
        if isinstance(r, str):
            return {"title": _clean_bullet(r), "authors": [], "reason": ""}
        authors = r.get("authors", [])
        if isinstance(authors, str):
            authors = [a.strip() for a in authors.split(",") if a.strip()]
        return {
            "title": str(r.get("title", "")).strip(),
            "authors": authors or [],
            "reason": str(r.get("reason", "")).strip(),
        }

    # ---------- OFFLINE FALLBACKS ----------

    def _offline_gaps(self, text: str) -> List[Dict[str, Any]]:
        cues = ["future work", "limitation", "further research", "remains", "challenge"]
        sentences = re.split(r"(?<=[.!?])\s+", text or "")
        gaps = []
        for s in sentences:
            low = s.lower()
            if any(c in low for c in cues) and len(s.strip()) > 30:
                gaps.append(
                    {"gap": s.strip()[:200], "reasoning": "Stated by the authors.", "priority": "medium"}
                )
            if len(gaps) >= 4:
                break
        if not gaps:
            gaps.append(
                {
                    "gap": "The paper does not explicitly state limitations or future work.",
                    "reasoning": "No limitation cues were detected in the text.",
                    "priority": "low",
                }
            )
        return gaps

    def _offline_questions(self, keywords, topics) -> List[Dict[str, Any]]:
        terms = topics or keywords or ["the studied problem"]
        templates = [
            ("How can {t} be improved using modern techniques?", "methodology"),
            ("What are the limitations of current approaches to {t}?", "analysis"),
            ("How does {t} generalize across different datasets?", "evaluation"),
            ("What ethical considerations arise when applying {t}?", "ethics"),
        ]
        out = []
        for i, (tmpl, cat) in enumerate(templates):
            term = terms[i % len(terms)]
            out.append({"question": tmpl.format(t=term), "category": cat})
        return out

    def _offline_related(self, keywords) -> List[Dict[str, Any]]:
        if not keywords:
            return []
        joined = ", ".join(keywords[:3])
        return [
            {
                "title": f"A survey of methods related to {joined}",
                "authors": [],
                "reason": f"Relevant because it covers the key topics: {joined}.",
            }
        ]

    def _offline_chat(self, message: str, context: Dict[str, Any]) -> str:
        papers = context.get("papers", []) if isinstance(context, dict) else []
        if papers:
            titles = ", ".join(p.get("title", "Untitled") for p in papers[:3])
            return (
                "The AI model is not configured, so I can only give a basic "
                f"response. Based on your library ({titles}), please review the "
                "analysis tab for summaries, keywords, and research gaps. "
                f'You asked: "{message[:200]}".'
            )
        return (
            "The AI model is not configured. Upload and analyze a paper to get "
            "summaries and research-gap suggestions."
        )
