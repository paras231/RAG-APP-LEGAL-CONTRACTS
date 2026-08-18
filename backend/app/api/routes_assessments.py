from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user
from app.db.models import Assessment, AssessmentAttempt, User
from app.db.session import get_session
from app.dependencies import get_study_tools_service
from app.generation.study_tools_service import DocumentNotFoundError, StudyToolsService
from app.schemas.study_tools import (
    AssessmentAttemptOut,
    AssessmentOut,
    AssessmentQuestionReview,
    AssessmentRequest,
    AssessmentSubmitRequest,
)

router = APIRouter(tags=["assessments"])


async def _get_owned_assessment(assessment_id: str, session: AsyncSession, user: User) -> Assessment:
    result = await session.execute(
        select(Assessment)
        .options(selectinload(Assessment.questions))
        .where(Assessment.id == assessment_id)
    )
    assessment = result.scalar_one_or_none()
    if assessment is None or assessment.user_id != user.id:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


@router.post("/documents/{document_id}/assessments", response_model=AssessmentOut)
async def create_assessment(
    document_id: str,
    request: AssessmentRequest,
    service: StudyToolsService = Depends(get_study_tools_service),
    current_user: User = Depends(get_current_user),
):
    try:
        return await service.generate_assessment(
            document_id,
            str(current_user.id),
            kind=request.kind,
            num_questions=request.num_questions,
            time_limit_minutes=request.time_limit_minutes,
        )
    except DocumentNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("/documents/{document_id}/assessments", response_model=list[AssessmentOut])
async def list_assessments(
    document_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(Assessment)
        .options(selectinload(Assessment.questions))
        .where(Assessment.document_id == document_id, Assessment.user_id == current_user.id)
        .order_by(Assessment.created_at.desc())
    )
    return result.scalars().all()


@router.get("/assessments/{assessment_id}", response_model=AssessmentOut)
async def get_assessment(
    assessment_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await _get_owned_assessment(assessment_id, session, current_user)


@router.post("/assessments/{assessment_id}/attempts", response_model=AssessmentAttemptOut)
async def submit_attempt(
    assessment_id: str,
    request: AssessmentSubmitRequest,
    session: AsyncSession = Depends(get_session),
    service: StudyToolsService = Depends(get_study_tools_service),
    current_user: User = Depends(get_current_user),
):
    assessment = await _get_owned_assessment(assessment_id, session, current_user)
    attempt = await service.submit_attempt(assessment_id, str(current_user.id), request.answers)

    return AssessmentAttemptOut(
        id=attempt.id,
        assessment_id=attempt.assessment_id,
        score=attempt.score,
        total=attempt.total,
        completed_at=attempt.completed_at,
        questions=[
            AssessmentQuestionReview(
                id=q.id, question=q.question, choices=q.choices,
                correct_answer=q.correct_answer, explanation=q.explanation,
            )
            for q in assessment.questions
        ],
    )


@router.get("/assessments/{assessment_id}/attempts", response_model=list[AssessmentAttemptOut])
async def list_attempts(
    assessment_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    assessment = await _get_owned_assessment(assessment_id, session, current_user)
    result = await session.execute(
        select(AssessmentAttempt)
        .where(AssessmentAttempt.assessment_id == assessment_id, AssessmentAttempt.user_id == current_user.id)
        .order_by(AssessmentAttempt.completed_at.desc())
    )
    attempts = result.scalars().all()
    questions_review = [
        AssessmentQuestionReview(
            id=q.id, question=q.question, choices=q.choices,
            correct_answer=q.correct_answer, explanation=q.explanation,
        )
        for q in assessment.questions
    ]
    return [
        AssessmentAttemptOut(
            id=a.id,
            assessment_id=a.assessment_id,
            score=a.score,
            total=a.total,
            completed_at=a.completed_at,
            questions=questions_review,
        )
        for a in attempts
    ]
