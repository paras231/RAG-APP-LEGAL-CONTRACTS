"""FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_assessments import router as assessments_router
from app.api.routes_auth import router as auth_router
from app.api.routes_chat import router as chat_router
from app.api.routes_chats import router as chats_router
from app.api.routes_documents import router as documents_router
from app.api.routes_study_tools import router as study_tools_router
from app.config import get_settings
from app.core.logging import setup_logging

setup_logging()

app = FastAPI(
    title="StudyMate Backend",
    description="Retrieval-augmented study assistant for student notes.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(chats_router)
app.include_router(chat_router)
app.include_router(study_tools_router)
app.include_router(assessments_router)
