"""Polite, cached HTTP fetching from web.archive.org.

- max 1 request/s (global, across the whole process)
- exponential backoff on 429 / 5xx / connection errors
- every successful response is cached on disk, keyed by URL
- a URL that failed 3 times is recorded in cache/failures.json and never retried
"""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent
CACHE_DIR = ROOT / "cache"
FAILURES_FILE = CACHE_DIR / "failures.json"

MIN_INTERVAL = 1.0  # seconds between requests
MAX_ATTEMPTS = 3
BACKOFF_BASE = 4.0  # 4s, 8s, 16s...
TIMEOUT = 60

USER_AGENT = "FishdexArchiveScraper/1.0 (fan project; polite, cached, 1 req/s)"

_session = requests.Session()
_session.headers["User-Agent"] = USER_AGENT
_last_request = 0.0


class FetchFailed(Exception):
    pass


def _cache_path(url: str, kind: str) -> Path:
    digest = hashlib.sha256(url.encode()).hexdigest()[:24]
    return CACHE_DIR / kind / digest


def _load_failures() -> dict:
    if FAILURES_FILE.exists():
        return json.loads(FAILURES_FILE.read_text())
    return {}


def _save_failure(url: str, reason: str) -> None:
    failures = _load_failures()
    failures[url] = {"reason": reason, "at": time.strftime("%Y-%m-%dT%H:%M:%S")}
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    FAILURES_FILE.write_text(json.dumps(failures, indent=2, ensure_ascii=False))


def failures() -> dict:
    return _load_failures()


def _throttle() -> None:
    global _last_request
    wait = MIN_INTERVAL - (time.monotonic() - _last_request)
    if wait > 0:
        time.sleep(wait)
    _last_request = time.monotonic()


MAX_REDIRECTS = 5


def _get_following_redirects(url: str) -> requests.Response:
    """GET with redirects followed manually, so every hop respects the rate limit."""
    for _ in range(MAX_REDIRECTS + 1):
        _throttle()
        resp = _session.get(url, timeout=TIMEOUT, allow_redirects=False)
        if resp.status_code in (301, 302, 303, 307, 308) and "Location" in resp.headers:
            url = requests.compat.urljoin(url, resp.headers["Location"])
            continue
        return resp
    raise requests.TooManyRedirects(url)


def fetch(url: str, kind: str = "html") -> bytes:
    return fetch_meta(url, kind)[0]


def fetch_meta(url: str, kind: str = "html") -> tuple[bytes, dict]:
    """Return (body, meta) for url, from cache if possible.

    meta: {"url", "final_url", "content_type"} — final_url differs from url when
    Wayback redirected to a different snapshot.

    kind: cache subdirectory ("html", "cdx", "img").
    Raises FetchFailed if the URL failed MAX_ATTEMPTS times (now or in a previous run)
    or returned a non-retryable status (e.g. 404).
    """
    path = _cache_path(url, kind)
    meta_path = path.with_suffix(".json")
    if path.exists():
        meta = json.loads(meta_path.read_text()) if meta_path.exists() else {"url": url, "final_url": url}
        return path.read_bytes(), meta

    known = _load_failures().get(url)
    if known:
        raise FetchFailed(f"previously failed: {known['reason']}")

    last_reason = ""
    for attempt in range(MAX_ATTEMPTS):
        if attempt:
            time.sleep(BACKOFF_BASE * 2 ** (attempt - 1))
        try:
            resp = _get_following_redirects(url)
        except requests.RequestException as exc:
            last_reason = f"{type(exc).__name__}: {exc}"
            continue
        if resp.status_code == 200:
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(".tmp")
            tmp.write_bytes(resp.content)
            tmp.replace(path)
            # keep a readable index of what each cache file is
            meta = {"url": url, "final_url": resp.url, "content_type": resp.headers.get("Content-Type")}
            meta_path.write_text(json.dumps(meta))
            with (path.parent / "_index.tsv").open("a") as idx:
                idx.write(f"{path.name}\t{url}\n")
            return resp.content, meta
        last_reason = f"HTTP {resp.status_code}"
        if resp.status_code == 429 or resp.status_code >= 500:
            retry_after = resp.headers.get("Retry-After")
            if retry_after and retry_after.isdigit():
                time.sleep(min(int(retry_after), 120))
            continue
        break  # 404 etc. — not retryable

    _save_failure(url, last_reason)
    raise FetchFailed(last_reason)
