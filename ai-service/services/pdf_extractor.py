"""
PDF Extractor Service
Extracts text, sections, and metadata from research paper PDFs

Automation: Automates PDF parsing and structure identification
"""

import PyPDF2
import pdfplumber
from typing import Dict, List, Optional, Any
import io
import re


class PDFExtractor:
    """
    Extracts text and structure from PDF files
    Uses PyPDF2 and pdfplumber for robust extraction
    """
    
    def __init__(self):
        self.section_keywords = {
            'abstract': [r'abstract', r'summary'],
            'introduction': [r'introduction', r'background'],
            'methodology': [r'methodology', r'methods', r'approach', r'method'],
            'results': [r'results', r'findings', r'experimental results'],
            'discussion': [r'discussion', r'analysis', r'evaluation'],
            'conclusion': [r'conclusion', r'conclusions', r'summary and conclusions']
        }
    
    def extract_text(self, pdf_file: io.BytesIO) -> Dict[str, Any]:
        """
        Extract text, sections, and metadata from PDF
        
        Args:
            pdf_file: BytesIO object containing PDF data
            
        Returns:
            Dictionary with full_text, sections, and metadata
        """
        try:
            # Try pdfplumber first (better for structured extraction)
            text_content = []
            sections = {}
            metadata = {}
            
            pdf_file.seek(0)  # Reset file pointer
            
            with pdfplumber.open(pdf_file) as pdf:
                # Extract metadata
                if pdf.metadata:
                    metadata = {
                        'title': pdf.metadata.get('Title', ''),
                        'author': pdf.metadata.get('Author', ''),
                        'subject': pdf.metadata.get('Subject', ''),
                        'creator': pdf.metadata.get('Creator', ''),
                    }
                
                # Extract text from all pages
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(page_text)
            
            full_text = '\n\n'.join(text_content)
            
            # Identify sections
            sections = self._identify_sections(full_text)
            
            return {
                'full_text': full_text,
                'sections': sections,
                'metadata': metadata,
                'page_count': len(text_content)
            }
            
        except Exception as e:
            print(f"Error extracting PDF with pdfplumber: {str(e)}")
            # Fallback to PyPDF2
            return self._extract_with_pypdf2(pdf_file)
    
    def _extract_with_pypdf2(self, pdf_file: io.BytesIO) -> Dict[str, Any]:
        """Fallback extraction using PyPDF2"""
        try:
            pdf_file.seek(0)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text_content = []
            metadata = {}
            
            # Extract metadata
            if pdf_reader.metadata:
                metadata = {
                    'title': pdf_reader.metadata.get('/Title', ''),
                    'author': pdf_reader.metadata.get('/Author', ''),
                    'subject': pdf_reader.metadata.get('/Subject', ''),
                }
            
            # Extract text from all pages
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    text_content.append(text)
            
            full_text = '\n\n'.join(text_content)
            sections = self._identify_sections(full_text)
            
            return {
                'full_text': full_text,
                'sections': sections,
                'metadata': metadata,
                'page_count': len(text_content)
            }
            
        except Exception as e:
            print(f"Error with PyPDF2 extraction: {str(e)}")
            raise Exception(f"Failed to extract PDF: {str(e)}")
    
    def _identify_sections(self, text: str) -> Dict[str, str]:
        """
        Identify paper sections using keyword matching
        
        This is a simple heuristic-based approach. In production,
        this could use ML-based section detection.
        """
        sections = {}
        text_lower = text.lower()
        
        # Split text into paragraphs
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        current_section = None
        current_content = []
        
        for para in paragraphs:
            para_lower = para.lower()
            section_found = False
            
            # Check if paragraph starts a new section
            for section_name, keywords in self.section_keywords.items():
                for keyword in keywords:
                    # Look for section headers (typically short lines in uppercase or title case)
                    if len(para) < 200 and re.search(keyword, para_lower[:100]):
                        # Save previous section
                        if current_section:
                            sections[current_section] = '\n\n'.join(current_content)
                        
                        # Start new section
                        current_section = section_name
                        current_content = []
                        section_found = True
                        break
                    
                if section_found:
                    break
            
            # Add paragraph to current section
            if current_section:
                current_content.append(para)
            elif not sections:
                # If no section identified yet, assume introduction
                current_section = 'introduction'
                current_content.append(para)
        
        # Save last section
        if current_section:
            sections[current_section] = '\n\n'.join(current_content)
        
        # Ensure we have at least full text
        if not sections:
            sections['full_text'] = text
        
        return sections
