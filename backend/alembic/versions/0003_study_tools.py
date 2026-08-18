"""summaries, keypoints, flashcards, assessments

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-18
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "summaries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_summaries_document_id", "summaries", ["document_id"])

    op.create_table(
        "keypoints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("points", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_keypoints_document_id", "keypoints", ["document_id"])

    op.create_table(
        "flashcard_sets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(), nullable=False, server_default="Flashcards"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_flashcard_sets_document_id", "flashcard_sets", ["document_id"])

    op.create_table(
        "flashcards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("set_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("flashcard_sets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_flashcards_set_id", "flashcards", ["set_id"])

    op.create_table(
        "assessments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(), nullable=False, server_default="quiz"),
        sa.Column("title", sa.String(), nullable=False, server_default="Assessment"),
        sa.Column("time_limit_minutes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_assessments_document_id", "assessments", ["document_id"])

    op.create_table(
        "assessment_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("assessment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("choices", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("correct_answer", sa.String(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False, server_default=""),
    )
    op.create_index("ix_assessment_questions_assessment_id", "assessment_questions", ["assessment_id"])

    op.create_table(
        "assessment_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("assessment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answers", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_assessment_attempts_assessment_id", "assessment_attempts", ["assessment_id"])


def downgrade() -> None:
    op.drop_index("ix_assessment_attempts_assessment_id", table_name="assessment_attempts")
    op.drop_table("assessment_attempts")
    op.drop_index("ix_assessment_questions_assessment_id", table_name="assessment_questions")
    op.drop_table("assessment_questions")
    op.drop_index("ix_assessments_document_id", table_name="assessments")
    op.drop_table("assessments")
    op.drop_index("ix_flashcards_set_id", table_name="flashcards")
    op.drop_table("flashcards")
    op.drop_index("ix_flashcard_sets_document_id", table_name="flashcard_sets")
    op.drop_table("flashcard_sets")
    op.drop_index("ix_keypoints_document_id", table_name="keypoints")
    op.drop_table("keypoints")
    op.drop_index("ix_summaries_document_id", table_name="summaries")
    op.drop_table("summaries")
