"""
NLP Processor Service
Natural Language Processing for keyword and topic extraction.

Robust against NLTK version differences: newer NLTK renamed resources
(`punkt` -> `punkt_tab`, `averaged_perceptron_tagger` ->
`averaged_perceptron_tagger_eng`). We try the rich pipeline and degrade to
regex-based tokenization if any resource is unavailable, so analysis never
crashes the whole request.
"""

import re
from typing import List, Dict, Any
from collections import Counter

import nltk

# Download both legacy and current resource names; ignore failures (offline box).
for _res in (
    "punkt",
    "punkt_tab",
    "stopwords",
    "averaged_perceptron_tagger",
    "averaged_perceptron_tagger_eng",
):
    try:
        nltk.download(_res, quiet=True)
    except Exception:
        pass

try:
    from nltk.tokenize import word_tokenize, sent_tokenize
    from nltk.corpus import stopwords
    from nltk.tag import pos_tag
except Exception:  # pragma: no cover - extremely degraded environment
    word_tokenize = sent_tokenize = pos_tag = None
    stopwords = None


_DEFAULT_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "is", "are", "was", "were", "be", "been", "this", "that",
    "these", "those", "it", "as", "from", "we", "our", "their", "they",
}


def _safe_word_tokenize(text: str) -> List[str]:
    if word_tokenize:
        try:
            return word_tokenize(text)
        except Exception:
            pass
    return re.findall(r"[A-Za-z][A-Za-z\-']+", text)


def _safe_sent_tokenize(text: str) -> List[str]:
    if sent_tokenize:
        try:
            return sent_tokenize(text)
        except Exception:
            pass
    return [s for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def _safe_pos_tag(tokens: List[str]):
    if pos_tag:
        try:
            return pos_tag(tokens)
        except Exception:
            pass
    # Fallback: treat everything as a noun so keyword extraction still works.
    return [(t, "NN") for t in tokens]


class NLPProcessor:
    def __init__(self):
        try:
            self.stop_words = set(stopwords.words("english")) if stopwords else set(_DEFAULT_STOPWORDS)
        except Exception:
            self.stop_words = set(_DEFAULT_STOPWORDS)

        self.stop_words.update([
            "paper", "study", "research", "method", "result", "conclusion",
            "figure", "table", "section", "chapter", "page", "et", "al",
            "also", "may", "can", "would", "could", "should", "using", "used",
        ])

    def process_text(self, text: str) -> Dict[str, Any]:
        if not text:
            return {"keywords": [], "topics": [], "features": {}}

        keywords = self._extract_keywords(text)
        topics = self._extract_topics(text)

        return {
            "keywords": keywords,
            "topics": topics,
            "features": {
                "word_count": len(_safe_word_tokenize(text)),
                "sentence_count": len(_safe_sent_tokenize(text)),
            },
        }

    def _extract_keywords(self, text: str, top_n: int = 20) -> List[Dict[str, Any]]:
        tokens = _safe_word_tokenize(text.lower())
        tagged = _safe_pos_tag(tokens)

        important_tags = {"NN", "NNS", "NNP", "NNPS", "JJ", "JJR", "JJS", "VBG"}
        filtered_words = [
            word
            for word, tag in tagged
            if tag in important_tags
            and word not in self.stop_words
            and word.isalpha()
            and len(word) > 2
        ]

        word_freq = Counter(filtered_words)
        top_keywords = word_freq.most_common(top_n)
        max_freq = top_keywords[0][1] if top_keywords else 1

        return [
            {"word": word, "frequency": freq, "importance": round(freq / max_freq, 3)}
            for word, freq in top_keywords
        ]

    def _extract_topics(self, text: str, top_n: int = 10) -> List[Dict[str, Any]]:
        sentences = _safe_sent_tokenize(text)
        topics_list = []

        for sentence in sentences:
            tokens = _safe_word_tokenize(sentence.lower())
            tagged = _safe_pos_tag(tokens)
            for i in range(len(tagged) - 1):
                word1, tag1 = tagged[i]
                word2, tag2 = tagged[i + 1]
                if tag1 in {"JJ", "JJR", "JJS"} and tag2 in {"NN", "NNS"}:
                    phrase = f"{word1} {word2}"
                    if phrase not in self.stop_words and len(phrase) > 3:
                        topics_list.append(phrase)

        topic_freq = Counter(topics_list)
        top_topics = topic_freq.most_common(top_n)

        return [
            {"topic": topic, "confidence": round(min(freq / 5.0, 1.0), 3)}
            for topic, freq in top_topics
        ]
