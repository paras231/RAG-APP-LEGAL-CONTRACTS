"""Abstract base classes defining swappable seams for external dependencies.

Every concrete implementation (a specific LLM provider, embedding model,
vector store, parser, chunker, or cache backend) implements one of these
interfaces. Application code depends only on these ABCs, never on a
concrete class directly, so any implementation can be replaced without
touching call sites.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Optional


@dataclass
class Chunk:
    """A single unit of retrievable text plus its provenance metadata."""

    content: str
    metadata: dict[str, Any] = field(default_factory=dict)
    chunk_index: int = 0
    document_id: Optional[str] = None
    embedding: Optional[list[float]] = None


@dataclass
class ParsedDocument:
    """Raw text extracted from a source file, split by page/section if known."""

    text: str
    pages: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class RetrievedChunk:
    """A chunk returned by retrieval, with its relevance score."""

    chunk_id: str
    content: str
    metadata: dict[str, Any]
    score: float


@dataclass
class GenerationResult:
    answer: str
    model: str
    cached: bool = False
    sources: list[dict[str, Any]] = field(default_factory=list)


class BaseEmbedder(ABC):
    """Turns text into dense vectors. Swap HF/OpenAI/Cohere by subclassing."""

    @abstractmethod
    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of documents (indexing-time)."""

    @abstractmethod
    async def embed_query(self, text: str) -> list[float]:
        """Embed a single query string (query-time)."""

    @property
    @abstractmethod
    def dimension(self) -> int:
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        ...


class BaseLLM(ABC):
    """Chat/completion model interface. Swap Ollama/OpenAI/Anthropic by subclassing."""

    @abstractmethod
    async def generate(self, prompt: str, system: Optional[str] = None) -> str:
        ...

    @abstractmethod
    async def stream(self, prompt: str, system: Optional[str] = None) -> AsyncIterator[str]:
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        ...


class BaseDocumentParser(ABC):
    """Extracts raw text from a specific file format."""

    @abstractmethod
    def supports(self, filename: str) -> bool:
        ...

    @abstractmethod
    def parse(self, file_bytes: bytes, filename: str) -> ParsedDocument:
        ...


class BaseChunker(ABC):
    """Splits parsed document text into retrievable chunks."""

    @abstractmethod
    def chunk(self, document: ParsedDocument, document_metadata: dict[str, Any]) -> list[Chunk]:
        ...


class BaseVectorStore(ABC):
    """Persists chunk embeddings and performs similarity/hybrid search."""

    @abstractmethod
    async def add_chunks(self, chunks: list[Chunk]) -> None:
        ...

    @abstractmethod
    async def hybrid_search(
        self,
        query_text: str,
        query_embedding: list[float],
        top_k: int,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[RetrievedChunk]:
        ...

    @abstractmethod
    async def delete_document(self, document_id: str) -> None:
        ...


class BaseCache(ABC):
    """Generic key -> JSON-serializable value cache with TTL."""

    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        ...

    @abstractmethod
    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        ...
