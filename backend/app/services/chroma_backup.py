"""Backup / restore the embedded ChromaDB store to S3.

Chroma's PersistentClient keeps its data on a local filesystem (SQLite + HNSW
index files) — S3 cannot be the *live* store. This module snapshots that
directory to the configured S3 bucket so the index survives volume/host loss,
and restores it on a fresh box.

CLI:
    python -m app.services.chroma_backup backup            # snapshot -> S3
    python -m app.services.chroma_backup restore           # latest snapshot -> disk
    python -m app.services.chroma_backup restore-if-empty   # restore only if store is empty (boot hook)
    python -m app.services.chroma_backup list              # list available snapshots
"""
from __future__ import annotations

import logging
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from app.config import get_settings
from app.services import storage

logger = logging.getLogger(__name__)


def _persist_dir() -> Path:
    return Path(get_settings().chroma_persist_dir)


def _prefix() -> str:
    return get_settings().chroma_backup_s3_prefix.strip("/")


def _is_empty(path: Path) -> bool:
    return not path.exists() or not any(path.iterdir())


def backup() -> str:
    """Tar the Chroma persist dir and upload it to S3. Returns the object key.

    Snapshot names are UTC-timestamped so they sort chronologically by key.
    """
    src = _persist_dir()
    if _is_empty(src):
        raise RuntimeError(f"Chroma persist dir is empty, nothing to back up: {src}")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    key = f"{_prefix()}/chroma-{stamp}.tar.gz"

    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        with tarfile.open(tmp_path, "w:gz") as tar:
            tar.add(src, arcname=".")  # archive the directory *contents*
        storage.upload_file(tmp_path, key, content_type="application/gzip")
    finally:
        tmp_path.unlink(missing_ok=True)

    logger.info("chroma backup uploaded: s3://%s/%s", get_settings().aws_s3_bucket, key)
    return key


def list_backups() -> list[str]:
    """All snapshot keys, oldest -> newest (timestamped names sort chronologically)."""
    keys = [k for k in storage.list_keys(f"{_prefix()}/") if k.endswith(".tar.gz")]
    return sorted(keys)


def latest_backup_key() -> str | None:
    keys = list_backups()
    return keys[-1] if keys else None


def restore(key: str | None = None) -> str:
    """Download a snapshot (latest if `key` is None) and extract it into the
    persist dir, replacing its current contents. Returns the key restored."""
    key = key or latest_backup_key()
    if not key:
        raise RuntimeError("No Chroma backups found in S3 to restore from.")

    dest = _persist_dir()
    dest.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        storage.download_to_file(key, tmp_path)
        with tarfile.open(tmp_path, "r:gz") as tar:
            tar.extractall(dest)  # noqa: S202 — our own trusted archives
    finally:
        tmp_path.unlink(missing_ok=True)

    logger.info("chroma store restored from s3://%s/%s", get_settings().aws_s3_bucket, key)
    return key


def restore_if_empty() -> str | None:
    """Boot hook: restore the latest snapshot only when the store is empty.

    Safe to call on every startup — a no-op when the volume already has data.
    """
    if not _is_empty(_persist_dir()):
        return None
    key = latest_backup_key()
    if not key:
        logger.info("chroma store is empty and no backup exists yet — starting fresh.")
        return None
    return restore(key)


def _main(argv: list[str]) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    cmd = argv[0] if argv else "help"
    if cmd == "backup":
        print(backup())
    elif cmd == "restore":
        print(restore(argv[1] if len(argv) > 1 else None))
    elif cmd == "restore-if-empty":
        key = restore_if_empty()
        print(key or "(no-op)")
    elif cmd == "list":
        for k in list_backups():
            print(k)
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv[1:]))
