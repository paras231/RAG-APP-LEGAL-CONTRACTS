"""Orchestrates document ingestion: parse -> chunk -> embed -> persist."""

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.interfaces import BaseChunker, BaseEmbedder, BaseVectorStore, Chunk
from app.core.logging import get_logger
from app.db.models import Document
from app.ingestion.parsers.registry import ParserRegistry

logger = get_logger(__name__)


class IngestionService:
    def __init__(
        self,
        session: AsyncSession,
        parser_registry: ParserRegistry,
        chunker: BaseChunker,
        embedder: BaseEmbedder,
        vector_store: BaseVectorStore,
    ):
        self._session = session
        self._parsers = parser_registry
        self._chunker = chunker
        self._embedder = embedder
        self._vector_store = vector_store

    async def ingest(self, file_bytes: bytes, filename: str, doc_type: str = "unknown") -> str:
        parsed = self._parsers.parse(file_bytes, filename)

        document = Document(
            id=uuid.uuid4(),
            filename=filename,
            doc_type=doc_type,
            uploaded_at=datetime.now(timezone.utc),
            metadata_=parsed.metadata,
        )
        self._session.add(document)
        await self._session.flush()
        document_id = str(document.id)

        document_metadata = {
            **parsed.metadata,
            "document_id": document_id,
            "doc_type": doc_type,
            "filename": filename,
        }
        chunks: list[Chunk] = self._chunker.chunk(parsed, document_metadata)
        if not chunks:
            await self._session.commit()
            logger.warning("No chunks produced for %s", filename)
            return document_id

        embeddings = await self._embedder.embed_texts([c.content for c in chunks])
        for chunk, embedding in zip(chunks, embeddings):
            chunk.document_id = document_id
            chunk.embedding = embedding

        await self._session.commit()
        await self._vector_store.add_chunks(chunks)

        logger.info("Ingested %s: %d chunks", filename, len(chunks))
        return document_id
