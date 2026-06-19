"""Application settings, loaded from environment / .env."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- OpenRouter / LLM ---
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    default_vision_model: str = "openai/gpt-4o-mini"

    # --- Embeddings ---
    # OpenRouter key is reused for embeddings per project decision. Because OpenRouter
    # may not expose an /embeddings route, the base URL is independently overridable
    # (e.g. point it at https://api.openai.com/v1 with the same or a different key).
    embedding_model: str = "text-embedding-3-small"
    embedding_base_url: str = "https://openrouter.ai/api/v1"
    embedding_api_key: str = ""  # falls back to openrouter_api_key when empty

    # --- Video processing ---
    frame_extract_fps: float = 1.0
    frame_format: str = "jpg"  # jpg | png
    whisper_model: str = "base"
    max_video_size_mb: int = 500
    # Max number of heavy ingest jobs (frame extraction + whisper) running at once.
    ingest_concurrency: int = 2

    # --- Storage / vector store ---
    storage_dir: str = "./storage"
    chroma_persist_dir: str = "./chroma_db"

    # --- Server ---
    cors_origins: str = "http://localhost:5173"
    app_title: str = "Video RAG API"
    api_prefix: str = "/api/v1"

    # --- Rate limiting (slowapi limit strings, e.g. "10/minute") ---
    rate_limit_upload: str = "10/minute"
    rate_limit_query: str = "30/minute"

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


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.videos_dir.mkdir(parents=True, exist_ok=True)
    settings.frames_dir.mkdir(parents=True, exist_ok=True)
    Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
    return settings
