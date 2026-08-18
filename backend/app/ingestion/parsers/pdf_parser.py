"""PDF text extraction via PyMuPDF (fitz). Text-native PDFs only, no OCR.

Lines whose font size stands out from the document's median body-text size
(headings/titles in student notes are usually larger or bold) are re-emitted
with a Markdown-style "#" prefix so downstream chunking can detect
structure. Falls back to plain text if font metadata is unavailable.
"""

import io
import statistics

import fitz  # PyMuPDF

from app.ingestion.parsers.base import BaseDocumentParser, ParsedDocument

_BOLD_FLAG = 1 << 4  # PyMuPDF span flag bit for bold text


class PdfParser(BaseDocumentParser):
    def supports(self, filename: str) -> bool:
        return filename.lower().endswith(".pdf")

    def parse(self, file_bytes: bytes, filename: str) -> ParsedDocument:
        pages: list[str] = []
        with fitz.open(stream=io.BytesIO(file_bytes), filetype="pdf") as doc:
            for page in doc:
                pages.append(self._page_text_with_headings(page))
            page_count = doc.page_count

        full_text = "\n\n".join(pages)
        return ParsedDocument(
            text=full_text,
            pages=pages,
            metadata={"source_filename": filename, "page_count": page_count, "format": "pdf"},
        )

    def _page_text_with_headings(self, page) -> str:
        raw_lines = []
        sizes = []
        for block in page.get_text("dict").get("blocks", []):
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                text = "".join(s.get("text", "") for s in spans).strip()
                if not text:
                    continue
                size = max((s.get("size", 0) for s in spans), default=0)
                bold = any(s.get("flags", 0) & _BOLD_FLAG for s in spans)
                raw_lines.append((text, size, bold))
                sizes.append(size)

        if not raw_lines:
            return page.get_text("text")

        body_size = statistics.median(sizes)
        out = []
        for text, size, bold in raw_lines:
            if size >= body_size * 1.3:
                out.append(f"## {text}")
            elif size >= body_size * 1.15 or (bold and size >= body_size):
                out.append(f"### {text}")
            else:
                out.append(text)
        return "\n".join(out)
