"""PDF text extraction via PyMuPDF (fitz). Text-native PDFs only, no OCR."""

import io

import fitz  # PyMuPDF

from app.ingestion.parsers.base import BaseDocumentParser, ParsedDocument


class PdfParser(BaseDocumentParser):
    def supports(self, filename: str) -> bool:
        return filename.lower().endswith(".pdf")

    def parse(self, file_bytes: bytes, filename: str) -> ParsedDocument:
        pages: list[str] = []
        with fitz.open(stream=io.BytesIO(file_bytes), filetype="pdf") as doc:
            for page in doc:
                pages.append(page.get_text("text"))
            page_count = doc.page_count

        full_text = "\n\n".join(pages)
        return ParsedDocument(
            text=full_text,
            pages=pages,
            metadata={"source_filename": filename, "page_count": page_count, "format": "pdf"},
        )
