import jwt
import pytest

from app.security import (
    create_access_token, create_refresh_token,
    decode_access_token, decode_refresh_token,
)


def test_access_token_roundtrip():
    tok = create_access_token("user-1")
    assert decode_access_token(tok)["sub"] == "user-1"


def test_refresh_token_roundtrip():
    tok = create_refresh_token("user-2")
    assert decode_refresh_token(tok)["sub"] == "user-2"


def test_access_decoder_rejects_refresh_token():
    tok = create_refresh_token("user-3")
    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(tok)


def test_refresh_decoder_rejects_access_token():
    tok = create_access_token("user-4")
    with pytest.raises(jwt.InvalidTokenError):
        decode_refresh_token(tok)
