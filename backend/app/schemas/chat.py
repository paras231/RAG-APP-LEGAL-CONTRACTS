from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    chat_id: Optional[UUID] = None
    filters: Optional[dict[str, Any]] = None


class ChatResponse(BaseModel):
    chat_id: UUID
    answer: str
    model: str
    cached: bool
    sources: list[dict[str, Any]] = []


class MessageOut(BaseModel):
    id: UUID
    role: str
    content: str
    sources: list[dict[str, Any]] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSummary(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatDetail(ChatSummary):
    messages: list[MessageOut] = []


class ChatRenameRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
