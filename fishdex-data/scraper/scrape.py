"""Scrape the archived fishaowiki.com fishdex tables into data/fish.json + data/areas.json.

Run:  .venv/bin/python scrape.py            (everything; resumable, all fetches cached)
      .venv/bin/python scrape.py --no-images

The wiki has no per-fish pages: every fish is a row in TablePress tables on five
pages. One fish can appear in several tables (one per area + 5-star + all-in-one).
Each row is kept verbatim in extra.occurrences (minus the price column, which is
deliberately dropped); top-level fields are filled only where all occurrences agree,
otherwise null + extra.conflicts.
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, urlsplit

from bs4 import BeautifulSoup

import fishao_cz
import manual
import merge_cz
import resolve
from baitfmt import canonical as bait_canonical, norm_bait
from fetch import FetchFailed, failures, fetch, fetch_meta
from seasonfmt import norm_season, parse_season
from timefmt import norm_time, parse_time

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
IMG_DIR = ROOT / "images" / "fish"
ALIASES_FILE = Path(__file__).resolve().parent / "aliases.json"

TARGET = datetime(2023, 7, 18, 8, 46, 42)
WAYBACK = "https://web.archive.org/web"
CDX = "https://web.archive.org/cdx/search/cdx"

# page key -> (path, kind of areas the page's sections are, or None if not an area page)
PAGES = {
    "area-fish": ("fishdex/area-fish/", "area"),
    "tournament-fish": ("fishdex/tournament-fish/", "tournament"),
    "breeder-fish": ("fishdex/breeder-fish/", "backyard"),
    "5-star-fish": ("fishdex/5-star-fish/", None),
    "all-in-one": ("fishdex/all-in-one/", None),
}
# order in which sources are preferred when choosing a display value
SOURCE_ORDER = ["all-in-one", "area-fish", "5-star-fish", "breeder-fish", "tournament-fish"]
IMAGE_SOURCE_ORDER = ["area-fish", "5-star-fish", "breeder-fish", "tournament-fish"]

DROPPED_COLUMN = "Max Price"  # prices are deliberately not part of the dataset
STAR_RE = re.compile(r"^([1-5])star\.png$")
UNLOCKABLE_RE = re.compile(r"\s+Unlockable$", re.I)
PAREN_RE = re.compile(r"\(([^)]*)\)?")


# ---------------------------------------------------------------- helpers

def ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = s.lower().replace("'", "").replace("’", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def split_name(raw: str) -> tuple[str, list[str]]:
    """'Arctic Char (Raft only)' -> ('Arctic Char', ['Raft only']); 'X Unlockable' -> ('X', ['Unlockable'])."""
    name = ws(raw)
    qualifiers = [ws(q) for q in PAREN_RE.findall(name)]
    name = ws(PAREN_RE.sub("", name))
    if UNLOCKABLE_RE.search(name):
        name = UNLOCKABLE_RE.sub("", name)
        qualifiers.append("Unlockable")
    return name, qualifiers


def parse_ts(ts: str) -> datetime:
    return datetime.strptime(ts[:14].ljust(14, "0"), "%Y%m%d%H%M%S")


def closest(timestamps: list[str]) -> str | None:
    return min(timestamps, key=lambda t: abs((parse_ts(t) - TARGET).total_seconds())) if timestamps else None


def url_key(u: str) -> str:
    """Host/scheme/port-insensitive key for matching wiki URLs with CDX originals."""
    parts = urlsplit(u.strip())
    return parts.path + (f"?{parts.query}" if parts.query else "")


def cdx(params: str) -> list[list[str]]:
    rows = json.loads(fetch(f"{CDX}?{params}&output=json", "cdx") or b"[]")
    return rows[1:] if rows else []


# ---------------------------------------------------------------- discovery

def discover() -> dict:
    all_rows = cdx("url=fishaowiki.com/*&filter=statuscode:200&collapse=urlkey")
    snapshots = {}
    for key, (path, _) in PAGES.items():
        rows = cdx(f"url=fishaowiki.com/{path}&filter=statuscode:200&fl=timestamp,original")
        ts = closest([r[0] for r in rows])
        snapshots[key] = {
            "source_url": f"http://fishaowiki.com/{path}",
            "snapshot_timestamp": ts,
            "captures": len(rows),
        }
    uploads = defaultdict(list)
    for original, ts, mime in cdx("url=fishaowiki.com/wp-content/uploads/*&filter=statuscode:200&fl=original,timestamp,mimetype"):
        uploads[url_key(original)].append((ts, original, mime))
    return {"cdx_rows": all_rows, "snapshots": snapshots, "uploads": uploads}


# ---------------------------------------------------------------- parsing

def parse_page(key: str, snap: dict) -> tuple[list[dict], list[dict], list[str]]:
    """Return (occurrences, sections, notes) for one table page."""
    ts = snap["snapshot_timestamp"]
    html = fetch(f"{WAYBACK}/{ts}id_/{snap['source_url']}")
    soup = BeautifulSoup(html, "lxml")
    notes = []
    occurrences, sections = [], []
    for table in soup.select("table.tablepress"):
        h2 = table.find_previous("h2")
        section = ws(h2.get_text(" ")) if h2 else None
        headers = [ws(th.get_text(" ")) for th in table.select("thead th")]
        sections.append({"page": key, "heading": section, "table_id": table.get("id"), "headers": headers})
        for tr in table.select("tbody tr"):
            cells = tr.find_all("td")
            if len(cells) != len(headers):
                notes.append(f"{key} / {section}: row with {len(cells)} cells vs {len(headers)} headers: {ws(tr.get_text(' '))[:80]}")
            row = {h: ws(c.get_text(" ")) for h, c in zip(headers, cells)}
            row.pop(DROPPED_COLUMN, None)
            first = cells[0]
            strong = first.find("strong")
            name_raw = ws(strong.get_text(" ")) if strong else row.get("Fish", "")
            imgs = [i.get("src", "") for i in first.find_all("img")]
            star_imgs = [s for s in imgs if STAR_RE.match(s.rsplit("/", 1)[-1])]
            fish_imgs = [s for s in imgs if s not in star_imgs]
            for c in cells[1:]:
                if c.find(["img", "a"]):
                    notes.append(f"{key} / {section}: unexpected markup in cell for {name_raw!r}: {str(c)[:120]}")
            occurrences.append({
                "page": key,
                "section": section,
                "table_id": table.get("id"),
                "source_url": snap["source_url"],
                "snapshot_timestamp": ts,
                "name_raw": name_raw,
                "cells": row,
                "fish_images": fish_imgs,
                "star_images": [s.rsplit("/", 1)[-1] for s in star_imgs],
            })
    return occurrences, sections, notes


# ---------------------------------------------------------------- aliases

def load_aliases() -> dict:
    if ALIASES_FILE.exists():
        return json.loads(ALIASES_FILE.read_text())
    return {"fish": {}, "areas": {}, "candidates": {"fish": [], "areas": []}}


def alias_candidates_fish(groups: dict) -> list[dict]:
    keys = sorted(groups)
    out = []
    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            r = difflib.SequenceMatcher(None, a, b).ratio()
            if r < 0.85:
                continue
            pa = {o["page"] for o in groups[a]}
            pb = {o["page"] for o in groups[b]}
            out.append({
                "a": a, "b": b, "ratio": round(r, 3),
                "a_names": sorted({o["name_raw"] for o in groups[a]}),
                "b_names": sorted({o["name_raw"] for o in groups[b]}),
                "a_pages": sorted(pa), "b_pages": sorted(pb),
                # complementary = each lives where the other is missing: strong duplicate signal
                "complementary": ("all-in-one" in pa) != ("all-in-one" in pb),
            })
    return sorted(out, key=lambda c: (not c["complementary"], -c["ratio"]))


# ---------------------------------------------------------------- field building

def agreed(values: list[tuple[str, str]], norm) -> tuple[str | None, list[str]]:
    """values: [(page, raw)] in preference order. Returns (raw of preferred source or None, distinct raws)."""
    present = [(p, v) for p, v in values if v is not None]
    distinct = list(dict.fromkeys(v for _, v in present))
    if not present:
        return None, []
    if len({norm(v) for _, v in present}) == 1:
        return present[0][1], distinct
    return None, distinct


def norm_text(v: str) -> str:
    return re.sub(r"\s+", "", v).lower()


def int_or_none(raw: str | None, pattern: str):
    if raw is None:
        return None
    m = re.fullmatch(pattern, raw.strip())
    return int(m.group(1)) if m else None


def by_source(occs: list[dict]) -> list[dict]:
    return sorted(occs, key=lambda o: SOURCE_ORDER.index(o["page"]))


# ---------------------------------------------------------------- images

def resolve_image(src: str, uploads: dict) -> list[tuple[str, str]]:
    """Candidate (wayback_url, note) list for a raw <img src>, best first. Raw src first, cleaned variants after."""
    variants = [(src, None)]
    cleaned = re.sub(r"\s.*$", "", src.strip())  # e.g. 'X.png class=' (broken attribute in source)
    cleaned = re.sub(r"(?<!:)//+", "/", cleaned)
    if cleaned != src:
        variants.append((cleaned, f"src cleaned from {src!r}"))
    out = []
    for v, note in variants:
        caps = uploads.get(url_key(v)) or uploads.get(url_key(quote(v, safe=":/%")))
        if caps:
            ts = closest([c[0] for c in caps])
            original = next(c[1] for c in caps if c[0] == ts)
            out.append((f"{WAYBACK}/{ts}im_/{original}", note))
        else:
            # not in CDX listing — let Wayback redirect to whatever it has
            out.append((f"{WAYBACK}/{TARGET:%Y%m%d%H%M%S}im_/{v}", (note + "; " if note else "") + "not in CDX"))
    return out


def image_ext(body: bytes) -> str | None:
    if body.startswith(b"\x89PNG"):
        return "png"
    if body[:3] == b"\xff\xd8\xff":
        return "jpg"
    if body[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if body[:4] == b"RIFF" and body[8:12] == b"WEBP":
        return "webp"
    return None


def download_image(fish_id: str, srcs: list[str], uploads: dict, log: list) -> tuple[str | None, str | None, dict]:
    """Try each distinct src; first success becomes the fish image. Returns (local path, timestamp, info)."""
    info = {"tried": []}
    for src in srcs:
        for url, note in resolve_image(src, uploads):
            try:
                body, meta = fetch_meta(url, "img")
            except FetchFailed as exc:
                info["tried"].append({"src": src, "url": url, "error": str(exc), "note": note})
                continue
            ext = image_ext(body)
            if not ext:
                info["tried"].append({"src": src, "url": url, "error": f"not an image ({meta.get('content_type')})", "note": note})
                continue
            dest = IMG_DIR / f"{fish_id}.{ext}"
            for old in IMG_DIR.glob(f"{fish_id}.*"):
                if old != dest:
                    old.unlink()
            if not dest.exists() or dest.read_bytes() != body:
                dest.write_bytes(body)
            m = re.search(r"/web/(\d{14})", meta.get("final_url") or url)
            info.update({"src": src, "wayback_url": meta.get("final_url") or url, "note": note,
                         "sha256": hashlib.sha256(body).hexdigest()[:16]})
            return f"images/fish/{dest.name}", m.group(1) if m else None, info
    log.append({"fish_id": fish_id, **info})
    return None, None, info


# ---------------------------------------------------------------- main build

def build(with_images: bool) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    disc = discover()
    snaps = disc["snapshots"]
    aliases = load_aliases()
    notes: list[str] = []

    occurrences, sections = [], []
    for key in PAGES:
        o, s, n = parse_page(key, snaps[key])
        occurrences += o
        sections += s
        notes += n

    # ---- areas: one per table section on area pages
    areas: dict[str, dict] = {}
    section_area: dict[tuple, str] = {}
    for s in sections:
        kind = PAGES[s["page"]][1]
        if not kind:
            continue
        name = "Backyard" if kind == "backyard" else s["heading"]
        aid = slugify(name)
        if aid in areas:
            notes.append(f"area id collision: {aid!r} ({s['heading']!r} on {s['page']})")
        areas[aid] = {
            "id": aid, "name": name, "kind": kind, "heading_raw": s["heading"],
            "description": None, "fish_ids": [], "image": None,
            "source_url": snaps[s["page"]]["source_url"],
            "snapshot_timestamp": snaps[s["page"]]["snapshot_timestamp"],
            "table_id": s["table_id"], "columns": s["headers"],
        }
        section_area[(s["page"], s["table_id"])] = aid

    # lookup for free-text Area column (all-in-one, 5-star): exact match after removing (...) and case
    area_lookup = {}
    for a in areas.values():
        for n in {a["name"], a["heading_raw"], split_name(a["heading_raw"])[0]}:
            area_lookup[n.lower()] = a["id"]
    for raw, target in aliases.get("areas", {}).items():
        area_lookup[raw.lower()] = target

    # ---- group occurrences into fish
    groups: dict[str, list] = defaultdict(list)
    for o in occurrences:
        name, quals = split_name(o["name_raw"])
        o["name"], o["qualifiers"] = name, quals
        o["key"] = slugify(name)
        groups[o["key"]].append(o)

    candidates = alias_candidates_fish(groups)
    fish_alias = aliases.get("fish", {})
    for k in list(groups):
        target = fish_alias.get(k)
        if target and target != k:
            if target not in groups:
                notes.append(f"alias target {target!r} for {k!r} does not exist")
                continue
            groups[target] += groups.pop(k)

    unmatched_area_tokens: Counter = Counter()
    fish_list = []
    image_failures = []
    for fid in sorted(groups):
        occs = by_source(groups[fid])
        # same key twice in one table = possible id collision
        per_table = Counter((o["page"], o["table_id"]) for o in occs)
        for (page, tid), c in per_table.items():
            if c > 1:
                notes.append(f"fish {fid!r} appears {c}x in {page} table {tid}: "
                             + ", ".join(repr(o["name_raw"]) for o in occs if o["table_id"] == tid))

        # areas: membership in area tables + exact matches from Area text columns
        area_sources: dict[str, set] = defaultdict(set)
        for o in occs:
            aid = section_area.get((o["page"], o["table_id"]))
            if aid:
                area_sources[aid].add(o["page"])
            if "Area" in o["cells"]:
                for tok in [ws(t) for t in o["cells"]["Area"].split(",") if ws(t)]:
                    base = split_name(tok)[0].lower()
                    aid2 = area_lookup.get(tok.lower()) or area_lookup.get(base)
                    if aid2:
                        area_sources[aid2].add(f"{o['page']}:Area")
                    else:
                        unmatched_area_tokens[tok] += 1

        # some rows have Season and Time swapped (a time range in the Season column)
        for o in occs:
            sv, tv = o["cells"].get("Season"), o["cells"].get("Time")
            if sv and isinstance(parse_time(sv), list) and not isinstance(parse_time(tv), list):
                o["fix"] = {"swapped": "Season<->Time", "Season": sv, "Time": tv}
                o["cells"]["Season"], o["cells"]["Time"] = tv, sv
                notes.append(f"{fid}: Season/Time swapped in {o['page']} row ({sv!r} / {tv!r})")

        def col(name):
            return [(o["page"], o["cells"].get(name)) for o in occs]

        conflicts = {}

        def field(name, norm=norm_text):
            raw, distinct = agreed(col(name), norm)
            if raw is None and len(distinct) > 1:
                conflicts[name] = distinct
            return raw

        bait_raw = field("Bait", norm_bait)
        time_raw = field("Time", norm_time)
        season_raw = field("Season", norm_season)

        # rarity: Stars column (all-in-one) + star images
        star_vals = [(o["page"], o["cells"]["Stars"]) for o in occs if "Stars" in o["cells"]]
        star_vals += [(o["page"], s) for o in occs for s in o["star_images"]]
        rarity_raw, rdistinct = agreed(star_vals, lambda v: STAR_RE.sub(r"\1", v))
        if rarity_raw is None and len(rdistinct) > 1:
            conflicts["rarity"] = rdistinct
        rarity = int_or_none(STAR_RE.sub(r"\1", rarity_raw) if rarity_raw else None, r"([1-5])")

        names = list(dict.fromkeys(o["name"] for o in occs))
        img_srcs = list(dict.fromkeys(s for p in IMAGE_SOURCE_ORDER for o in occs if o["page"] == p for s in o["fish_images"]))

        image = image_ts = None
        img_info = None
        if with_images and img_srcs:
            image, image_ts, img_info = download_image(fid, img_srcs, disc["uploads"], image_failures)
        elif not with_images:
            existing = sorted(IMG_DIR.glob(f"{fid}.*"))
            image = f"images/fish/{existing[0].name}" if existing else None

        extra = {
            "name_variants": sorted({o["name_raw"] for o in occs}),
            "qualifiers": sorted({q for o in occs for q in o["qualifiers"]}),
            "area_sources": {a: sorted(s) for a, s in sorted(area_sources.items())},
            "image_sources": img_srcs,
            "image_snapshot_timestamp": image_ts,
            "conflicts": conflicts,
            "occurrences": [
                {k: o[k] for k in ("page", "section", "table_id", "source_url", "snapshot_timestamp",
                                   "name_raw", "cells", "fish_images", "star_images", "fix") if k in o}
                for o in occs
            ],
        }
        for colname in ("Pool", "Home points"):
            vals = list(dict.fromkeys(o["cells"][colname] for o in occs if colname in o["cells"]))
            if vals:
                extra[colname.lower().replace(" ", "_")] = vals[0] if len(vals) == 1 else vals
        if img_info and img_info.get("note"):
            extra["image_note"] = img_info["note"]
        extra["image_source"] = "fishaowiki" if image else None

        first = occs[0]
        fish_list.append({
            "id": fid,
            "name": names[0],
            "names": None,  # filled by merge_cz: {en, cs, sk, es}
            "areas": sorted(area_sources),
            "time": parse_time(time_raw),
            "time_raw": time_raw,
            "season": parse_season(season_raw),
            "season_raw": season_raw,
            "rarity": rarity,
            "rarity_raw": rarity_raw,
            "bait": bait_canonical(bait_raw)[0] if bait_raw is not None else None,
            "bait_raw": bait_raw,
            "max_length_cm": None,  # filled by merge_cz: {min, max} over wiki World record + fishao.cz max length
            "max_length_raw": None,
            "has_glowing_variant": None,
            "glowing_info": None,
            "image": image,
            "image_glowing": None,
            "source_url": first["source_url"],
            "snapshot_timestamp": first["snapshot_timestamp"],
            "extra": extra,
        })

    # ---- second source: fishao.cz (names, glowing variant, lengths, image fallback, validation)
    cz_pages = fishao_cz.run()
    cz = merge_cz.merge(fish_list, cz_pages, slugify, split_name, aliases, IMG_DIR, image_ext, with_images)

    # ---- rule-based resolution of remaining time / season / bait conflicts
    resolve_stats: dict = {}
    for f in fish_list:
        resolve.resolve(f, resolve_stats)
    unknown_bait = Counter(t for f in fish_list for o in f["extra"]["occurrences"]
                           for t in bait_canonical(o["cells"].get("Bait") or "")[1])
    for t, n in unknown_bait.items():
        notes.append(f"bait token not in vocabulary (kept as-is): {t!r} ({n}x)")
    cz["resolve_stats"] = resolve_stats

    # ---- human-filled values from manual/resolutions.csv
    man = manual.run(fish_list)

    if with_images:
        ids = {f["id"] for f in fish_list}
        for img in IMG_DIR.iterdir():
            if img.stem not in ids:
                notes.append(f"removed orphan image {img.name} (fish id no longer exists)")
                img.unlink()

    for f in fish_list:
        for a in f["areas"]:
            areas[a]["fish_ids"].append(f["id"])

    (DATA_DIR / "fish.json").write_text(json.dumps(fish_list, indent=2, ensure_ascii=False) + "\n")
    (DATA_DIR / "areas.json").write_text(json.dumps(list(areas.values()), indent=2, ensure_ascii=False) + "\n")

    new_candidates = {
        "fish": candidates,
        "areas": sorted(unmatched_area_tokens),
        "fishao_cz": cz["candidates"],
    }
    if not ALIASES_FILE.exists() or aliases.get("candidates") != new_candidates:
        for k in ("fish", "areas", "fishao_cz"):
            aliases.setdefault(k, {})
        aliases["candidates"] = new_candidates
        ALIASES_FILE.write_text(json.dumps(aliases, indent=2, ensure_ascii=False) + "\n")

    from report import write_report
    write_report(DATA_DIR / "report.md", fish_list, list(areas.values()), snaps, disc, sections,
                 notes, unmatched_area_tokens, candidates, aliases, image_failures, failures(), with_images, cz, man)
    print(f"fish: {len(fish_list)}  areas: {len(areas)}  images: {sum(1 for f in fish_list if f['image'])}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-images", action="store_true", help="skip image downloads (use already downloaded files)")
    build(with_images=not ap.parse_args().no_images)
