"""Deterministic hashing helpers used as cache keys."""

import hashlib
import json
from typing import Any


def hash_text(text: str) -> str:
    return hashlib.sha256(text.strip().lower().encode("utf-8")).hexdigest()


def hash_query(query: str, filters: dict[str, Any] | None = None) -> str:
    payload = {"query": query.strip().lower(), "filters": filters or {}}
    canonical = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def hash_context(query: str, context: str) -> str:
    return hash_text(f"{query}||{context}")
