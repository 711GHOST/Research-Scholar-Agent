"""
AI Analyzer Service (Gemini-powered, NEW SDK)
"""

from pyexpat import model
from typing import Dict, List, Any
from google import genai
from config import GEMINI_API_KEY


class AIAnalyzer:
    """
    AI Analysis Service using Google Gemini (google.genai)
    """

    def __init__(self):
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        self.model_name = "gemini-flash-latest"

    # ---------- PAPER ANALYSIS ----------

    def analyze_paper(
        self,
        full_text: str,
        sections: Dict[str, str],
        nlp_results: Dict[str, Any]
    ) -> Dict[str, Any]:

        section_summaries = {}
        for section, text in sections.items():
            if text:
                section_summaries[section] = self._summarize(text, section)

        research_gaps = self._identify_research_gaps(full_text)
        research_questions = self._generate_questions(nlp_results)
        related_work = self._suggest_related_work(nlp_results)

        return {
            "sections": section_summaries,
            "research_gaps": research_gaps,
            "research_questions": research_questions,
            "related_work": related_work
        }

    # ---------- GEMINI GENERATION ----------

    def _generate(self, prompt: str) -> str:
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt
        )
        return response.text.strip()

    def _summarize(self, text: str, section: str) -> str:
        prompt = f"""
        Summarize the {section} section of a research paper
        in formal academic language (max 120 words):

        {text[:6000]}
        """
        return self._generate(prompt)

    def _identify_research_gaps(self, text: str) -> List[Dict[str, Any]]:
        prompt = f"""
        Identify 3–5 research gaps from the following paper.
        Respond in bullet points only.

        {text[:6000]}
        """
        output = self._generate(prompt)

        return [
            {"gap": g.strip("-• "), "priority": "medium"}
            for g in output.split("\n") if g.strip()
        ]

    def _generate_questions(self, nlp_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        keywords = [k["word"] for k in nlp_results.get("keywords", [])[:5]]
        topics = [t["topic"] for t in nlp_results.get("topics", [])[:3]]

        prompt = f"""
        Generate 4 PhD-level research questions using:
        Keywords: {keywords}
        Topics: {topics}
        """

        output = self._generate(prompt)

        return [{"question": q.strip("-• ")} for q in output.split("\n") if q.strip()]

    def _suggest_related_work(self, nlp_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        keywords = [k["word"] for k in nlp_results.get("keywords", [])[:5]]

        prompt = f"""
        Suggest 3 related academic works.
        Base them on the following keywords: {keywords}.
        Include title and reason.
        """

        output = self._generate(prompt)

        return [{"suggestion": s.strip()} for s in output.split("\n") if s.strip()]

    # ---------- CHAT ----------

    def chat(self, message: str, context: Dict[str, Any]) -> str:
        prompt = f"""
        You are a research assistant.
        Context: {context}
        Question: {message}
        """
        return self._generate(prompt)
