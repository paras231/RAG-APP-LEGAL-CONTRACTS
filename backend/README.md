# Legal RAG Backend

Retrieval-augmented generation backend for legal documents. FastAPI + LangChain
+ LangGraph + Postgres/pgvector, with a Hugging Face embedding model and
Ollama Cloud (`gpt-oss-120b`) as the LLM.

Embeddings are computed via the **Hugging Face hosted Inference API** rather
than a local model, so the API image never installs torch/transformers —
just `httpx` calls out to `bge-small-en-v1.5` on HF's infrastructure. This
keeps the Docker image small and the build fast; the trade-off is network
latency and an external dependency at embed time, which the embedding cache
(below) mostly absorbs after the first pass over a document.

## Architecture

```
app/
├── main.py                 FastAPI app, startup hooks
├── config.py                Settings (env-driven)
├── dependencies.py          DI wiring: picks concrete implementations for each ABC
├── api/                     HTTP routes (documents, chat)
├── core/interfaces.py       Abstract base classes for every swappable component
├── ingestion/
│   ├── parsers/              PDF / DOCX -> ParsedDocument
│   ├── chunking/              Legal-structure-aware chunker
│   └── pipeline.py            parse -> chunk -> embed -> persist
├── embeddings/               HuggingFace embedder (cache-aware)
├── llm/                      Ollama Cloud client
├── retrieval/                pgvector hybrid search + retrieval service
├── generation/                LangGraph RAG flow (retrieve -> generate -> cache)
├── caching/                   Postgres-backed embedding/query/answer caches
├── db/                        SQLAlchemy models + async session
└── schemas/                   Pydantic request/response models
```

### Design principle: everything external sits behind an interface

`core/interfaces.py` defines `BaseLLM`, `BaseEmbedder`, `BaseVectorStore`,
`BaseDocumentParser`, `BaseChunker`, `BaseCache`. Application code (routes,
services) only ever depends on these ABCs. `dependencies.py` is the single
place that decides which concrete class backs each interface. To swap:

- **LLM provider** — implement `BaseLLM` (see `llm/ollama_llm.py`), then
  point `get_llm()` in `dependencies.py` at the new class.
- **Embedding model** — change `EMBEDDING_MODEL` in `.env` for another model
  hosted on the HF Inference API, or implement `BaseEmbedder` for a
  different provider/approach (local ONNX via `fastembed`, OpenAI, Cohere, ...).
- **Vector store** — implement `BaseVectorStore` for a different backend
  (e.g. Pinecone, Qdrant) without touching `RetrievalService` or the API.
- **Parsers** — add a `BaseDocumentParser` subclass and register it in
  `ingestion/parsers/registry.py` to support a new file format.

## Chunking strategy

Legal documents have citable structure (Articles, Sections, numbered
clauses) that generic chunking destroys. `LegalStructureChunker`:

1. Detects structural markers (`ARTICLE 3`, `Section 3.2`, `(a)`, `5.1 ...`)
   with regex and splits the document at those boundaries first.
2. Tags every chunk with a `heading_path` (e.g. `"Article 3 > Section 3.2"`)
   for citation in generated answers.
3. Any section still over the token budget (`CHUNK_TOKEN_SIZE`, default 500
   tokens, `CHUNK_TOKEN_OVERLAP` overlap 50) is recursively split with
   LangChain's `RecursiveCharacterTextSplitter`, preserving the heading path.

## Retrieval strategy

`PgVectorStore.hybrid_search` runs two queries per search and fuses them
with **Reciprocal Rank Fusion** (k=60):

- **Vector search**: pgvector cosine similarity (HNSW index) over
  `bge-small-en-v1.5` embeddings.
- **Full-text search**: Postgres `tsvector`/`ts_rank_cd` (GIN index) — this
  matters for legal text where exact terms, defined terms, and citations
  ("Section 3.2", "force majeure") often matter more than semantic
  similarity alone.

Metadata filters (`doc_type`, or anything stored in `chunks.metadata`) are
applied as SQL `WHERE` clauses before ranking.

## Caching

Three Postgres-backed caches, each with a purpose-built table so the type
(vector vs. JSON vs. text) is native rather than serialized generically:

| Cache             | Table            | Key                          | Saves               |
|-------------------|------------------|-------------------------------|----------------------|
| Embedding cache   | `embedding_cache`| `sha256(text)` + model name  | Re-embedding the same text |
| Query result cache| `query_cache`    | `sha256(query + filters)`    | Re-running hybrid search   |
| Answer cache      | `answer_cache`   | `sha256(query + context)`    | Re-calling the LLM (tokens)|

Query/answer caches have a TTL (`QUERY_CACHE_TTL`, `ANSWER_CACHE_TTL`,
seconds) enforced by an `expires_at` column checked on read; the embedding
cache has no TTL since a given text always embeds to the same vector for a
given model.

## RAG flow (LangGraph)

`generation/rag_service.py` builds a small graph:

```
retrieve -> build_context -> check_answer_cache --(hit)--> END
                                                 \-(miss)-> generate -> write_cache -> END
```

## Running

```bash
cp .env.example .env   # fill in OLLAMA_API_KEY and HUGGINGFACE_TOKEN
docker compose up --build
```

This starts Postgres (`pgvector/pgvector:pg16`) and the API on
`http://localhost:8000`. Alembic migrations run automatically on container
start (enables the `vector` extension, creates tables/indexes).

### API

- `POST /documents` — multipart upload (`file`, optional `doc_type`), ingests
  a PDF or DOCX.
- `GET /documents` — list ingested documents.
- `DELETE /documents/{id}` — remove a document and its chunks.
- `POST /chat` — `{"query": "...", "filters": {"doc_type": "contract"}}` ->
  grounded answer with model name and cache-hit flag.
- `GET /health` — liveness check.

### Tests

```bash
pip install -r requirements.txt
pytest
```

All three test files are pure/local — no DB or network calls (the HF
Inference API is only hit when actually embedding text via `/documents` or
`/chat`).

## Notes / assumptions

- Inputs are assumed to be text-native PDF/DOCX (no OCR).
- No authentication layer yet (single-tenant, open API) — noted as a
  deliberate scope decision, not an oversight.
- `requirements.txt` is intentionally unpinned per project convention; pin
  versions before deploying to production.
