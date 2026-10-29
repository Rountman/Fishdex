"""Merge fishao.cz pages into the fishaowiki fish list.

fishaowiki stays the primary source for every top-level field. fishao.cz adds:
- names.cs (and names.en_fishao_cz when it differs); sk/es stay only in extra.fishao_cz
- has_glowing_variant / glowing_info — the page lists a "zářivá" (glowing) shop price row
- max_length_cm {min, max} over wiki World record + fishao.cz "Délka / maximální"
- rarity where the wiki has none (or its tables conflict) and fishao.cz pages agree
- names.cs falls back to English when no Czech name exists (extra.names_fallback)
- image fallback when fishaowiki has no image
- raw page data in extra.fishao_cz, and a cross-source comparison for the report
"""

from __future__ import annotations

import difflib
import re

from fetch import FetchFailed, fetch_meta
from timefmt import norm_time

WAYBACK = "https://web.archive.org/web"
TARGET_TS = "20230718084642"
F_EN, F_CS, F_SK, F_ES = "Název / anglicky", "Název / česky", "Název / slovensky", "Název / španělsky"
F_STARS, F_TIME, F_AREA, F_LEN = "Výskyt / hvězdy", "Výskyt / čas", "Výskyt / oblast", "Délka / maximální"


def _int(v):
    m = re.fullmatch(r"\s*(\d+)\s*(?:cm)?\s*", v or "")
    return int(m.group(1)) if m else None


def _fill(f, field, value, raw_field, raw, reason):
    f[field] = value
    f[raw_field] = raw
    f["extra"].setdefault("filled_from", {})[field] = {"source": "fishao.cz", "reason": reason}


def _length(f, pages):
    """max_length_cm = {min, max} over every numeric source value; raw values kept with their sources."""
    raws = []
    for o in f["extra"]["occurrences"]:
        v = o["cells"].get("World record")
        if v:
            raws.append((v, f"fishaowiki {o['page']}" + (f"/{o['section']}" if o.get("section") and o["page"] != "5-star-fish" else "")))
    for p in pages:
        v = p["fields"].get(F_LEN)
        if v:
            raws.append((v, f"fishao.cz {p['slug']}"))
    grouped = {}
    for v, src in raws:
        grouped.setdefault(v, []).append(src)
    nums = [n for n in (_int(v) for v, _ in raws) if n is not None]
    f["max_length_cm"] = {"min": min(nums), "max": max(nums)} if nums else None
    f["max_length_raw"] = [{"value": v, "sources": srcs} for v, srcs in grouped.items()] or None
    # display form; user decision: a disagreement shows the whole range in brackets followed by '?'
    if not nums:
        f["max_length_label"] = None
    elif min(nums) == max(nums):
        f["max_length_label"] = f"{min(nums)} cm"
    else:
        f["max_length_label"] = f"({min(nums)}–{max(nums)} cm)?"
        f["uncertain"].append("max_length")


def match_pages(pages, fish_list, slugify, split_name, approved: dict):
    """Return ({fish_id: [page]}, unmatched_pages, candidates)."""
    lookup = {}
    for f in fish_list:
        lookup[f["id"]] = f["id"]
        for nv in f["extra"]["name_variants"]:
            lookup.setdefault(slugify(split_name(nv)[0]), f["id"])
    matched, unmatched = {}, []
    for p in pages:
        en = p["fields"].get(F_EN)
        keys = [approved.get(p["slug"])]
        if en:
            keys.append(slugify(split_name(en)[0]))
        keys.append(slugify(p["slug"]))
        fid = next((lookup[k] for k in keys if k and k in lookup), None)
        if fid:
            p["_match"] = "approved alias" if keys[0] else ("english name" if en and slugify(split_name(en)[0]) in lookup else "url slug")
            matched.setdefault(fid, []).append(p)
        else:
            unmatched.append(p)
    free = [f["id"] for f in fish_list if f["id"] not in matched]
    candidates = []
    for p in unmatched:
        key = slugify(split_name(p["fields"].get(F_EN) or p["slug"])[0])
        best = difflib.get_close_matches(key, free, n=2, cutoff=0.8)
        if best:
            candidates.append({"fishao_cz_slug": p["slug"], "en": p["fields"].get(F_EN),
                               "cs": p["fields"].get(F_CS), "wiki_ids": best})
    return matched, unmatched, candidates


def download_cz_image(fish_id, page, img_dir, image_ext):
    src = page.get("image_src")
    if not src:
        return None, None
    url = f"{WAYBACK}/{TARGET_TS}im_/https://www.fishao.cz{src}" if src.startswith("/") else f"{WAYBACK}/{TARGET_TS}im_/{src}"
    try:
        body, meta = fetch_meta(url, "img")
    except FetchFailed:
        return None, {"url": url, "error": "fetch failed"}
    ext = image_ext(body)
    if not ext:
        return None, {"url": url, "error": f"not an image ({meta.get('content_type')})"}
    dest = img_dir / f"{fish_id}.{ext}"
    if not dest.exists() or dest.read_bytes() != body:
        dest.write_bytes(body)
    m = re.search(r"/web/(\d{14})", meta.get("final_url") or url)
    return f"images/fish/{dest.name}", {"url": meta.get("final_url") or url, "timestamp": m.group(1) if m else None}


def _cs_fallback(f):
    """User decision: a fish without a Czech name shows the English one."""
    if f["names"]["cs"] is None:
        f["names"]["cs"] = f["names"]["en"]
        f["extra"]["names_fallback"] = {"cs": "en"}


def merge(fish_list, cz_pages, slugify, split_name, aliases, img_dir, image_ext, with_images):
    approved = aliases.get("fishao_cz", {})
    matched, unmatched, candidates = match_pages(cz_pages, fish_list, slugify, split_name, approved)
    validation = {"rarity": [], "time": [], "length_range": [], "names_conflict": [], "names_resolved": [],
                  "filled_by_cz": {"rarity": 0}}
    image_failures = []

    for f in fish_list:
        pages = matched.get(f["id"], [])
        f["names"] = {"en": f["name"], "cs": None}
        _length(f, pages)
        if f["max_length_cm"] and f["max_length_cm"]["min"] != f["max_length_cm"]["max"]:
            validation["length_range"].append((f["id"], f["max_length_cm"], f["max_length_raw"]))
        if not pages:
            f["extra"]["fishao_cz"] = None
            _cs_fallback(f)
            continue

        def distinct(field):
            return list(dict.fromkeys(p["fields"][field] for p in pages if p["fields"].get(field)))

        # older English-slug pages often carry the English name as an untranslated placeholder
        en_slugs = {slugify(split_name(n)[0]) for n in [f["name"], *f["extra"]["name_variants"], *distinct(F_EN)]}
        for lang, field in (("cs", F_CS),):
            vals = distinct(field)
            if len(vals) == 1:
                f["names"][lang] = vals[0]
            elif len(vals) > 1:
                translated = [v for v in vals if slugify(split_name(v)[0]) not in en_slugs]
                if len(translated) == 1:
                    f["names"][lang] = translated[0]
                    validation["names_resolved"].append((f["id"], lang, vals, translated[0]))
                else:
                    validation["names_conflict"].append((f["id"], lang, vals))
        if f["names"]["cs"] is None:
            vals = distinct(F_CS)
            # Czech orthography: 'ú' only starts a word, inside a word it is 'ů' -> 'Doviúv' is a typo of 'Doviův'
            ok = [v for v in vals if not re.search(r"\wú", v)]
            if len(vals) > 1 and len(ok) == 1 and all(v.replace("ú", "ů") == ok[0] for v in vals if v != ok[0]):
                f["names"]["cs"] = ok[0]
                validation["names_conflict"] = [c for c in validation["names_conflict"] if c[:2] != (f["id"], "cs")]
                validation["names_resolved"].append((f["id"], "cs", vals, ok[0]))
        en_cz = distinct(F_EN)
        if en_cz and en_cz != [f["name"]]:
            f["names"]["en_fishao_cz"] = en_cz[0] if len(en_cz) == 1 else en_cz

        if any(p["glowing_listed"] for p in pages):
            f["has_glowing_variant"] = True
            f["glowing_info"] = "fishao.cz uvádí zářivou variantu"

        f["extra"]["fishao_cz"] = [
            {k: p[k] for k in ("slug", "source_url", "snapshot_timestamp", "fields", "image_src",
                               "categories", "notes_raw", "glowing_listed")} | {"match": p["_match"]}
            for p in pages
        ]

        # ---- cross-validation (report only; wiki values are never overwritten)
        cz_stars = {len(v) for v in distinct(F_STARS) if re.fullmatch(r"\*+", v)}
        if f["rarity"] is not None and cz_stars and f["rarity"] not in cz_stars:
            validation["rarity"].append((f["id"], f["rarity"], sorted(cz_stars)))
        cz_time = {norm_time(v) for v in distinct(F_TIME)}
        if f["time_raw"] is not None and cz_time and norm_time(f["time_raw"]) not in cz_time:
            validation["time"].append((f["id"], f["time_raw"], distinct(F_TIME)))

        # ---- fill wiki gaps (null because missing, unparseable or conflicting between wiki tables);
        # only when all fishao.cz pages for the fish agree and the value parses
        def gap_reason(name):
            return "wiki_conflict" if name in f["extra"]["conflicts"] else "wiki_missing"

        raw = distinct(F_STARS)
        if f["rarity"] is None and len(raw) == 1 and re.fullmatch(r"\*{1,5}", raw[0]):
            _fill(f, "rarity", len(raw[0]), "rarity_raw", raw[0], gap_reason("rarity"))
            validation["filled_by_cz"]["rarity"] += 1

        _cs_fallback(f)

        # ---- image fallback
        if with_images and not f["image"]:
            for p in pages:
                path, info = download_cz_image(f["id"], p, img_dir, image_ext)
                if path:
                    f["image"] = path
                    f["extra"]["image_source"] = "fishao.cz"
                    f["extra"]["image_snapshot_timestamp"] = info["timestamp"]
                    f["extra"]["image_wayback_url"] = info["url"]
                    break
                if info:
                    image_failures.append({"fish_id": f["id"], **info})

    cz_areas = sorted({a.strip() for p in cz_pages for a in (p["fields"].get(F_AREA) or "").split("|") if a.strip()})
    return {
        "matched_fish": len(matched),
        "matched_pages": sum(len(v) for v in matched.values()),
        "multi_page": {k: [p["slug"] for p in v] for k, v in matched.items() if len(v) > 1},
        "unmatched": unmatched,
        "candidates": candidates,
        "validation": validation,
        "image_failures": image_failures,
        "cz_area_names": cz_areas,
        "pages_total": len(cz_pages),
    }
