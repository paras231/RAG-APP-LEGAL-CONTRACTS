from typing import Any, Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    query: str
    filters: Optional[dict[str, Any]] = None


class ChatResponse(BaseModel):
    answer: str
    model: str
    cached: bool
    sources: list[dict[str, Any]] = []
