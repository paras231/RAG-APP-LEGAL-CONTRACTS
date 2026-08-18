from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.models import Document, User
from app.db.session import get_session
from app.dependencies import get_ingestion_service, get_vector_store
from app.ingestion.pipeline import IngestionService
from app.retrieval.vector_store import PgVectorStore
from app.schemas.document import DocumentSummary, DocumentUploadResponse

router = APIRouter(prefix="/documents", tags=["documents"])

_SUPPORTED_EXTENSIONS = (".pdf", ".docx")


@router.post("", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = "unknown",
    ingestion_service: IngestionService = Depends(get_ingestion_service),
    current_user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(_SUPPORTED_EXTENSIONS):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.filename}")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    document_id = await ingestion_service.ingest(
        file_bytes, file.filename, user_id=str(current_user.id), doc_type=doc_type
    )
    return DocumentUploadResponse(document_id=document_id, filename=file.filename)


@router.get("", response_model=list[DocumentSummary])
async def list_documents(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.uploaded_at.desc())
    )
    return result.scalars().all()


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: str,
    session: AsyncSession = Depends(get_session),
    vector_store: PgVectorStore = Depends(get_vector_store),
    current_user: User = Depends(get_current_user),
):
    document = await session.get(Document, document_id)
    if document is None or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    await vector_store.delete_document(document_id)
