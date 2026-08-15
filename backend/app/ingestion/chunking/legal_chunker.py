"""Structure-aware chunker for legal documents.

Strategy: first split on legal structural markers (ARTICLE / SECTION /
numbered clauses) so each chunk stays within one clause's semantic
boundary and carries a heading path (e.g. "Article 3 > Section 3.2") in
its metadata for citation. Any resulting section that still exceeds the
token budget is recursively split with overlap so no chunk blows past
the embedding model's context window.
"""

import re
from dataclasses import dataclass

import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.ingestion.chunking.base import BaseChunker, Chunk, ParsedDocument

# Matches top-level and second-level legal structure headings at the start of a line.
_STRUCTURE_PATTERN = re.compile(
    r"^\s*("
    r"ARTICLE\s+[IVXLCDM\d]+[.:]?.*|"
    r"SECTION\s+\d+(\.\d+)*[.:]?.*|"
    r"Section\s+\d+(\.\d+)*[.:]?.*|"
    r"Clause\s+\d+(\.\d+)*[.:]?.*|"
    r"\d+\.\d+(\.\d+)*\s+.*|"
    r"\(\w{1,4}\)\s+.*"
    r")\s*$",
    re.MULTILINE,
)

_encoding = tiktoken.get_encoding("cl100k_base")


def _token_len(text: str) -> int:
    return len(_encoding.encode(text))


@dataclass
class _Section:
    heading: str
    text: str


class LegalStructureChunker(BaseChunker):
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
        matches = list(_STRUCTURE_PATTERN.finditer(text))
        if not matches:
            return [_Section(heading="", text=text)]

        sections: list[_Section] = []
        if matches[0].start() > 0:
            preamble = text[: matches[0].start()].strip()
            if preamble:
                sections.append(_Section(heading="Preamble", text=preamble))

        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            section_text = text[start:end].strip()
            heading = match.group(1).strip()
            if section_text:
                sections.append(_Section(heading=heading, text=section_text))

        return sections

    def _build_heading_path(self, sections: list[_Section], index: int) -> str:
        """Best-effort heading path: current section's own heading, prefixed by
        the most recent ARTICLE-level heading if this section is a subordinate
        Section/Clause."""
        heading = sections[index].heading
        if heading.upper().startswith("ARTICLE") or not heading:
            return heading
        for j in range(index - 1, -1, -1):
            if sections[j].heading.upper().startswith("ARTICLE"):
                return f"{sections[j].heading} > {heading}"
        return heading

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
