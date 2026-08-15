"""LLM client for Ollama Cloud (https://ollama.com), using its native chat API
(https://docs.ollama.com/api/chat) with bearer-token auth. Swap providers by
writing another BaseLLM subclass — nothing else in the app depends on this
class directly.
"""

import json
from typing import AsyncIterator, Optional

import httpx

from app.core.interfaces import BaseLLM
from app.core.logging import get_logger

logger = get_logger(__name__)


class OllamaCloudLLM(BaseLLM):
    def __init__(self, api_key: str, base_url: str, model: str, timeout: float = 120.0):
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout

    @property
    def model_name(self) -> str:
        return self._model

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    def _build_messages(self, prompt: str, system: Optional[str]) -> list[dict]:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        return messages

    async def generate(self, prompt: str, system: Optional[str] = None) -> str:
        payload = {
            "model": self._model,
            "messages": self._build_messages(prompt, system),
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                f"{self._base_url}/api/chat", headers=self._headers(), json=payload
            )
            response.raise_for_status()
            data = response.json()
            return data["message"]["content"]

    async def stream(self, prompt: str, system: Optional[str] = None) -> AsyncIterator[str]:
        """Native Ollama streaming is newline-delimited JSON objects (not SSE):
        one `{"message": {"content": "..."}, "done": false}` per line, ending
        with a final object where `"done": true`."""
        payload = {
            "model": self._model,
            "messages": self._build_messages(prompt, system),
            "stream": True,
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            async with client.stream(
                "POST", f"{self._base_url}/api/chat", headers=self._headers(), json=payload
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    chunk = json.loads(line)
                    content = chunk.get("message", {}).get("content", "")
                    if content:
                        yield content
                    if chunk.get("done"):
                        break
