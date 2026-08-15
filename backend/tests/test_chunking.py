from app.core.interfaces import ParsedDocument
from app.ingestion.chunking.legal_chunker import LegalStructureChunker

SAMPLE_CONTRACT = """
ARTICLE 1: DEFINITIONS

Section 1.1 "Agreement" means this contract between the parties.
Section 1.2 "Effective Date" means the date first written above.

ARTICLE 2: OBLIGATIONS

Section 2.1 The Contractor shall perform the services described in Exhibit A.
""".strip()


def test_chunker_splits_on_structure():
    chunker = LegalStructureChunker(chunk_token_size=500, chunk_token_overlap=50)
    doc = ParsedDocument(text=SAMPLE_CONTRACT, pages=[SAMPLE_CONTRACT], metadata={})

    chunks = chunker.chunk(doc, document_metadata={"document_id": "doc-1"})

    assert len(chunks) >= 2
    headings = [c.metadata["heading_path"] for c in chunks]
    assert any("Article 1" in h or "ARTICLE 1" in h for h in headings)
    assert all(c.metadata["document_id"] == "doc-1" for c in chunks)


def test_chunker_falls_back_when_no_structure():
    text = "This is a plain paragraph with no legal structure markers at all. " * 5
    chunker = LegalStructureChunker(chunk_token_size=500, chunk_token_overlap=50)
    doc = ParsedDocument(text=text, pages=[text], metadata={})

    chunks = chunker.chunk(doc, document_metadata={"document_id": "doc-2"})

    assert len(chunks) == 1
    assert chunks[0].content.strip() == text.strip()


def test_oversized_section_is_recursively_split():
    long_section = "Section 5.1 " + ("This clause has a lot of repeated text. " * 200)
    chunker = LegalStructureChunker(chunk_token_size=50, chunk_token_overlap=10)
    doc = ParsedDocument(text=long_section, pages=[long_section], metadata={})

    chunks = chunker.chunk(doc, document_metadata={"document_id": "doc-3"})

    assert len(chunks) > 1
    assert all(c.metadata["heading_path"] for c in chunks)
