"""Postgres/pgvector-backed vector store with hybrid (vector + full-text) search."""

import uuid
from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.interfaces import BaseVectorStore, Chunk, RetrievedChunk
from app.core.logging import get_logger
from app.db.models import Chunk as ChunkModel
from app.db.models import Document

logger = get_logger(__name__)


def _build_filter_clause(filters: Optional[dict[str, Any]], param_prefix: str = "f") -> tuple[str, dict]:
    """Builds a SQL WHERE fragment matching JSONB metadata fields, e.g.
    {"doc_type": "contract"} -> "chunks.metadata->>:f_key_0 = :f_val_0". Both
    the key and value are bound parameters (never string-interpolated) since
    filters come from user-supplied request data."""
    if not filters:
        return "", {}
    clauses = []
    params: dict[str, Any] = {}
    for i, (key, value) in enumerate(filters.items()):
        key_param, val_param = f"{param_prefix}_key_{i}", f"{param_prefix}_val_{i}"
        clauses.append(f"chunks.metadata->>(:{key_param}) = :{val_param}")
        params[key_param] = key
        params[val_param] = str(value)
    return " AND " + " AND ".join(clauses), params


class PgVectorStore(BaseVectorStore):
    def __init__(self, session: AsyncSession, rrf_k: int = 60):
        self._session = session
        self._rrf_k = rrf_k

    async def add_chunks(self, chunks: list[Chunk]) -> None:
        for chunk in chunks:
            model = ChunkModel(
                id=uuid.uuid4(),
                document_id=uuid.UUID(chunk.document_id),
                content=chunk.content,
                embedding=chunk.embedding,
                chunk_index=chunk.chunk_index,
                metadata_=chunk.metadata,
            )
            self._session.add(model)
        await self._session.commit()

    async def delete_document(self, document_id: str) -> None:
        doc = await self._session.get(Document, uuid.UUID(document_id))
        if doc is not None:
            await self._session.delete(doc)
            await self._session.commit()

    async def hybrid_search(
        self,
        query_text: str,
        query_embedding: list[float],
        top_k: int,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[RetrievedChunk]:
        """Runs vector similarity and full-text search independently, fuses the
        two ranked lists with Reciprocal Rank Fusion (RRF), and returns the
        top_k fused results. Fetches 4x candidates from each branch so fusion
        has enough signal before truncating to top_k."""
        candidate_k = max(top_k * 4, 20)
        filter_clause, filter_params = _build_filter_clause(filters)

        vector_sql = text(
            f"""
            SELECT chunks.id, chunks.content, chunks.metadata,
                   1 - (chunks.embedding <=> (:embedding)::vector) AS score
            FROM chunks
            WHERE TRUE {filter_clause}
            ORDER BY chunks.embedding <=> (:embedding)::vector
            LIMIT :limit
            """
        )
        fts_sql = text(
            f"""
            SELECT chunks.id, chunks.content, chunks.metadata,
                   ts_rank_cd(chunks.tsv, plainto_tsquery('english', :query)) AS score
            FROM chunks
            WHERE chunks.tsv @@ plainto_tsquery('english', :query) {filter_clause}
            ORDER BY score DESC
            LIMIT :limit
            """
        )

        vector_rows = (
            await self._session.execute(
                vector_sql,
                {"embedding": str(query_embedding), "limit": candidate_k, **filter_params},
            )
        ).mappings().all()
        fts_rows = (
            await self._session.execute(
                fts_sql,
                {"query": query_text, "limit": candidate_k, **filter_params},
            )
        ).mappings().all()

        fused = self._reciprocal_rank_fusion(vector_rows, fts_rows)
        return fused[:top_k]

    def _reciprocal_rank_fusion(self, vector_rows: list, fts_rows: list) -> list[RetrievedChunk]:
        scores: dict[str, float] = {}
        payload: dict[str, dict] = {}

        for rank, row in enumerate(vector_rows, start=1):
            key = str(row["id"])
            scores[key] = scores.get(key, 0.0) + 1.0 / (self._rrf_k + rank)
            payload[key] = row

        for rank, row in enumerate(fts_rows, start=1):
            key = str(row["id"])
            scores[key] = scores.get(key, 0.0) + 1.0 / (self._rrf_k + rank)
            payload.setdefault(key, row)

        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
        return [
            RetrievedChunk(
                chunk_id=key,
                content=payload[key]["content"],
                metadata=payload[key]["metadata"],
                score=score,
            )
            for key, score in ranked
        ]
