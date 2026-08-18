"""FastAPI dependency wiring. This is the single place that decides which
concrete implementation backs each abstract interface — change a model or
swap a provider here without touching routes or services."""

from functools import lru_cache

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.caching.postgres_cache import PostgresAnswerCache, PostgresEmbeddingCache, PostgresQueryCache
from app.config import Settings, get_settings
from app.core.interfaces import BaseEmbedder, BaseLLM
from app.db.session import get_session
from app.embeddings.hf_embedder import HuggingFaceEmbedder
from app.generation.rag_service import RagService
from app.generation.study_tools_service import StudyToolsService
from app.ingestion.chunking.study_chunker import StudyNotesChunker
from app.ingestion.parsers.registry import ParserRegistry
from app.ingestion.pipeline import IngestionService
from app.llm.ollama_llm import OllamaCloudLLM
from app.retrieval.retriever_service import RetrievalService
from app.retrieval.vector_store import PgVectorStore


@lru_cache
def get_llm() -> BaseLLM:
    settings = get_settings()
    return OllamaCloudLLM(
        api_key=settings.ollama_api_key,
        base_url=settings.ollama_base_url,
        model=settings.ollama_model,
    )


def get_embedder_with_cache(
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> HuggingFaceEmbedder:
    """The embedder calls the HF hosted Inference API over HTTP (see
    embeddings/hf_embedder.py), so there is no local model to preload —
    just wire in a request-scoped cache."""
    cache = PostgresEmbeddingCache(session, model_name=settings.embedding_model)
    return HuggingFaceEmbedder(
        model_name=settings.embedding_model,
        api_token=settings.huggingface_token,
        cache=cache,
        dimension=settings.embedding_dim,
    )


def get_vector_store(session: AsyncSession = Depends(get_session)) -> PgVectorStore:
    settings = get_settings()
    return PgVectorStore(session, rrf_k=settings.rrf_k)


def get_retrieval_service(
    embedder: BaseEmbedder = Depends(get_embedder_with_cache),
    vector_store: PgVectorStore = Depends(get_vector_store),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> RetrievalService:
    query_cache = PostgresQueryCache(session, default_ttl=settings.query_cache_ttl)
    return RetrievalService(
        embedder=embedder,
        vector_store=vector_store,
        query_cache=query_cache,
        top_k=settings.retrieval_top_k,
        cache_ttl=settings.query_cache_ttl,
    )


def get_ingestion_service(
    session: AsyncSession = Depends(get_session),
    embedder: BaseEmbedder = Depends(get_embedder_with_cache),
    vector_store: PgVectorStore = Depends(get_vector_store),
    settings: Settings = Depends(get_settings),
) -> IngestionService:
    chunker = StudyNotesChunker(
        chunk_token_size=settings.chunk_token_size,
        chunk_token_overlap=settings.chunk_token_overlap,
    )
    return IngestionService(
        session=session,
        parser_registry=ParserRegistry(),
        chunker=chunker,
        embedder=embedder,
        vector_store=vector_store,
    )


def get_rag_service(
    retrieval_service: RetrievalService = Depends(get_retrieval_service),
    llm: BaseLLM = Depends(get_llm),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> RagService:
    answer_cache = PostgresAnswerCache(session, default_ttl=settings.answer_cache_ttl)
    return RagService(
        retrieval_service=retrieval_service,
        llm=llm,
        answer_cache=answer_cache,
        answer_cache_ttl=settings.answer_cache_ttl,
    )


def get_study_tools_service(
    session: AsyncSession = Depends(get_session),
    llm: BaseLLM = Depends(get_llm),
) -> StudyToolsService:
    return StudyToolsService(session=session, llm=llm)
