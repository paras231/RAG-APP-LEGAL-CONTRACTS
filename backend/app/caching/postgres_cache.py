"""Postgres-backed cache implementations.

Rather than one generic key/value table, each cache uses a purpose-built
table (see app/db/models.py) so the embedding cache can store a typed
`vector` column and the others can store their natural columns. All three
still implement `BaseCache` (get/set) so the storage backend could later
be swapped for Redis without touching callers.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.caching.base import BaseCache
from app.core.logging import get_logger
from app.db.models import AnswerCache, EmbeddingCache, QueryCache

logger = get_logger(__name__)

_DEFAULT_TTL = 3600


def _now() -> datetime:
    return datetime.now(timezone.utc)


class PostgresEmbeddingCache(BaseCache):
    """Caches text -> embedding, keyed by (content_hash, model_name). No TTL: an
    embedding for a given text+model never changes."""

    def __init__(self, session: AsyncSession, model_name: str):
        self._session = session
        self._model_name = model_name

    async def get(self, key: str) -> Optional[list[float]]:
        stmt = select(EmbeddingCache).where(
            EmbeddingCache.content_hash == key, EmbeddingCache.model_name == self._model_name
        )
        row = (await self._session.execute(stmt)).scalar_one_or_none()
        if row is None:
            return None
        return list(row.embedding)

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        stmt = (
            insert(EmbeddingCache)
            .values(content_hash=key, model_name=self._model_name, embedding=value, created_at=_now())
            .on_conflict_do_nothing(index_elements=["content_hash", "model_name"])
        )
        await self._session.execute(stmt)
        await self._session.commit()


class PostgresQueryCache(BaseCache):
    """Caches retrieval results for a normalized (query, filters) key."""

    def __init__(self, session: AsyncSession, default_ttl: int = _DEFAULT_TTL):
        self._session = session
        self._default_ttl = default_ttl

    async def get(self, key: str) -> Optional[dict]:
        stmt = select(QueryCache).where(QueryCache.query_hash == key, QueryCache.expires_at > _now())
        row = (await self._session.execute(stmt)).scalar_one_or_none()
        if row is None:
            return None
        await self._session.execute(
            update(QueryCache).where(QueryCache.query_hash == key).values(hit_count=row.hit_count + 1)
        )
        await self._session.commit()
        return row.result

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds or self._default_ttl
        query_text = value.get("query_text", "")
        filters = value.get("filters", {})
        result = value.get("result", value)
        stmt = (
            insert(QueryCache)
            .values(
                query_hash=key,
                query_text=query_text,
                filters=filters,
                result=result,
                created_at=_now(),
                expires_at=_now() + timedelta(seconds=ttl),
                hit_count=0,
            )
            .on_conflict_do_update(
                index_elements=["query_hash"],
                set_={"result": result, "expires_at": _now() + timedelta(seconds=ttl)},
            )
        )
        await self._session.execute(stmt)
        await self._session.commit()

    async def purge_expired(self) -> int:
        result = await self._session.execute(delete(QueryCache).where(QueryCache.expires_at <= _now()))
        await self._session.commit()
        return result.rowcount or 0


class PostgresAnswerCache(BaseCache):
    """Caches final LLM answers for a (query, context) key to save tokens."""

    def __init__(self, session: AsyncSession, default_ttl: int = _DEFAULT_TTL):
        self._session = session
        self._default_ttl = default_ttl

    async def get(self, key: str) -> Optional[str]:
        stmt = select(AnswerCache).where(AnswerCache.cache_key == key, AnswerCache.expires_at > _now())
        row = (await self._session.execute(stmt)).scalar_one_or_none()
        if row is None:
            return None
        await self._session.execute(
            update(AnswerCache).where(AnswerCache.cache_key == key).values(hit_count=row.hit_count + 1)
        )
        await self._session.commit()
        return row.answer

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds or self._default_ttl
        query_text = value.get("query_text", "")
        context_hash = value.get("context_hash", "")
        answer = value.get("answer", "")
        stmt = (
            insert(AnswerCache)
            .values(
                cache_key=key,
                query_text=query_text,
                context_hash=context_hash,
                answer=answer,
                created_at=_now(),
                expires_at=_now() + timedelta(seconds=ttl),
                hit_count=0,
            )
            .on_conflict_do_update(
                index_elements=["cache_key"],
                set_={"answer": answer, "expires_at": _now() + timedelta(seconds=ttl)},
            )
        )
        await self._session.execute(stmt)
        await self._session.commit()

    async def purge_expired(self) -> int:
        result = await self._session.execute(delete(AnswerCache).where(AnswerCache.expires_at <= _now()))
        await self._session.commit()
        return result.rowcount or 0
