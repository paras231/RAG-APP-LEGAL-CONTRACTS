"""DOCX text extraction via python-docx."""

import io

import docx

from app.ingestion.parsers.base import BaseDocumentParser, ParsedDocument


class DocxParser(BaseDocumentParser):
    def supports(self, filename: str) -> bool:
        return filename.lower().endswith(".docx")

    def parse(self, file_bytes: bytes, filename: str) -> ParsedDocument:
        document = docx.Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
        full_text = "\n".join(paragraphs)
        return ParsedDocument(
            text=full_text,
            pages=[full_text],
            metadata={"source_filename": filename, "page_count": 1, "format": "docx"},
        )
