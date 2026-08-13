import time
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.emoji import CACHE_ROOT, convert, get_manifest  # noqa: E402


def convert_with_retry(family: str, source_file: str, cache_file: Path) -> None:
    last_error = None
    for attempt in range(3):
        try:
            convert(family, source_file, cache_file)
            return
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if attempt < 2:
                time.sleep(3 * (attempt + 1))
    raise last_error


def main() -> None:
    manifest = get_manifest()
    jobs = []
    for family, entries in manifest.items():
        for slug in entries:
            jobs.append((family, entries[slug]["file"], slug))
    jobs.sort(key=lambda job: job[0])

    done = [job for job in jobs if (CACHE_ROOT / job[0] / f"{job[2]}.gif").exists()]
    todo = [job for job in jobs if job not in done]
    print(f"total={len(jobs)} cached={len(done)} to_convert={len(todo)}")

    failed = []
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(convert_with_retry, family, file, CACHE_ROOT / family / f"{slug}.gif"): slug
                   for family, file, slug in todo}
        for index, future in enumerate(as_completed(futures), 1):
            slug = futures[future]
            try:
                future.result()
            except Exception as exc:  # noqa: BLE001
                failed.append((slug, repr(exc)))
                print(f"[{index}/{len(todo)}] FAIL {slug}: {exc}")
            else:
                if index % 50 == 0 or index == len(todo):
                    print(f"[{index}/{len(todo)}] done")
    print(f"converted={len(todo) - len(failed)} failed={len(failed)}")
    for slug, error in failed:
        print("  FAIL", slug, error)


if __name__ == "__main__":
    main()
