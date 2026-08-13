import asyncio
import json
import os
import re
import shutil
import subprocess
import urllib.request
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import quote

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from PIL import Image

router = APIRouter()

MANIFEST_PATH = Path(__file__).parent / "emoji_manifest.json"
CACHE_ROOT = Path(__file__).parent.parent / "data" / "emoji-cache"

SOURCE_BASE = {
    "fluent": "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/",
    "telegram": "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Telegram-Animated-Emojis/main/",
}

SLUG_RE = re.compile(r"^[a-z0-9-]{1,120}$")

_manifest: dict | None = None
_locks: dict[str, asyncio.Lock] = {}
_conversion_sem = asyncio.Semaphore(4)


def get_manifest() -> dict:
    global _manifest
    if _manifest is None:
        _manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return _manifest


def fetch_to(url: str, dest: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "Xyteee/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response, open(dest, "wb") as out:
        shutil.copyfileobj(response, out)
    if dest.stat().st_size < 100:
        raise HTTPException(502, "emoji source returned an empty file")


def run_ffmpeg(args: list[str]) -> None:
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        raise HTTPException(502, f"ffmpeg failed: {result.stderr[-400:]}")


def convert_apng(src: Path, dst: Path) -> None:
    filter_graph = (
        "fps=15,scale=128:128:flags=lanczos,split[s0][s1];"
        "[s0]palettegen=max_colors=128:stats_mode=diff[p];"
        "[s1][p]paletteuse=dither=bayer:bayer_scale=4"
    )
    run_ffmpeg(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src),
                "-vf", filter_graph, "-loop", "0", "-f", "gif", str(dst)])


def convert_webp(src: Path, dst: Path) -> None:
    image = Image.open(src)
    frame_count = image.n_frames
    with TemporaryDirectory() as temp:
        temp_dir = Path(temp)
        for i in range(frame_count):
            image.seek(i)
            frame = image.convert("RGBA").resize((128, 128), Image.LANCZOS)
            frame.save(temp_dir / f"f_{i:03d}.png")
        fps = round(frame_count / 1.5, 2)
        pattern = str(temp_dir / "f_%03d.png")
        palette = str(temp_dir / "pal.png")
        run_ffmpeg(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", pattern,
                    "-vf", "palettegen=max_colors=128:stats_mode=diff", "-frames:v", "1", palette])
        run_ffmpeg(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", pattern,
                    "-i", palette, "-filter_complex", "[0:v][1:v]paletteuse=dither=bayer:bayer_scale=4",
                    "-loop", "0", "-f", "gif", str(dst)])


def convert(family: str, source_file: str, cache_file: Path) -> None:
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    temp_out = cache_file.with_name(cache_file.name + ".tmp")
    try:
        with TemporaryDirectory() as temp:
            temp_dir = Path(temp)
            ext = ".webp" if family == "telegram" else ".png"
            source = temp_dir / ("source" + ext)
            url = SOURCE_BASE[family] + quote(source_file, safe="/")
            fetch_to(url, source)
            if family == "telegram":
                convert_webp(source, temp_out)
            else:
                convert_apng(source, temp_out)
        os.replace(temp_out, cache_file)
    finally:
        temp_out.unlink(missing_ok=True)


@router.get("/emoji/{family}/{slug}.gif")
async def emoji_gif(family: str, slug: str):
    if family not in SOURCE_BASE or not SLUG_RE.match(slug):
        raise HTTPException(404, "emoji not found")
    manifest = get_manifest()
    entry = manifest.get(family, {}).get(slug)
    if entry is None:
        raise HTTPException(404, "emoji not found")
    cache_file = CACHE_ROOT / family / f"{slug}.gif"
    if not cache_file.exists():
        lock = _locks.setdefault(f"{family}/{slug}", asyncio.Lock())
        async with lock:
            if not cache_file.exists():
                async with _conversion_sem:
                    await asyncio.to_thread(convert, family, entry["file"], cache_file)
    return FileResponse(cache_file, media_type="image/gif",
                        headers={"Cache-Control": "public, max-age=31536000, immutable"})
