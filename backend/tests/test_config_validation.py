import pytest

from app.config import Settings
from app.config_validation import ConfigError, validate_production_config


def _prod(**overrides):
    base = dict(
        app_env="production",
        jwt_secret="a-real-secret",
        database_url="postgresql+psycopg://u:p@db/x",
        aws_s3_bucket="b", aws_access_key_id="k", aws_secret_access_key="s",
    )
    base.update(overrides)
    return Settings(_env_file=None, **base)


def test_dev_never_raises():
    validate_production_config(Settings(_env_file=None, app_env="development"))


def test_prod_ok_config_passes():
    validate_production_config(_prod())


def test_prod_default_secret_raises():
    with pytest.raises(ConfigError, match="JWT_SECRET"):
        validate_production_config(_prod(jwt_secret="change-me-in-production"))


def test_prod_missing_db_raises():
    with pytest.raises(ConfigError, match="DATABASE_URL"):
        validate_production_config(_prod(database_url=""))


def test_prod_missing_s3_raises():
    with pytest.raises(ConfigError, match="S3"):
        validate_production_config(_prod(aws_s3_bucket=""))
