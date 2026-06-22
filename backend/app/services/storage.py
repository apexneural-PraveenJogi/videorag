"""S3 object storage for source videos and extracted frames.

Lazily constructs the boto3 client so the app boots without credentials. Keys:
  users/<user_id>/videos/<video_id>/<filename>
  users/<user_id>/frames/<video_id>/<frame>.jpg
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

import boto3
from botocore.config import Config

from app.config import get_settings

_client = None


class StorageError(RuntimeError):
    pass


def _s3():
    global _client
    settings = get_settings()
    if not settings.s3_configured:
        raise StorageError("S3 is not configured (AWS_S3_BUCKET / credentials).")
    if _client is None:
        kwargs = dict(
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            config=Config(signature_version="s3v4"),
        )
        if settings.aws_s3_endpoint_url:
            kwargs["endpoint_url"] = settings.aws_s3_endpoint_url
        _client = boto3.client("s3", **kwargs)
    return _client


def _bucket() -> str:
    return get_settings().aws_s3_bucket


def video_key(user_id: str, video_id: str, filename: str) -> str:
    return f"users/{user_id}/videos/{video_id}/{filename}"


def frame_key(user_id: str, video_id: str, name: str) -> str:
    return f"users/{user_id}/frames/{video_id}/{name}"


def frames_prefix(user_id: str, video_id: str) -> str:
    return f"users/{user_id}/frames/{video_id}/"


def video_prefix(user_id: str, video_id: str) -> str:
    return f"users/{user_id}/videos/{video_id}/"


def upload_file(local_path: str | Path, key: str, content_type: Optional[str] = None) -> None:
    extra = {"ContentType": content_type} if content_type else None
    _s3().upload_file(str(local_path), _bucket(), key, ExtraArgs=extra)


def download_to_file(key: str, local_path: str | Path) -> None:
    _s3().download_file(_bucket(), key, str(local_path))


def get_bytes(key: str) -> bytes:
    return _s3().get_object(Bucket=_bucket(), Key=key)["Body"].read()


def presigned_url(key: str) -> str:
    return _s3().generate_presigned_url(
        "get_object",
        Params={"Bucket": _bucket(), "Key": key},
        ExpiresIn=get_settings().presign_expire_seconds,
    )


def list_keys(prefix: str) -> list[str]:
    keys: list[str] = []
    paginator = _s3().get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=_bucket(), Prefix=prefix):
        for obj in page.get("Contents", []) or []:
            keys.append(obj["Key"])
    return keys


def delete_prefix(prefix: str) -> None:
    keys = list_keys(prefix)
    if not keys:
        return
    # delete_objects takes up to 1000 keys per call
    for i in range(0, len(keys), 1000):
        batch = [{"Key": k} for k in keys[i : i + 1000]]
        _s3().delete_objects(Bucket=_bucket(), Delete={"Objects": batch})
