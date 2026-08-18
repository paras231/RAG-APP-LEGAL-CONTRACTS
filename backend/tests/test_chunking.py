from app.core.interfaces import ParsedDocument
from app.ingestion.chunking.study_chunker import StudyNotesChunker

SAMPLE_NOTES = """
# Chapter 1: Cell Biology

## Cell Structure
A cell is the basic unit of life. It contains organelles such as the nucleus and mitochondria.

## Cell Division
Mitosis produces two identical daughter cells.

# Chapter 2: Genetics

## DNA
DNA carries genetic information encoded in nucleotide sequences.
""".strip()


def test_chunker_splits_on_headings():
    chunker = StudyNotesChunker(chunk_token_size=500, chunk_token_overlap=50)
    doc = ParsedDocument(text=SAMPLE_NOTES, pages=[SAMPLE_NOTES], metadata={})

    chunks = chunker.chunk(doc, document_metadata={"document_id": "doc-1"})

    assert len(chunks) >= 2
    headings = [c.metadata["heading_path"] for c in chunks]
    assert any("Chapter 1" in h and "Cell Structure" in h for h in headings)
    assert all(c.metadata["document_id"] == "doc-1" for c in chunks)


def test_chunker_falls_back_when_no_structure():
    text = "This is a plain paragraph with no heading markers at all. " * 5
    chunker = StudyNotesChunker(chunk_token_size=500, chunk_token_overlap=50)
    doc = ParsedDocument(text=text, pages=[text], metadata={})

    chunks = chunker.chunk(doc, document_metadata={"document_id": "doc-2"})

    assert len(chunks) == 1
    assert chunks[0].content.strip() == text.strip()


def test_oversized_section_is_recursively_split():
    long_section = "## Big Topic\n" + ("This paragraph has a lot of repeated text. " * 200)
    chunker = StudyNotesChunker(chunk_token_size=50, chunk_token_overlap=10)
    doc = ParsedDocument(text=long_section, pages=[long_section], metadata={})

    chunks = chunker.chunk(doc, document_metadata={"document_id": "doc-3"})

    assert len(chunks) > 1
    assert all(c.metadata["heading_path"] == "Big Topic" for c in chunks)
