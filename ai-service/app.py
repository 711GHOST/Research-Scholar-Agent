"""
AI Service - Research Scholar Agent
FastAPI microservice for AI-powered research paper analysis.

Security:
- This service must never be exposed publicly. It only accepts calls that carry
  the shared `x-internal-secret` header (when AI_SERVICE_SECRET is configured).
- CORS is restricted to the backend origin(s).
"""

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import base64
import binascii
import io
import time
from datetime import datetime

from config import PORT, AI_SERVICE_SECRET, AI_ALLOWED_ORIGINS, USE_GEMINI
from services.pdf_extractor import PDFExtractor
from services.nlp_processor import NLPProcessor
from services.ai_analyzer import AIAnalyzer

app = FastAPI(
    title="Research Scholar Agent AI Service",
    description="AI-powered research paper analysis microservice",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=AI_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "x-internal-secret"],
)

pdf_extractor = PDFExtractor()
nlp_processor = NLPProcessor()
ai_analyzer = AIAnalyzer()

# Reject PDFs whose decoded size exceeds this (defense against memory abuse).
MAX_PDF_BYTES = 30 * 1024 * 1024


async def verify_internal_secret(x_internal_secret: Optional[str] = Header(default=None)):
    """Require the shared secret when one is configured."""
    if AI_SERVICE_SECRET:
        if not x_internal_secret or x_internal_secret != AI_SERVICE_SECRET:
            raise HTTPException(status_code=401, detail="Unauthorized")
    return True


class AnalyzePaperRequest(BaseModel):
    fileName: str = Field(..., max_length=512)
    fileContent: str  # Base64 encoded PDF


class AnalyzePaperResponse(BaseModel):
    success: bool
    sections: Dict[str, str]
    keywords: List[Dict[str, Any]]
    topics: List[Dict[str, Any]]
    researchGaps: List[Dict[str, Any]]
    researchQuestions: List[Dict[str, Any]]
    relatedWorkSuggestions: List[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]] = None
    processingTime: float
    aiModel: str


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=8000)
    context: Dict[str, Any] = {}


class ChatResponse(BaseModel):
    success: bool
    response: str
    context: Optional[Dict[str, Any]] = None


@app.get("/health")
async def health_check():
    return {
        "success": True,
        "message": "AI Service is running",
        "geminiEnabled": USE_GEMINI,
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/ai/analyze-paper", response_model=AnalyzePaperResponse)
async def analyze_paper(request: AnalyzePaperRequest, _=Depends(verify_internal_secret)):
    start_time = time.time()
    try:
        try:
            pdf_bytes = base64.b64decode(request.fileContent, validate=True)
        except (binascii.Error, ValueError):
            raise HTTPException(status_code=400, detail="Invalid base64 PDF content")

        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="Empty PDF content")
        if len(pdf_bytes) > MAX_PDF_BYTES:
            raise HTTPException(status_code=413, detail="PDF too large")
        if not pdf_bytes.startswith(b"%PDF-"):
            raise HTTPException(status_code=400, detail="Content is not a PDF")

        pdf_file = io.BytesIO(pdf_bytes)

        extracted_data = pdf_extractor.extract_text(pdf_file)
        if not extracted_data or not extracted_data.get("full_text"):
            raise HTTPException(status_code=400, detail="Failed to extract text from PDF")

        full_text = extracted_data["full_text"]
        sections = extracted_data.get("sections", {})
        metadata = extracted_data.get("metadata", {})

        nlp_results = nlp_processor.process_text(full_text)
        ai_results = ai_analyzer.analyze_paper(
            full_text=full_text, sections=sections, nlp_results=nlp_results
        )

        processing_time = round(time.time() - start_time, 2)

        return AnalyzePaperResponse(
            success=True,
            sections=ai_results.get("sections", {}),
            keywords=nlp_results.get("keywords", []),
            topics=nlp_results.get("topics", []),
            researchGaps=ai_results.get("research_gaps", []),
            researchQuestions=ai_results.get("research_questions", []),
            relatedWorkSuggestions=ai_results.get("related_work", []),
            metadata=metadata,
            processingTime=processing_time,
            aiModel=ai_analyzer.model_name,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error analyzing paper: {e}")
        raise HTTPException(status_code=500, detail="Error processing paper")


@app.post("/ai/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, _=Depends(verify_internal_secret)):
    try:
        response = ai_analyzer.chat(message=request.message, context=request.context)
        return ChatResponse(success=True, response=response, context=request.context)
    except Exception as e:
        print(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail="Error generating chat response")


@app.post("/ai/suggest-gaps")
async def suggest_gaps(request: Dict[str, Any], _=Depends(verify_internal_secret)):
    topic = request.get("topic", "")
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    try:
        gaps = ai_analyzer.suggest_gaps(topic=topic, domain=request.get("domain", ""))
        return {"success": True, "gaps": gaps}
    except Exception as e:
        print(f"Error suggesting gaps: {e}")
        raise HTTPException(status_code=500, detail="Error suggesting gaps")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
