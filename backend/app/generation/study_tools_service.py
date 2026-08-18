"""LLM-backed generation of study aids (summaries, keypoints, flashcards,
quizzes/tests) from a single document's chunks, plus assessment grading.

Each generator fetches the document's chunks directly (ordered by
chunk_index, capped by a token budget), asks the LLM for structured JSON,
and persists the result. JSON parsing gets one retry with a stricter
"return ONLY JSON" nudge before giving up.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.logging import get_logger
from app.db.models import (
    Assessment,
    AssessmentAttempt,
    AssessmentQuestion,
    Chunk,
    Document,
    Flashcard,
    FlashcardSet,
    Keypoints,
    Summary,
)
from app.llm.base import BaseLLM

logger = get_logger(__name__)

_MAX_CONTEXT_TOKENS_CHARS = 12000  # rough char budget standing in for a token budget


class DocumentNotFoundError(Exception):
    pass


class GenerationParseError(Exception):
    pass


async def _load_document_text(session: AsyncSession, document_id: str, user_id: str) -> str:
    document = await session.get(Document, document_id)
    if document is None or str(document.user_id) != str(user_id):
        raise DocumentNotFoundError(document_id)

    result = await session.execute(
        select(Chunk).where(Chunk.document_id == document_id).order_by(Chunk.chunk_index)
    )
    chunks = result.scalars().all()
    text = "\n\n".join(c.content for c in chunks)
    return text[:_MAX_CONTEXT_TOKENS_CHARS]


async def _generate_json(llm: BaseLLM, system: str, prompt: str) -> Any:
    raw = await llm.generate(prompt, system=system)
    try:
        return _parse_json(raw)
    except GenerationParseError:
        stricter_prompt = (
            f"{prompt}\n\nYour previous response could not be parsed as JSON. "
            "Return ONLY valid JSON, no prose, no markdown code fences."
        )
        raw = await llm.generate(stricter_prompt, system=system)
        return _parse_json(raw)


def _parse_json(raw: str) -> Any:
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise GenerationParseError(str(exc)) from exc


class StudyToolsService:
    def __init__(self, session: AsyncSession, llm: BaseLLM):
        self._session = session
        self._llm = llm

    async def generate_summary(self, document_id: str, user_id: str) -> Summary:
        text = await _load_document_text(self._session, document_id, user_id)
        content = await self._llm.generate(
            f"Notes:\n{text}\n\nWrite a clear, well-organized summary of these notes "
            "for a student studying for an exam. Use short paragraphs.",
            system="You are a study assistant that writes concise, accurate summaries of student notes.",
        )
        summary = Summary(user_id=user_id, document_id=document_id, content=content.strip())
        self._session.add(summary)
        await self._session.commit()
        await self._session.refresh(summary)
        return summary

    async def generate_keypoints(self, document_id: str, user_id: str) -> Keypoints:
        text = await _load_document_text(self._session, document_id, user_id)
        data = await _generate_json(
            self._llm,
            system=(
                "You are a study assistant. Respond with ONLY a JSON array of strings, "
                'each a single key point, e.g. ["Point one.", "Point two."]. No prose.'
            ),
            prompt=f"Notes:\n{text}\n\nExtract the key points a student must remember.",
        )
        points = [str(p) for p in data] if isinstance(data, list) else []
        keypoints = Keypoints(user_id=user_id, document_id=document_id, points=points)
        self._session.add(keypoints)
        await self._session.commit()
        await self._session.refresh(keypoints)
        return keypoints

    async def generate_flashcards(self, document_id: str, user_id: str, count: int = 10) -> FlashcardSet:
        text = await _load_document_text(self._session, document_id, user_id)
        data = await _generate_json(
            self._llm,
            system=(
                "You are a study assistant. Respond with ONLY a JSON array of objects "
                '{"question": "...", "answer": "..."}. No prose.'
            ),
            prompt=f"Notes:\n{text}\n\nCreate {count} flashcards (question/answer pairs) "
            "covering the most important concepts.",
        )
        cards = data if isinstance(data, list) else []

        flashcard_set = FlashcardSet(user_id=user_id, document_id=document_id, title="Flashcards")
        self._session.add(flashcard_set)
        await self._session.flush()

        for card in cards:
            if not isinstance(card, dict) or "question" not in card or "answer" not in card:
                continue
            self._session.add(
                Flashcard(
                    set_id=flashcard_set.id,
                    question=str(card["question"]),
                    answer=str(card["answer"]),
                )
            )

        await self._session.commit()

        # A plain refresh() only reloads column attributes, not relationships —
        # FastAPI's response model needs `.flashcards` eagerly loaded, or
        # serializing it later triggers a lazy load outside the async context.
        result = await self._session.execute(
            select(FlashcardSet)
            .options(selectinload(FlashcardSet.flashcards))
            .where(FlashcardSet.id == flashcard_set.id)
        )
        return result.scalar_one()

    async def generate_assessment(
        self,
        document_id: str,
        user_id: str,
        kind: str = "quiz",
        num_questions: int = 5,
        time_limit_minutes: Optional[int] = None,
    ) -> Assessment:
        text = await _load_document_text(self._session, document_id, user_id)
        data = await _generate_json(
            self._llm,
            system=(
                "You are a study assistant. Respond with ONLY a JSON array of objects: "
                '{"question": "...", "choices": ["A", "B", "C", "D"], '
                '"correct_answer": "A", "explanation": "..."}. correct_answer must be '
                "one of the choices verbatim. No prose."
            ),
            prompt=f"Notes:\n{text}\n\nCreate {num_questions} multiple-choice questions "
            f"testing understanding of these notes.",
        )
        questions = data if isinstance(data, list) else []

        title = "Test" if kind == "test" else "Quiz"
        assessment = Assessment(
            user_id=user_id,
            document_id=document_id,
            kind=kind,
            title=title,
            time_limit_minutes=time_limit_minutes,
        )
        self._session.add(assessment)
        await self._session.flush()

        for q in questions:
            if not isinstance(q, dict) or "question" not in q or "correct_answer" not in q:
                continue
            self._session.add(
                AssessmentQuestion(
                    assessment_id=assessment.id,
                    question=str(q["question"]),
                    choices=[str(c) for c in q.get("choices", [])],
                    correct_answer=str(q["correct_answer"]),
                    explanation=str(q.get("explanation", "")),
                )
            )

        await self._session.commit()

        result = await self._session.execute(
            select(Assessment)
            .options(selectinload(Assessment.questions))
            .where(Assessment.id == assessment.id)
        )
        return result.scalar_one()

    async def submit_attempt(
        self, assessment_id: str, user_id: str, answers: dict[str, str]
    ) -> AssessmentAttempt:
        result = await self._session.execute(
            select(AssessmentQuestion).where(AssessmentQuestion.assessment_id == assessment_id)
        )
        questions = result.scalars().all()

        score = sum(
            1 for q in questions if answers.get(str(q.id), "").strip() == q.correct_answer.strip()
        )
        now = datetime.now(timezone.utc)
        attempt = AssessmentAttempt(
            assessment_id=assessment_id,
            user_id=user_id,
            answers=answers,
            score=score,
            total=len(questions),
            started_at=now,
            completed_at=now,
        )
        self._session.add(attempt)
        await self._session.commit()
        await self._session.refresh(attempt)
        return attempt
