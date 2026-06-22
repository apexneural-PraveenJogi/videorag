"""Shared pytest fixtures."""
import os
import sys
from pathlib import Path

# Make `app` importable when running `python -m pytest` from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Default test env: never inherit a real .env that fails the prod guard.
os.environ.setdefault("APP_ENV", "development")
