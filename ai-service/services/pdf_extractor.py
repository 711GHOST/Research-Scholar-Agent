"""
PDF Extractor Service
Extracts text, sections, and metadata from research paper PDFs.

Memory-conscious: uses the lightweight, pure-Python `pypdf` by default (safe on
512MB hosts) and only falls back to the heavier `pdfplumber` if `pypdf` yields
almost no text. Also caps the number of pages processed.
"""

from typing import Dict, Any
import io
import re

from pypdf import PdfReader

# Cap pages to bound memory/CPU on constrained hosts (papers rarely need more).
MAX_PAGES = 40


class PDFExtractor:
    def __init__(self):
        self.section_keywords = {
            'abstract': [r'abstract', r'summary'],
            'introduction': [r'introduction', r'background'],
            'methodology': [r'methodology', r'methods', r'approach', r'method'],
            'results': [r'results', r'findings', r'experimental results'],
            'discussion': [r'discussion', r'analysis', r'evaluation'],
            'conclusion': [r'conclusion', r'conclusions', r'summary and conclusions'],
        }

    def extract_text(self, pdf_file: io.BytesIO) -> Dict[str, Any]:
        # 1) Lightweight pass with pypdf
        try:
            pdf_file.seek(0)
            reader = PdfReader(pdf_file)

            metadata = {}
            if reader.metadata:
                metadata = {
                    'title': str(reader.metadata.title or ''),
                    'author': str(reader.metadata.author or ''),
                    'subject': str(reader.metadata.subject or ''),
                }

            text_content = []
            for page in reader.pages[:MAX_PAGES]:
                try:
                    t = page.extract_text() or ''
                except Exception:
                    t = ''
                if t.strip():
                    text_content.append(t)

            full_text = '\n\n'.join(text_content).strip()

            # If pypdf found reasonable text, use it.
            if len(full_text) >= 200:
                return {
                    'full_text': full_text,
                    'sections': self._identify_sections(full_text),
                    'metadata': metadata,
                    'page_count': len(text_content),
                }
        except Exception as e:
            print(f"pypdf extraction failed: {e}")

        # 2) Fallback: pdfplumber (heavier - imported lazily so it isn't loaded
        #    into memory unless actually needed).
        try:
            import pdfplumber

            pdf_file.seek(0)
            text_content = []
            metadata = {}
            with pdfplumber.open(pdf_file) as pdf:
                if pdf.metadata:
                    metadata = {
                        'title': pdf.metadata.get('Title', ''),
                        'author': pdf.metadata.get('Author', ''),
                        'subject': pdf.metadata.get('Subject', ''),
                    }
                for page in pdf.pages[:MAX_PAGES]:
                    t = page.extract_text()
                    if t:
                        text_content.append(t)

            full_text = '\n\n'.join(text_content).strip()
            return {
                'full_text': full_text,
                'sections': self._identify_sections(full_text),
                'metadata': metadata,
                'page_count': len(text_content),
            }
        except Exception as e:
            print(f"pdfplumber extraction failed: {e}")
            return {'full_text': '', 'sections': {}, 'metadata': {}, 'page_count': 0}

    def _identify_sections(self, text: str) -> Dict[str, str]:
        sections = {}
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

        current_section = None
        current_content = []

        for para in paragraphs:
            para_lower = para.lower()
            section_found = False

            for section_name, keywords in self.section_keywords.items():
                for keyword in keywords:
                    if len(para) < 200 and re.search(keyword, para_lower[:100]):
                        if current_section:
                            sections[current_section] = '\n\n'.join(current_content)
                        current_section = section_name
                        current_content = []
                        section_found = True
                        break
                if section_found:
                    break

            if current_section:
                current_content.append(para)
            elif not sections:
                current_section = 'introduction'
                current_content.append(para)

        if current_section:
            sections[current_section] = '\n\n'.join(current_content)

        if not sections:
            sections['full_text'] = text

        return sections
