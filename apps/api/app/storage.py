import asyncio
import io
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import settings

ALLOWED_FILES = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
    "application/pdf": ".pdf", "text/plain": ".txt",
    "audio/webm": ".webm", "audio/ogg": ".ogg", "audio/mp4": ".m4a", "audio/mpeg": ".mp3",
    "audio/aac": ".aac", "audio/x-m4a": ".m4a", "audio/3gpp": ".3gp",
}

AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
AVATAR_MAX = 1024


def square_avatar(data: bytes, content_type: str) -> bytes:
    from PIL import Image

    try:
        image = Image.open(io.BytesIO(data))
        image = image.convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Could not process the image") from exc
    width, height = image.size
    if width != height:
        side = min(width, height)
        image = image.crop(((width - side) // 2, (height - side) // 2, (width + side) // 2, (height + side) // 2))
    if max(image.size) > AVATAR_MAX:
        image.thumbnail((AVATAR_MAX, AVATAR_MAX), Image.LANCZOS)
    out = io.BytesIO()
    image.save(out, "JPEG", quality=85, optimize=True)
    return out.getvalue()


async def _prepare(upload: UploadFile, *, avatar: bool) -> tuple[str, bytes, str]:
    content_type = (upload.content_type or "").split(";", 1)[0].strip().lower()
    suffix = ALLOWED_FILES.get(content_type)
    if not suffix:
        raise HTTPException(status_code=415, detail="Unsupported file type")
    data = await upload.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="File too large")
    if avatar and content_type in AVATAR_TYPES:
        data = square_avatar(data, content_type)
        suffix = ".jpg"
    name = f"{uuid.uuid4()}{suffix}"
    return name, data, content_type


class Storage(ABC):
    @abstractmethod
    async def save(self, upload: UploadFile, *, avatar: bool = False) -> str: ...

    @abstractmethod
    async def delete(self, url: str | None) -> None: ...


class LocalStorage(Storage):
    def __init__(self, root: str) -> None:
        self.root = Path(root)

    async def save(self, upload: UploadFile, *, avatar: bool = False) -> str:
        name, data, _content_type = await _prepare(upload, avatar=avatar)
        self.root.mkdir(parents=True, exist_ok=True)
        (self.root / name).write_bytes(data)
        return f"/uploads/{name}"

    async def delete(self, url: str | None) -> None:
        if not url or not url.startswith("/uploads/"):
            return
        try:
            (self.root / url.removeprefix("/uploads/")).unlink(missing_ok=True)
        except OSError:
            pass


class R2Storage(Storage):
    """Cloudflare R2 via the S3-compatible API."""

    def __init__(
        self,
        *,
        endpoint: str,
        bucket: str,
        access_key: str,
        secret_key: str,
        public_url: str,
        region: str = "auto",
        cors_origins: list[str] | None = None,
    ) -> None:
        self.bucket = bucket
        self.public_url = (public_url or "").strip()
        if self.public_url and not self.public_url.startswith(("http://", "https://")):
            self.public_url = f"https://{self.public_url}"
        self.public_url = self.public_url.rstrip("/")
        self.cors_origins = cors_origins or []
        self._endpoint = endpoint.rstrip("/")
        self._credentials = (access_key, secret_key)
        self._region = region
        self._client: object | None = None

    def _make_client(self):
        import boto3

        return boto3.client(
            "s3",
            endpoint_url=self._endpoint,
            region_name=self._region,
            aws_access_key_id=self._credentials[0],
            aws_secret_access_key=self._credentials[1],
        )

    def _ensure_client(self):
        if self._client is None:
            self._client = self._make_client()
            self._set_cors()
        return self._client

    def _set_cors(self) -> None:
        if not self.cors_origins:
            return
        try:
            self._client.put_bucket_cors(  # type: ignore[attr-defined]
                Bucket=self.bucket,
                CORSConfiguration={
                    "CORSRules": [{
                        "AllowedOrigins": self.cors_origins,
                        "AllowedMethods": ["GET", "HEAD"],
                        "AllowedHeaders": ["*"],
                        "MaxAgeSeconds": 3600,
                    }]
                },
            )
        except Exception:
            # Best-effort; CORS can also be configured in the R2 dashboard.
            pass

    async def save(self, upload: UploadFile, *, avatar: bool = False) -> str:
        name, data, content_type = await _prepare(upload, avatar=avatar)
        client = self._ensure_client()
        await asyncio.to_thread(
            client.put_object,  # type: ignore[attr-defined]
            Bucket=self.bucket,
            Key=name,
            Body=data,
            ContentType=content_type,
        )
        return f"{self.public_url}/{name}"

    async def delete(self, url: str | None) -> None:
        if not url or not self.public_url or not url.startswith(self.public_url):
            return
        key = url[len(self.public_url) + 1:]
        if not key:
            return
        try:
            client = self._ensure_client()
            await asyncio.to_thread(client.delete_object, Bucket=self.bucket, Key=key)  # type: ignore[attr-defined]
        except Exception:
            pass


def build_storage() -> Storage:
    if settings.storage_backend == "r2":
        return R2Storage(
            endpoint=settings.storage_endpoint,
            bucket=settings.storage_bucket,
            access_key=settings.storage_access_key,
            secret_key=settings.storage_secret_key,
            public_url=settings.storage_public_url,
            region=settings.storage_region,
            cors_origins=settings.cors_origins,
        )
    return LocalStorage(settings.upload_dir)


storage: Storage = build_storage()
