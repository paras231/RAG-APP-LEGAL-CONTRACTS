from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user
from app.db.models import FlashcardSet, Keypoints, Summary, User
from app.db.session import get_session
from app.dependencies import get_study_tools_service
from app.generation.study_tools_service import DocumentNotFoundError, StudyToolsService
from app.schemas.study_tools import (
    FlashcardSetOut,
    FlashcardSetRequest,
    KeypointsOut,
    SummaryOut,
)

router = APIRouter(tags=["study-tools"])


@router.post("/documents/{document_id}/summary", response_model=SummaryOut)
async def create_summary(
    document_id: str,
    service: StudyToolsService = Depends(get_study_tools_service),
    current_user: User = Depends(get_current_user),
):
    try:
        return await service.generate_summary(document_id, str(current_user.id))
    except DocumentNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("/documents/{document_id}/summary", response_model=list[SummaryOut])
async def list_summaries(
    document_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Summary)
        .where(Summary.document_id == document_id, Summary.user_id == current_user.id)
        .order_by(Summary.created_at.desc())
    )
    return result.scalars().all()


@router.post("/documents/{document_id}/keypoints", response_model=KeypointsOut)
async def create_keypoints(
    document_id: str,
    service: StudyToolsService = Depends(get_study_tools_service),
    current_user: User = Depends(get_current_user),
):
    try:
        return await service.generate_keypoints(document_id, str(current_user.id))
    except DocumentNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("/documents/{document_id}/keypoints", response_model=list[KeypointsOut])
async def list_keypoints(
    document_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Keypoints)
        .where(Keypoints.document_id == document_id, Keypoints.user_id == current_user.id)
        .order_by(Keypoints.created_at.desc())
    )
    return result.scalars().all()


@router.post("/documents/{document_id}/flashcards", response_model=FlashcardSetOut)
async def create_flashcards(
    document_id: str,
    request: FlashcardSetRequest,
    service: StudyToolsService = Depends(get_study_tools_service),
    current_user: User = Depends(get_current_user),
):
    try:
        return await service.generate_flashcards(document_id, str(current_user.id), count=request.count)
    except DocumentNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("/documents/{document_id}/flashcards", response_model=list[FlashcardSetOut])
async def list_flashcard_sets(
    document_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(FlashcardSet)
        .options(selectinload(FlashcardSet.flashcards))
        .where(FlashcardSet.document_id == document_id, FlashcardSet.user_id == current_user.id)
        .order_by(FlashcardSet.created_at.desc())
    )
    return result.scalars().all()


@router.get("/flashcards/{set_id}", response_model=FlashcardSetOut)
async def get_flashcard_set(
    set_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(FlashcardSet).options(selectinload(FlashcardSet.flashcards)).where(FlashcardSet.id == set_id)
    )
    flashcard_set = result.scalar_one_or_none()
    if flashcard_set is None or flashcard_set.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Flashcard set not found")
    return flashcard_set
