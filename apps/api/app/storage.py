import io
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.config import settings

ALLOWED_FILES = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
    "application/pdf": ".pdf", "text/plain": ".txt",
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


class Storage(ABC):
    @abstractmethod
    async def save(self, upload: UploadFile, *, avatar: bool = False) -> str: ...


class LocalStorage(Storage):
    def __init__(self, root: str) -> None:
        self.root = Path(root)

    async def save(self, upload: UploadFile, *, avatar: bool = False) -> str:
        suffix = ALLOWED_FILES.get(upload.content_type or "")
        if not suffix:
            raise HTTPException(status_code=415, detail="Unsupported file type")
        data = await upload.read(settings.max_upload_bytes + 1)
        if len(data) > settings.max_upload_bytes:
            raise HTTPException(status_code=413, detail="File too large")
        self.root.mkdir(parents=True, exist_ok=True)
        if avatar and upload.content_type in AVATAR_TYPES:
            data = square_avatar(data, upload.content_type)
            suffix = ".jpg"
        name = f"{uuid.uuid4()}{suffix}"
        (self.root / name).write_bytes(data)
        return f"/uploads/{name}"


class ExternalStorage(Storage):
    """Contract for S3-compatible/cloud implementations supplied at deployment."""

    async def save(self, upload: UploadFile, *, avatar: bool = False) -> str:
        raise NotImplementedError("Configure an external Storage implementation")


storage: Storage = LocalStorage(settings.upload_dir)
