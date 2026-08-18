from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.models import Chat, Document, Message, User
from app.db.session import get_session
from app.dependencies import get_rag_service
from app.generation.rag_service import RagService
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    rag_service: RagService = Depends(get_rag_service),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Retrieval is always scoped to a single document — searching across a
    # user's whole library on every message doesn't scale, so the client
    # must pin one and we enforce that here rather than trust the frontend.
    document_id = (request.filters or {}).get("document_id")
    if not document_id:
        raise HTTPException(status_code=400, detail="Select a document before asking a question.")

    document = await session.get(Document, document_id)
    if document is None or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    if request.chat_id is not None:
        chat_obj = await session.get(Chat, request.chat_id)
        if chat_obj is None or chat_obj.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Chat not found")
    else:
        chat_obj = Chat(user_id=current_user.id, title=request.query[:60])
        session.add(chat_obj)
        await session.flush()

    session.add(Message(chat_id=chat_obj.id, role="user", content=request.query))

    filters = {"document_id": document_id, "user_id": str(current_user.id)}
    result = await rag_service.answer(request.query, filters)

    session.add(
        Message(
            chat_id=chat_obj.id,
            role="assistant",
            content=result.answer,
            sources=result.sources,
        )
    )
    chat_obj.updated_at = datetime.now(timezone.utc)
    await session.commit()

    return ChatResponse(
        chat_id=chat_obj.id,
        answer=result.answer,
        model=result.model,
        cached=result.cached,
        sources=result.sources,
    )
