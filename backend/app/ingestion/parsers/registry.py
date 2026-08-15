"""Picks the right parser for a filename. Add a new format by writing a
BaseDocumentParser subclass and registering it here."""

from app.ingestion.parsers.base import BaseDocumentParser, ParsedDocument
from app.ingestion.parsers.docx_parser import DocxParser
from app.ingestion.parsers.pdf_parser import PdfParser


class ParserRegistry:
    def __init__(self, parsers: list[BaseDocumentParser] | None = None):
        self._parsers = parsers or [PdfParser(), DocxParser()]

    def parse(self, file_bytes: bytes, filename: str) -> ParsedDocument:
        for parser in self._parsers:
            if parser.supports(filename):
                return parser.parse(file_bytes, filename)
        raise ValueError(f"No parser registered for file: {filename}")
