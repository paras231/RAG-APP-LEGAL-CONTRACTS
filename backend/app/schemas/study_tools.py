from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SummaryOut(BaseModel):
    id: UUID
    document_id: UUID
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class KeypointsOut(BaseModel):
    id: UUID
    document_id: UUID
    points: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class FlashcardOut(BaseModel):
    id: UUID
    question: str
    answer: str

    model_config = {"from_attributes": True}


class FlashcardSetRequest(BaseModel):
    count: int = Field(default=10, ge=3, le=30)


class FlashcardSetOut(BaseModel):
    id: UUID
    document_id: UUID
    title: str
    created_at: datetime
    flashcards: list[FlashcardOut] = []

    model_config = {"from_attributes": True}


class AssessmentRequest(BaseModel):
    kind: Literal["quiz", "test"] = "quiz"
    num_questions: int = Field(default=5, ge=3, le=20)
    time_limit_minutes: Optional[int] = Field(default=None, ge=1, le=300)


class AssessmentQuestionOut(BaseModel):
    id: UUID
    question: str
    choices: list[str]

    model_config = {"from_attributes": True}


class AssessmentQuestionReview(AssessmentQuestionOut):
    correct_answer: str
    explanation: str


class AssessmentOut(BaseModel):
    id: UUID
    document_id: UUID
    kind: str
    title: str
    time_limit_minutes: Optional[int]
    created_at: datetime
    questions: list[AssessmentQuestionOut] = []

    model_config = {"from_attributes": True}


class AssessmentSubmitRequest(BaseModel):
    answers: dict[str, str]  # question_id (str) -> chosen answer text


class AssessmentAttemptOut(BaseModel):
    id: UUID
    assessment_id: UUID
    score: int
    total: int
    completed_at: datetime
    questions: list[AssessmentQuestionReview] = []

    model_config = {"from_attributes": True}
