"""Hugging Face Inference API embedder, with a Postgres cache in front.

Calls the hosted Inference API over HTTP instead of loading the model
locally, so the API image never needs torch/transformers installed.
Trade-off: adds network latency and an external dependency at embed time,
mitigated by the embedding cache (app/caching) so any given text is only
ever sent to the API once per model.
"""

import asyncio
from typing import Optional

import httpx
import numpy as np

from app.caching.base import BaseCache
from app.core.interfaces import BaseEmbedder
from app.core.logging import get_logger
from app.utils.hashing import hash_text

logger = get_logger(__name__)

# bge models are trained to expect this instruction prefix on the *query* side
# only; document/passage embeddings are computed without it.
_BGE_QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "

_INFERENCE_API_BASE = "https://router.huggingface.co/hf-inference/models"


def _mean_pool(token_embeddings: list) -> list[float]:
    """Some feature-extraction responses return per-token vectors rather than
    a single pooled sentence vector; mean-pool over the token axis in that case."""
    arr = np.array(token_embeddings)
    if arr.ndim == 2:
        arr = arr.mean(axis=0)
    return arr.tolist()


def _normalize(vector: list[float]) -> list[float]:
    arr = np.array(vector)
    norm = np.linalg.norm(arr)
    if norm == 0:
        return vector
    return (arr / norm).tolist()


class HuggingFaceEmbedder(BaseEmbedder):
    """Embedder backed by the HF hosted Inference API. Swap providers entirely
    by implementing another BaseEmbedder subclass (e.g. a local ONNX/fastembed
    version, or OpenAI embeddings)."""

    def __init__(
        self,
        model_name: str,
        api_token: str,
        cache: Optional[BaseCache] = None,
        dimension: int = 384,
        timeout: float = 60.0,
    ):
        self._model_name = model_name
        self._api_token = api_token
        self._cache = cache
        self._dimension = dimension
        self._timeout = timeout

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def model_name(self) -> str:
        return self._model_name

    async def _call_api(self, texts: list[str]) -> list[list[float]]:
        url = f"{_INFERENCE_API_BASE}/{self._model_name}/pipeline/feature-extraction"
        headers = {"Authorization": f"Bearer {self._api_token}"}
        payload = {"inputs": texts, "options": {"wait_for_model": True}}

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        vectors = [_mean_pool(item) for item in data]
        return [_normalize(v) for v in vectors]

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        if self._cache is None:
            return await self._call_api(texts)

        keys = [hash_text(t) for t in texts]
        cached = await asyncio.gather(*(self._cache.get(k) for k in keys))

        missing_indices = [i for i, c in enumerate(cached) if c is None]
        if missing_indices:
            missing_texts = [texts[i] for i in missing_indices]
            fresh = await self._call_api(missing_texts)
            for idx, vec in zip(missing_indices, fresh):
                cached[idx] = vec
                await self._cache.set(keys[idx], vec)

        return cached

    async def embed_query(self, text: str) -> list[float]:
        prefixed = f"{_BGE_QUERY_INSTRUCTION}{text}"
        results = await self._call_api([prefixed])
        return results[0]
