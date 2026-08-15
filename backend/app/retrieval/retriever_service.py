"""Query-time retrieval orchestration: embed query, check cache, hybrid search."""

from dataclasses import asdict
from typing import Any, Optional

from app.caching.base import BaseCache
from app.core.interfaces import BaseEmbedder, BaseVectorStore, RetrievedChunk
from app.core.logging import get_logger
from app.utils.hashing import hash_query

logger = get_logger(__name__)


class RetrievalService:
    def __init__(
        self,
        embedder: BaseEmbedder,
        vector_store: BaseVectorStore,
        query_cache: Optional[BaseCache] = None,
        top_k: int = 8,
        cache_ttl: int = 3600,
    ):
        self._embedder = embedder
        self._vector_store = vector_store
        self._query_cache = query_cache
        self._top_k = top_k
        self._cache_ttl = cache_ttl

    async def retrieve(
        self, query: str, filters: Optional[dict[str, Any]] = None
    ) -> list[RetrievedChunk]:
        cache_key = hash_query(query, filters)

        if self._query_cache is not None:
            cached = await self._query_cache.get(cache_key)
            if cached is not None:
                logger.info("query_cache hit for query=%r", query)
                return [RetrievedChunk(**item) for item in cached]

        query_embedding = await self._embedder.embed_query(query)
        results = await self._vector_store.hybrid_search(
            query_text=query,
            query_embedding=query_embedding,
            top_k=self._top_k,
            filters=filters,
        )

        if self._query_cache is not None:
            await self._query_cache.set(
                cache_key,
                {
                    "query_text": query,
                    "filters": filters or {},
                    "result": [asdict(r) for r in results],
                },
                ttl_seconds=self._cache_ttl,
            )

        return results
