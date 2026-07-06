"""
AI service tests - run fully offline (no Gemini key, no network).
    cd ai-service && pytest
"""

import base64

from fastapi.testclient import TestClient

import app as app_module
from app import app
from services.nlp_processor import NLPProcessor
from services.ai_analyzer import AIAnalyzer

client = TestClient(app)


def test_health_ok():
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["geminiEnabled"] is False  # offline in tests


def test_analyze_rejects_invalid_base64():
    res = client.post("/ai/analyze-paper", json={"fileName": "x.pdf", "fileContent": "%%%notb64%%%"})
    assert res.status_code == 400


def test_analyze_rejects_non_pdf():
    not_pdf = base64.b64encode(b"this is plainly not a pdf").decode()
    res = client.post("/ai/analyze-paper", json={"fileName": "x.pdf", "fileContent": not_pdf})
    assert res.status_code == 400


def test_chat_offline_returns_response():
    res = client.post("/ai/chat", json={"message": "Hello", "context": {"papers": []}})
    assert res.status_code == 200
    assert isinstance(res.json()["response"], str)
    assert len(res.json()["response"]) > 0


def test_internal_secret_enforced(monkeypatch):
    # When a secret is configured, requests without the header must be rejected.
    monkeypatch.setattr(app_module, "AI_SERVICE_SECRET", "topsecret")
    res = client.post("/ai/chat", json={"message": "hi", "context": {}})
    assert res.status_code == 401

    res_ok = client.post(
        "/ai/chat",
        json={"message": "hi", "context": {}},
        headers={"x-internal-secret": "topsecret"},
    )
    assert res_ok.status_code == 200


def test_nlp_processor_shapes():
    nlp = NLPProcessor()
    out = nlp.process_text(
        "Deep learning models improve image classification accuracy. "
        "Neural networks learn hierarchical features from data."
    )
    assert "keywords" in out and isinstance(out["keywords"], list)
    assert "topics" in out and isinstance(out["topics"], list)
    if out["keywords"]:
        assert set(out["keywords"][0].keys()) >= {"word", "frequency", "importance"}


def test_analyzer_offline_schema():
    analyzer = AIAnalyzer()
    assert analyzer.use_gemini is False
    result = analyzer.analyze_paper(
        full_text="We present a method. A limitation is the small dataset. Future work is needed.",
        sections={"abstract": "We present a new method for testing."},
        nlp_results={"keywords": [{"word": "method"}], "topics": [{"topic": "small dataset"}]},
    )
    # research_gaps must match the backend schema: gap/reasoning/priority
    gap = result["research_gaps"][0]
    assert set(gap.keys()) == {"gap", "reasoning", "priority"}
    assert gap["priority"] in {"high", "medium", "low"}
    # research_questions must have question/category
    q = result["research_questions"][0]
    assert set(q.keys()) == {"question", "category"}
    # related_work must have title/authors/reason
    if result["related_work"]:
        rw = result["related_work"][0]
        assert set(rw.keys()) == {"title", "authors", "reason"}
        assert isinstance(rw["authors"], list)
