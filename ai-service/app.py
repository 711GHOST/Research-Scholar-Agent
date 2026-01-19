"""
AI Service - Research Scholar Agent
FastAPI microservice for AI-powered research paper analysis

This service provides:
- PDF text extraction
- Section-wise summarization
- Keyword & topic extraction
- Research gap & question generation
- Related work suggestions

Automation Context: This is the AI automation engine that processes
research papers and generates insights automatically.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from config import PORT
from typing import List, Dict, Optional, Any
import base64
import io
from datetime import datetime
import time

from services.pdf_extractor import PDFExtractor
from services.nlp_processor import NLPProcessor
from services.ai_analyzer import AIAnalyzer

# Initialize FastAPI app
app = FastAPI(
    title="Research Scholar Agent AI Service",
    description="AI-powered research paper analysis microservice",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
pdf_extractor = PDFExtractor()
nlp_processor = NLPProcessor()
ai_analyzer = AIAnalyzer()


# Request/Response Models
class AnalyzePaperRequest(BaseModel):
    fileName: str
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
    message: str
    context: Dict[str, Any]


class ChatResponse(BaseModel):
    success: bool
    response: str
    context: Optional[Dict[str, Any]] = None


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "success": True,
        "message": "AI Service is running",
        "timestamp": datetime.now().isoformat()
    }


@app.post("/ai/analyze-paper", response_model=AnalyzePaperResponse)
async def analyze_paper(request: AnalyzePaperRequest):
    """
    Analyze a research paper PDF
    
    Automation: This endpoint automates the complete analysis pipeline:
    1. Extracts text from PDF
    2. Identifies paper sections
    3. Summarizes each section
    4. Extracts keywords and topics
    5. Generates research gaps and questions
    6. Suggests related work
    
    This is the core automation function that processes papers automatically.
    """
    start_time = time.time()
    
    try:
        # Decode base64 PDF
        pdf_bytes = base64.b64decode(request.fileContent)
        pdf_file = io.BytesIO(pdf_bytes)
        
        # Extract text from PDF
        print(f"Extracting text from PDF: {request.fileName}")
        extracted_data = pdf_extractor.extract_text(pdf_file)
        
        if not extracted_data or not extracted_data.get('full_text'):
            raise HTTPException(
                status_code=400,
                detail="Failed to extract text from PDF"
            )
        
        full_text = extracted_data['full_text']
        sections = extracted_data.get('sections', {})
        metadata = extracted_data.get('metadata', {})
        
        # Process with NLP
        print("Processing with NLP...")
        nlp_results = nlp_processor.process_text(full_text)
        
        # AI Analysis (summarization, gaps, questions, etc.)
        print("Running AI analysis...")
        ai_results = ai_analyzer.analyze_paper(
            full_text=full_text,
            sections=sections,
            nlp_results=nlp_results
        )
        
        processing_time = time.time() - start_time
        
        # Combine results
        response_data = {
            "success": True,
            "sections": ai_results.get("sections", {}),
            "keywords": nlp_results.get("keywords", []),
            "topics": nlp_results.get("topics", []),
            "researchGaps": ai_results.get("research_gaps", []),
            "researchQuestions": ai_results.get("research_questions", []),
            "relatedWorkSuggestions": ai_results.get("related_work", []),
            "metadata": metadata,
            "processingTime": processing_time,
            "aiModel": ai_analyzer.model_name # Track which model was used
        }
        
        return AnalyzePaperResponse(**response_data)
        
    except Exception as e:
        print(f"Error analyzing paper: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing paper: {str(e)}"
        )


@app.post("/ai/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Research chatbot endpoint
    
    Automation: Provides context-aware research assistance based on:
    - User's uploaded papers
    - Research domain
    - Chat history
    
    This automates conversational AI for research queries.
    """
    try:
        message = request.message
        context = request.context
        
        # Generate response using AI analyzer
        response = ai_analyzer.chat(
            message=message,
            context=context
        )
        
        return ChatResponse(
            success=True,
            response=response,
            context=context
        )
        
    except Exception as e:
        print(f"Error in chat: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating chat response: {str(e)}"
        )


@app.post("/ai/suggest-gaps")
async def suggest_gaps(request: Dict[str, Any]):
    """
    Suggest research gaps for a topic
    
    Automation: Automatically identifies research gaps in a given domain
    """
    try:
        topic = request.get("topic", "")
        domain = request.get("domain", "")
        
        if not topic:
            raise HTTPException(status_code=400, detail="Topic is required")
        
        gaps = ai_analyzer.suggest_gaps(topic=topic, domain=domain)
        
        return {
            "success": True,
            "gaps": gaps
        }
        
    except Exception as e:
        print(f"Error suggesting gaps: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error suggesting gaps: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
