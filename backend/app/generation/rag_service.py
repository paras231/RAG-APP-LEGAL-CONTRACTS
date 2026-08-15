"""LangGraph orchestration of the RAG query flow:

retrieve -> build_context -> check_answer_cache -> [cache hit -> END]
                                                  -> generate -> write_cache -> END
"""

from typing import Any, Optional, TypedDict

from langgraph.graph import END, StateGraph

from app.caching.base import BaseCache
from app.core.interfaces import GenerationResult
from app.core.logging import get_logger
from app.llm.base import BaseLLM
from app.retrieval.retriever_service import RetrievalService
from app.utils.hashing import hash_context

logger = get_logger(__name__)

_SYSTEM_PROMPT = (
    "You are a legal research assistant. Answer the user's question using ONLY "
    "the provided context excerpts from legal documents. Cite the source heading "
    "(e.g. 'Article 3 > Section 3.2') for each claim. If the context does not "
    "contain the answer, say so explicitly instead of guessing."
)


class RagState(TypedDict, total=False):
    query: str
    filters: Optional[dict[str, Any]]
    retrieved: list
    context: str
    context_hash: str
    cache_key: str
    answer: str
    cached: bool
    sources: list[dict[str, Any]]


class RagService:
    def __init__(
        self,
        retrieval_service: RetrievalService,
        llm: BaseLLM,
        answer_cache: Optional[BaseCache] = None,
        answer_cache_ttl: int = 3600,
    ):
        self._retrieval_service = retrieval_service
        self._llm = llm
        self._answer_cache = answer_cache
        self._answer_cache_ttl = answer_cache_ttl
        self._graph = self._build_graph()

    def _build_graph(self):
        graph = StateGraph(RagState)
        graph.add_node("retrieve", self._retrieve_node)
        graph.add_node("build_context", self._build_context_node)
        graph.add_node("check_cache", self._check_cache_node)
        graph.add_node("generate", self._generate_node)
        graph.add_node("write_cache", self._write_cache_node)

        graph.set_entry_point("retrieve")
        graph.add_edge("retrieve", "build_context")
        graph.add_edge("build_context", "check_cache")
        graph.add_conditional_edges(
            "check_cache",
            lambda state: "hit" if state.get("cached") else "miss",
            {"hit": END, "miss": "generate"},
        )
        graph.add_edge("generate", "write_cache")
        graph.add_edge("write_cache", END)

        return graph.compile()

    async def _retrieve_node(self, state: RagState) -> RagState:
        retrieved = await self._retrieval_service.retrieve(state["query"], state.get("filters"))
        return {"retrieved": retrieved}

    async def _build_context_node(self, state: RagState) -> RagState:
        parts = []
        sources: list[dict[str, Any]] = []
        seen_documents: set[str] = set()
        for chunk in state["retrieved"]:
            heading = chunk.metadata.get("heading_path", "")
            parts.append(f"[{heading}]\n{chunk.content}")

            document_id = chunk.metadata.get("document_id")
            if document_id and document_id not in seen_documents:
                seen_documents.add(document_id)
                sources.append(
                    {
                        "document_id": document_id,
                        "filename": chunk.metadata.get("filename"),
                        "doc_type": chunk.metadata.get("doc_type"),
                        "heading_path": heading,
                    }
                )
        context = "\n\n---\n\n".join(parts)
        context_hash = hash_context(state["query"], context)
        return {
            "context": context,
            "context_hash": context_hash,
            "cache_key": context_hash,
            "sources": sources,
        }

    async def _check_cache_node(self, state: RagState) -> RagState:
        if self._answer_cache is None:
            return {"cached": False}
        cached_answer = await self._answer_cache.get(state["cache_key"])
        if cached_answer is not None:
            logger.info("answer_cache hit for query=%r", state["query"])
            return {"answer": cached_answer, "cached": True}
        return {"cached": False}

    async def _generate_node(self, state: RagState) -> RagState:
        prompt = (
            f"Context:\n{state['context']}\n\n"
            f"Question: {state['query']}\n\n"
            "Answer:"
        )
        answer = await self._llm.generate(prompt, system=_SYSTEM_PROMPT)
        return {"answer": answer}

    async def _write_cache_node(self, state: RagState) -> RagState:
        if self._answer_cache is not None:
            await self._answer_cache.set(
                state["cache_key"],
                {
                    "query_text": state["query"],
                    "context_hash": state["context_hash"],
                    "answer": state["answer"],
                },
                ttl_seconds=self._answer_cache_ttl,
            )
        return {}

    async def answer(self, query: str, filters: Optional[dict[str, Any]] = None) -> GenerationResult:
        final_state = await self._graph.ainvoke({"query": query, "filters": filters})
        return GenerationResult(
            answer=final_state["answer"],
            model=self._llm.model_name,
            cached=final_state.get("cached", False),
            sources=final_state.get("sources", []),
        )
