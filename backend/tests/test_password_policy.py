import pytest
from pydantic import ValidationError

from app.models.auth import RegisterRequest


def test_valid_password_accepted():
    RegisterRequest(email="a@b.com", password="abcd1234")


def test_too_short_rejected():
    with pytest.raises(ValidationError):
        RegisterRequest(email="a@b.com", password="ab12")


def test_letters_only_rejected():
    with pytest.raises(ValidationError, match="letter and one digit"):
        RegisterRequest(email="a@b.com", password="abcdefgh")


def test_digits_only_rejected():
    with pytest.raises(ValidationError, match="letter and one digit"):
        RegisterRequest(email="a@b.com", password="12345678")
