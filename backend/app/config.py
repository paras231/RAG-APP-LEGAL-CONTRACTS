"""Central application configuration, loaded from environment / .env."""

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Ollama Cloud
    ollama_api_key: str = ""
    ollama_base_url: str = "https://ollama.com"
    ollama_model: str = "gpt-oss:120b"

    # Hugging Face
    huggingface_token: str = ""
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384

    # Postgres — either set the discrete fields below (docker-compose/local),
    # or set DATABASE_URL to a single connection string (Render and most
    # managed Postgres providers inject this automatically when a database
    # is linked to the service). DATABASE_URL, when set, always wins.
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "study_rag"
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    database_url_env: Optional[str] = Field(default=None, alias="DATABASE_URL")
    # Managed Postgres providers (Render included) require SSL; asyncpg
    # doesn't understand the libpq "sslmode" query param some providers put
    # in DATABASE_URL, so that's stripped and this flag drives connect_args
    # instead. psycopg2 (used by Alembic) understands sslmode natively, so
    # the sync URL is left untouched.
    database_ssl: bool = False

    # Auth
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24 * 7

    # Chunking
    chunk_token_size: int = 500
    chunk_token_overlap: int = 50

    # Retrieval
    retrieval_top_k: int = 8
    rrf_k: int = 60

    # Cache
    query_cache_ttl: int = 3600
    answer_cache_ttl: int = 3600

    # CORS
    cors_allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @property
    def database_url(self) -> str:
        if self.database_url_env:
            return _rewrite_scheme(_strip_sslmode(self.database_url_env), "postgresql+asyncpg")
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def sync_database_url(self) -> str:
        """Used by Alembic, which runs migrations synchronously."""
        if self.database_url_env:
            return _rewrite_scheme(self.database_url_env, "postgresql+psycopg2")
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


def _rewrite_scheme(url: str, driver: str) -> str:
    """Swaps whatever scheme a provided DATABASE_URL uses (postgres://,
    postgresql://, ...) for the given SQLAlchemy driver scheme."""
    _, _, rest = url.partition("://")
    return f"{driver}://{rest}"


def _strip_sslmode(url: str) -> str:
    """asyncpg raises on the libpq-style "sslmode" query param some
    providers include in DATABASE_URL; SSL is instead requested via
    connect_args (see db/session.py) driven by DATABASE_SSL."""
    base, sep, query = url.partition("?")
    if not sep:
        return url
    kept = [p for p in query.split("&") if p and not p.startswith("sslmode=")]
    return base + ("?" + "&".join(kept) if kept else "")


@lru_cache
def get_settings() -> Settings:
    return Settings()
