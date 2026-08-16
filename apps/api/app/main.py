from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.api.feed import feed
from app.config import settings
from app.emoji import router as emoji_router

app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api/v1")
app.include_router(feed, prefix="/api/v1")
app.include_router(emoji_router, prefix="/api/v1")
app.mount("/uploads", StaticFiles(directory=settings.upload_dir, check_dir=False), name="uploads")
