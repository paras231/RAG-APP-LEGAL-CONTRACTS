"""Structure-aware chunker for student notes.

Strategy: split on Markdown-style heading markers ("#".."######") that the
parsers (docx_parser.py, pdf_parser.py) emit for detected headings/styles,
so each chunk carries a heading path (e.g. "Chapter 2 > Photosynthesis") in
its metadata for citation. Any resulting section that still exceeds the
token budget is recursively split with overlap, same as the previous legal
chunker. Notes with no detected headings fall through to a single
"section" that gets token-budget split directly.
"""

import re
from dataclasses import dataclass

import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.ingestion.chunking.base import BaseChunker, Chunk, ParsedDocument

_HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.*)$", re.MULTILINE)

_encoding = tiktoken.get_encoding("cl100k_base")


def _token_len(text: str) -> int:
    return len(_encoding.encode(text))


@dataclass
class _Section:
    heading: str
    level: int
    text: str


class StudyNotesChunker(BaseChunker):
    def __init__(self, chunk_token_size: int = 500, chunk_token_overlap: int = 50):
        self._token_size = chunk_token_size
        self._token_overlap = chunk_token_overlap
        self._fallback_splitter = RecursiveCharacterTextSplitter(
            separators=["\n\n", "\n", ". ", "; ", " "],
            chunk_size=chunk_token_size,
            chunk_overlap=chunk_token_overlap,
            length_function=_token_len,
        )

    def _split_into_sections(self, text: str) -> list[_Section]:
        matches = list(_HEADING_PATTERN.finditer(text))
        if not matches:
            return [_Section(heading="", level=0, text=text)]

        sections: list[_Section] = []
        if matches[0].start() > 0:
            preamble = text[: matches[0].start()].strip()
            if preamble:
                sections.append(_Section(heading="", level=0, text=preamble))

        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            body_start = match.end()
            section_text = text[body_start:end].strip()
            heading = match.group(2).strip()
            level = len(match.group(1))
            content = f"{heading}\n{section_text}".strip() if section_text else heading
            sections.append(_Section(heading=heading, level=level, text=content))

        return sections

    def _build_heading_path(self, sections: list[_Section], index: int) -> str:
        """Heading path: current section's heading prefixed by the nearest
        preceding heading of a shallower level (e.g. an H2 under an H1)."""
        current = sections[index]
        if not current.heading:
            return ""
        path = [current.heading]
        level = current.level
        for j in range(index - 1, -1, -1):
            candidate = sections[j]
            if not candidate.heading:
                continue
            if candidate.level < level:
                path.insert(0, candidate.heading)
                level = candidate.level
            if level <= 1:
                break
        return " > ".join(path)

    def chunk(self, document: ParsedDocument, document_metadata: dict) -> list[Chunk]:
        sections = self._split_into_sections(document.text)
        chunks: list[Chunk] = []
        chunk_index = 0

        for i, section in enumerate(sections):
            heading_path = self._build_heading_path(sections, i)
            base_metadata = {
                **document_metadata,
                "heading_path": heading_path,
            }

            if _token_len(section.text) <= self._token_size:
                chunks.append(
                    Chunk(content=section.text, metadata=dict(base_metadata), chunk_index=chunk_index)
                )
                chunk_index += 1
                continue

            for piece in self._fallback_splitter.split_text(section.text):
                chunks.append(
                    Chunk(content=piece, metadata=dict(base_metadata), chunk_index=chunk_index)
                )
                chunk_index += 1

        return chunks
