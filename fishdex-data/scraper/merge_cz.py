"""Merge fishao.cz pages into the fishaowiki fish list.

fishaowiki stays the primary source for every top-level field. fishao.cz adds:
- names.cs / names.sk / names.es (and names.en_fishao_cz when it differs)
- has_glowing_variant / glowing_info — the page lists a "zářivá" (glowing) shop price
- image fallback when fishaowiki has no image
- raw page data in extra.fishao_cz, and a cross-source comparison for the report
"""

from __future__ import annotations

import difflib
import json
import re

from fetch import FetchFailed, fetch_meta

WAYBACK = "https://web.archive.org/web"
TARGET_TS = "20230718084642"
F_EN, F_CS, F_SK, F_ES = "Název / anglicky", "Název / česky", "Název / slovensky", "Název / španělsky"
F_PRICE, F_GLOW = "Cena v obchodě / maximální", "Cena v obchodě / zářivá"
F_STARS, F_TIME, F_AREA, F_LEN = "Výskyt / hvězdy", "Výskyt / čas", "Výskyt / oblast", "Délka / maximální"


def _int(v):
    m = re.fullmatch(r"\s*(\d+)\s*(?:měny|cm)?\s*", v or "")
    return int(m.group(1)) if m else None


def _parse_time(v):
    """'kdykoliv'/'Always' -> 'always'; '18:00 - 9:00' -> [{'from': '18:00', 'to': '09:00'}]; anything else -> None.
    Only zero-pads hours — no other interpretation ('?', '+' etc. stay unparsed)."""
    if v is None:
        return None
    if v.strip().lower() in ("always", "kdykoliv"):
        return "always"
    ranges = []
    for part in v.split(","):
        m = re.fullmatch(r"\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*", part)
        if not m:
            return None
        ranges.append({"from": f"{int(m.group(1)):02d}:{m.group(2)}", "to": f"{int(m.group(3)):02d}:{m.group(4)}"})
    return ranges


def _norm_time(v):
    parsed = _parse_time(v)
    return json.dumps(parsed) if parsed is not None else re.sub(r"\s+", "", v or "")


def _fill(f, field, value, raw_field, raw, wiki_raw):
    f[field] = value
    f[raw_field] = raw
    f["extra"].setdefault("filled_from", {})[field] = {
        "source": "fishao.cz",
        "reason": None,
        "wiki_raw": wiki_raw,
    }


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


def merge(fish_list, cz_pages, slugify, split_name, aliases, img_dir, image_ext, with_images):
    approved = aliases.get("fishao_cz", {})
    matched, unmatched, candidates = match_pages(cz_pages, fish_list, slugify, split_name, approved)
    validation = {"price": [], "rarity": [], "time": [], "length_vs_wr": [], "names_conflict": [], "names_resolved": [],
                  "filled_by_cz": {"max_price": 0, "rarity": 0, "time": 0}}
    image_failures = []

    for f in fish_list:
        pages = matched.get(f["id"], [])
        f["names"] = {"en": f["name"], "cs": None, "sk": None, "es": None}
        if not pages:
            f["extra"]["fishao_cz"] = None
            continue

        def distinct(field):
            return list(dict.fromkeys(p["fields"][field] for p in pages if p["fields"].get(field)))

        # older English-slug pages often carry the English name as an untranslated placeholder
        en_slugs = {slugify(split_name(n)[0]) for n in [f["name"], *f["extra"]["name_variants"], *distinct(F_EN)]}
        for lang, field in (("cs", F_CS), ("sk", F_SK), ("es", F_ES)):
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
        en_cz = distinct(F_EN)
        if en_cz and en_cz != [f["name"]]:
            f["names"]["en_fishao_cz"] = en_cz[0] if len(en_cz) == 1 else en_cz

        glow = distinct(F_GLOW)
        if glow:
            f["has_glowing_variant"] = True
            f["glowing_info"] = "fishao.cz — zářivá cena v obchodě: " + " / ".join(glow)

        f["extra"]["fishao_cz"] = [
            {k: p[k] for k in ("slug", "source_url", "snapshot_timestamp", "fields", "image_src",
                               "categories", "notes_raw")} | {"match": p["_match"]}
            for p in pages
        ]

        # ---- cross-validation (report only; wiki values are never overwritten)
        cz_price = {_int(v) for v in distinct(F_PRICE)} - {None}
        if f["max_price"] is not None and cz_price and f["max_price"] not in cz_price:
            validation["price"].append((f["id"], f["max_price"], sorted(cz_price)))
        cz_stars = {len(v) for v in distinct(F_STARS) if re.fullmatch(r"\*+", v)}
        if f["rarity"] is not None and cz_stars and f["rarity"] not in cz_stars:
            validation["rarity"].append((f["id"], f["rarity"], sorted(cz_stars)))
        cz_time = {_norm_time(v) for v in distinct(F_TIME)}
        if f["time_raw"] is not None and cz_time and _norm_time(f["time_raw"]) not in cz_time:
            validation["time"].append((f["id"], f["time_raw"], distinct(F_TIME)))

        # ---- fill wiki gaps (null because missing, unparseable or conflicting between wiki tables);
        # only when all fishao.cz pages for the fish agree and the value parses
        def gap_reason(name):
            return "wiki_conflict" if name in f["extra"]["conflicts"] else "wiki_missing"

        raw = distinct(F_PRICE)
        if f["max_price"] is None and len(raw) == 1 and _int(raw[0]) is not None:
            reason = gap_reason("Max Price")
            _fill(f, "max_price", _int(raw[0]), "max_price_raw", raw[0], f["max_price_raw"])
            f["extra"]["filled_from"]["max_price"]["reason"] = reason
            validation["filled_by_cz"]["max_price"] += 1
        raw = distinct(F_STARS)
        if f["rarity"] is None and len(raw) == 1 and re.fullmatch(r"\*{1,5}", raw[0]):
            reason = gap_reason("rarity")
            _fill(f, "rarity", len(raw[0]), "rarity_raw", raw[0], f["rarity_raw"])
            f["extra"]["filled_from"]["rarity"]["reason"] = reason
            validation["filled_by_cz"]["rarity"] += 1
        raw = distinct(F_TIME)
        if f["time_raw"] is None and len(raw) == 1 and _parse_time(raw[0]) is not None:
            reason = gap_reason("Time")
            _fill(f, "time", _parse_time(raw[0]), "time_raw", raw[0], None)
            f["extra"]["filled_from"]["time"]["reason"] = reason
            validation["filled_by_cz"]["time"] += 1
        cz_len = {_int(v) for v in distinct(F_LEN)} - {None}
        if f["world_record_cm"] is not None and cz_len and f["world_record_cm"] not in cz_len:
            validation["length_vs_wr"].append((f["id"], f["world_record_cm"], sorted(cz_len)))

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
