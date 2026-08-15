from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    chunk_count: int | None = None


class DocumentSummary(BaseModel):
    id: UUID
    filename: str
    doc_type: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}
