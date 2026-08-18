# StudyMate Backend

Retrieval-augmented AI study assistant for student notes. Upload PDF/DOCX
notes and get grounded chat answers, auto-generated summaries, key points,
flashcards, quizzes, and timed tests — all cited back to the source
material. FastAPI + LangChain + LangGraph + Postgres/pgvector, with a
Hugging Face embedding model and Ollama Cloud (`gpt-oss:120b`) as the LLM.

Embeddings are computed via the **Hugging Face hosted Inference API** rather
than a local model, so the API image never installs torch/transformers —
just `httpx` calls out to `bge-small-en-v1.5` on HF's infrastructure. This
keeps the Docker image small and the build fast; the trade-off is network
latency and an external dependency at embed time, which the embedding cache
(below) mostly absorbs after the first pass over a document.

## Architecture

```
app/
├── main.py                   FastAPI app, router registration
├── config.py                 Settings (env-driven)
├── dependencies.py           DI wiring: picks concrete implementations for each ABC
├── auth/                     Password hashing, JWT issuance, get_current_user dependency
├── api/                      HTTP routes (auth, documents, chats, chat, study tools, assessments)
├── core/interfaces.py        Abstract base classes for every swappable component
├── ingestion/
│   ├── parsers/                PDF / DOCX -> ParsedDocument (heading-aware)
│   ├── chunking/                Heading/token-budget-aware chunker
│   └── pipeline.py              parse -> chunk -> embed -> persist
├── embeddings/                HuggingFace embedder (cache-aware)
├── llm/                       Ollama Cloud client
├── retrieval/                 pgvector hybrid search + retrieval service
├── generation/
│   ├── rag_service.py           LangGraph RAG flow (retrieve -> generate -> cache)
│   └── study_tools_service.py   Summaries / key points / flashcards / quizzes / tests + grading
├── caching/                    Postgres-backed embedding/query/answer caches
├── db/                          SQLAlchemy models + async session
└── schemas/                     Pydantic request/response models
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

## Auth

JWT-based (`passlib`/bcrypt for hashing, `python-jose` for tokens):

- `POST /auth/signup` / `POST /auth/login` — standard email+password.
- `POST /auth/guest` — creates an anonymous guest account (no email/password
  required) so people can try the product before signing up. Guests are real
  `users` rows (`is_guest=true`) — every document, chat, flashcard set, etc.
  they create is tied to that row like any other user.
- `POST /auth/upgrade` — attaches an email/password to the *current* guest
  account in place (same `user_id`), so a guest's existing data carries over
  when they decide to save it. Requires `is_guest=true`; 400 otherwise.
- `GET /auth/me` — current user.

Every other route requires `Authorization: Bearer <token>` via the
`get_current_user` dependency and scopes its queries to that user.

## Chunking strategy

Chunking is heading-aware rather than fixed-size, so retrieval can cite
"Chapter 2 > Photosynthesis" instead of an arbitrary character offset:

1. Parsers normalize structure into a common signal before chunking: DOCX
   heading styles ("Heading 1".."Heading 6") and PDF headings (detected by
   font size/bold relative to the page's median body-text size) are both
   re-emitted as Markdown `#`/`##`/... markers in the parsed text.
2. `StudyNotesChunker` splits on those markers, builds a `heading_path` per
   chunk (e.g. `"Chapter 2 > Photosynthesis"`) for citation, and recurses
   with LangChain's `RecursiveCharacterTextSplitter` (`CHUNK_TOKEN_SIZE`,
   default 500 tokens, `CHUNK_TOKEN_OVERLAP` overlap 50) on any section still
   over the token budget.
3. Notes with no detected headings fall through to a single section that
   gets token-budget split directly — still correct, just without a
   heading path.

## Retrieval strategy

`PgVectorStore.hybrid_search` runs two queries per search and fuses them
with **Reciprocal Rank Fusion** (k=60):

- **Vector search**: pgvector cosine similarity (HNSW index) over
  `bge-small-en-v1.5` embeddings.
- **Full-text search**: Postgres `tsvector`/`ts_rank_cd` (GIN index) — catches
  exact terms and defined vocabulary that pure semantic similarity can miss.

Every chat request must pin a single `document_id` (see [API](#api) below) —
retrieval is always scoped to `{document_id, user_id}`, both applied as SQL
`WHERE` clauses before ranking. There's no "search all of a user's
documents" mode; that would mean scanning a user's entire library on every
message, which doesn't scale and isn't worth the extra hop for a chat that's
meant to be about one document at a time.

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
given model. Because `user_id` is always part of the retrieval filters, cache
keys are naturally scoped per user too.

## RAG flow (LangGraph)

`generation/rag_service.py` builds a small graph:

```
retrieve -> build_context -> check_answer_cache --(hit)--> END
                                                 \-(miss)-> generate -> write_cache -> END
```

`generation/study_tools_service.py` is a separate, simpler path: it loads a
document's chunks directly (ordered, capped by a token budget — no
similarity search needed since the whole document is the context), prompts
the LLM for structured JSON, and persists the result. Used for summaries,
key points, flashcards, and quiz/test generation + grading.

## Running

```bash
cp .env.example .env   # fill in OLLAMA_API_KEY, HUGGINGFACE_TOKEN, JWT_SECRET_KEY
docker compose up --build
```

This starts Postgres (`pgvector/pgvector:pg16`) and the API on
`http://localhost:8000`. Run Alembic migrations after the containers are up:

```bash
docker compose exec api alembic upgrade head
```

### API

**Auth**
- `POST /auth/signup` — `{"email", "password", "full_name"}` -> JWT.
- `POST /auth/login` — form-encoded (`username`=email, `password`) -> JWT.
- `POST /auth/guest` — no body -> JWT for a new anonymous guest account.
- `POST /auth/upgrade` — (guest token) `{"email", "password", "full_name"}` -> JWT, converts the guest account in place.
- `GET /auth/me` — current user.

**Documents**
- `POST /documents` — multipart upload (`file`, optional `doc_type`), ingests a PDF or DOCX.
- `GET /documents` — list the current user's documents.
- `DELETE /documents/{id}` — remove a document and its chunks.

**Chat**
- `POST /chat` — `{"query", "chat_id"?, "filters": {"document_id": "..."}}` -> grounded answer + `chat_id` (creates a chat if omitted). `filters.document_id` is required — 400 without it.
- `GET /chats` / `GET /chats/{id}` / `PATCH /chats/{id}` / `DELETE /chats/{id}` — chat history, persisted per user in Postgres.

**Study tools** (per document)
- `POST /documents/{id}/summary` / `GET /documents/{id}/summary`
- `POST /documents/{id}/keypoints` / `GET /documents/{id}/keypoints`
- `POST /documents/{id}/flashcards` (`{"count"}`) / `GET /documents/{id}/flashcards`
- `GET /flashcards/{set_id}`

**Assessments (quizzes & tests)**
- `POST /documents/{id}/assessments` — `{"kind": "quiz"|"test", "num_questions", "time_limit_minutes"?}`.
- `GET /documents/{id}/assessments` / `GET /assessments/{id}`
- `POST /assessments/{id}/attempts` — `{"answers": {question_id: choice}}` -> graded result.
- `GET /assessments/{id}/attempts` — attempt history.

`GET /health` — liveness check, no auth.

### Tests

```bash
pip install -r requirements.txt
pytest
```

Auth, chunking, and retrieval-fusion tests are pure/local — no DB or network
calls (the HF Inference API and Postgres are only hit when actually
ingesting/chatting via the live routes, which the test suite doesn't spin up
a database for yet).

## Notes / assumptions

- Inputs are assumed to be text-native PDF/DOCX (no OCR).
- Uploaded files themselves are never persisted — only the parsed/chunked
  text and embeddings. There's no way to re-download the original PDF/DOCX
  today; adding that would mean writing the raw bytes to object storage
  (S3/R2/MinIO) or a disk volume and storing the reference on `Document`.
- `bcrypt` is pinned to `4.0.1` in `requirements.txt` — newer `bcrypt`
  versions raise instead of silently truncating on passlib's internal
  72-byte self-test, which crashes signup/login. Don't unpin it without
  also moving off `passlib`.
- `requirements.txt` is otherwise intentionally unpinned per project
  convention; pin versions before deploying to production.
