from app.config import Settings


def test_new_defaults_present():
    s = Settings(_env_file=None)
    assert s.app_env == "development"
    assert s.is_production is False
    assert s.rate_limit_auth == "5/minute"
    assert s.access_token_expire_minutes == 60
    assert s.refresh_token_expire_minutes == 60 * 24 * 7
    assert s.retrieval_min_score == 0.25
    assert s.top_k_max == 20
    assert s.enable_visual_captions is True
    assert s.ingest_max_retries == 2
    assert s.public_base_url.startswith("http")


def test_is_production_flag():
    assert Settings(_env_file=None, app_env="production").is_production is True
