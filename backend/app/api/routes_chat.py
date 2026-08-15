from fastapi import APIRouter, Depends

from app.dependencies import get_rag_service
from app.generation.rag_service import RagService
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    rag_service: RagService = Depends(get_rag_service),
):
    result = await rag_service.answer(request.query, request.filters)
    return ChatResponse(
        answer=result.answer,
        model=result.model,
        cached=result.cached,
        sources=result.sources,
    )
