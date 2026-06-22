"""Application settings, loaded from environment / .env."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- OpenRouter / LLM ---
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    default_vision_model: str = "google/gemini-3.5-flash"

    # --- Embeddings ---
    # OpenRouter key is reused for embeddings per project decision. Because OpenRouter
    # may not expose an /embeddings route, the base URL is independently overridable
    # (e.g. point it at https://api.openai.com/v1 with the same or a different key).
    # Chosen via an embedding bake-off (2026-06-22): on a labeled retrieval set
    # nemotron matched text-embedding-3-small and gemini-embedding-2 on accuracy
    # but gave the cleanest score separation — 0 off-topic false positives vs
    # gemini's near-total pass-through — and is free. Pairs with retrieval_min_score
    # below (tuned to nemotron's lower-magnitude score range).
    embedding_model: str = "nvidia/llama-nemotron-embed-vl-1b-v2:free"
    embedding_base_url: str = "https://openrouter.ai/api/v1"
    embedding_api_key: str = ""  # falls back to openrouter_api_key when empty

    # --- Video processing ---
    frame_extract_fps: float = 1.0
    frame_format: str = "jpg"  # jpg | png
    whisper_model: str = "base"
    max_video_size_mb: int = 500
    # Max number of heavy ingest jobs (frame extraction + whisper) running at once.
    ingest_concurrency: int = 2
    # Parallel workers for per-frame work within one ingest (S3 uploads + vision
    # captions). Long videos have hundreds of frames; serial calls make the
    # "Indexing" step look frozen, so we fan these out.
    ingest_parallelism: int = 8

    # --- Storage / vector store ---
    storage_dir: str = "./storage"  # local temp scratch for ingest only
    chroma_persist_dir: str = "./chroma_db"

    # --- Database (Postgres) ---
    # e.g. postgresql+psycopg://user:pass@localhost:5432/videorag
    database_url: str = ""

    # --- Auth (JWT) ---
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # --- App environment ---
    app_env: str = "development"  # "development" | "production"

    # --- Auth token lifetimes ---
    access_token_expire_minutes: int = 60
    refresh_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # --- Retrieval tuning ---
    # 0.20 floor tuned to the nemotron embedding score range: on the bake-off it
    # kept all on-topic matches while rejecting every off-topic query (worst
    # off-topic similarity was ~0.145). Raise toward 0.25+ if you switch back to
    # an OpenAI-scale embedding model.
    retrieval_min_score: float = 0.20  # cosine similarity floor (1 - distance)
    top_k_max: int = 20
    # Always include this many top keyframes in the prompt (regardless of the
    # score floor) so the vision model has enough images to find a specific
    # moment the user asks for (e.g. "the frame where they smile").
    frame_top_k: int = 8

    # --- Transcript chunking ---
    transcript_chunk_max_chars: int = 320
    transcript_chunk_max_gap_s: float = 1.5

    # --- Visual captions for transcript-less frames ---
    enable_visual_captions: bool = True
    visual_caption_model: str = ""  # falls back to default_vision_model

    # --- Ingest reliability ---
    ingest_max_retries: int = 2
    ingest_job_timeout_s: int = 1800   # hard cap per ingest job
    ingest_queue_timeout_s: int = 600  # max wait for a concurrency slot

    # --- Attribution / public URL ---
    public_base_url: str = "http://localhost:5173"

    # --- Rate limiting (auth) ---
    rate_limit_auth: str = "5/minute"

    # --- AWS S3 ---
    aws_s3_bucket: str = ""
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_endpoint_url: str = ""  # set for S3-compatible hosts (e.g. MinIO); blank = real AWS
    presign_expire_seconds: int = 3600

    # --- Server ---
    cors_origins: str = "http://localhost:5173"
    app_title: str = "Video RAG API"
    api_prefix: str = "/api/v1"

    # --- Rate limiting (slowapi limit strings, e.g. "10/minute") ---
    rate_limit_upload: str = "10/minute"
    rate_limit_query: str = "30/minute"

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def vision_models(self) -> list[dict]:
        """Curated multimodal (vision) models offered in the frontend selector.

        All entries accept image input on OpenRouter. The default is listed first.
        """
        catalog = [
            {"id": "openai/gpt-4o-mini", "label": "GPT-4o mini (fast, cheap)"},
            {"id": "openai/gpt-4o", "label": "GPT-4o"},
            {"id": "google/gemini-3.5-flash", "label": "Gemini 3.5 Flash"},
            {"id": "qwen/qwen2.5-vl-72b-instruct", "label": "Qwen2.5-VL 72B"},
            {"id": "anthropic/claude-opus-4.8", "label": "Claude Opus 4.8"},
        ]
        # Ensure the configured default is present and first.
        ids = [m["id"] for m in catalog]
        if self.default_vision_model not in ids:
            catalog.insert(0, {"id": self.default_vision_model, "label": self.default_vision_model})
        else:
            catalog.sort(key=lambda m: m["id"] != self.default_vision_model)
        return catalog

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def videos_dir(self) -> Path:
        return Path(self.storage_dir) / "videos"

    @property
    def frames_dir(self) -> Path:
        return Path(self.storage_dir) / "frames"

    @property
    def effective_embedding_key(self) -> str:
        return self.embedding_api_key or self.openrouter_api_key

    @property
    def db_configured(self) -> bool:
        return bool(self.database_url)

    @property
    def s3_configured(self) -> bool:
        return bool(self.aws_s3_bucket and self.aws_access_key_id and self.aws_secret_access_key)

    @property
    def psycopg_conninfo(self) -> str:
        """libpq/psycopg connection string (no SQLAlchemy driver prefix) for
        LangChain's PostgresChatMessageHistory."""
        url = self.database_url
        for prefix in ("postgresql+psycopg://", "postgresql+psycopg2://", "postgres://"):
            if url.startswith(prefix):
                return "postgresql://" + url[len(prefix):]
        return url


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.videos_dir.mkdir(parents=True, exist_ok=True)
    settings.frames_dir.mkdir(parents=True, exist_ok=True)
    Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
    return settings
