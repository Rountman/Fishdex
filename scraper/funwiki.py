"""Third source: fishaofunwiki.com — a live community wiki (2026), newer than both archived sites.

The site is a single-page app; its fish list is embedded in the JS bundle as JSON.parse(`[...]`).
/api/fish-data only holds ~30 community edits that copy maxLength into an empty `record`, so it is
not used.

What it adds (user decisions 2026-10-30):
- length_cm {min, avg, max} — the catch length range, no other source has it
- fills values our sources lack (time, world record)
- resolves fields marked uncertain ('?') for time / season / bait: its value replaces ours, '?' goes
- certain fields are never overwritten; disagreements are only listed in the report
Raw row in extra.fishaofunwiki, every decision in extra.filled_from.<field>.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from baitfmt import canonical
from fetch import fetch
from seasonfmt import parse_season
from timefmt import parse_time

BASE = "https://www.fishaofunwiki.com"
SOURCE = "fishaofunwiki"
ARRAY_START = 'JSON.parse(`[{"name":'
FIELDS = ("name", "slug", "fishId", "area", "stars", "bait", "season", "time", "record",
          "minLength", "avgLength", "maxLength")


def run() -> list[dict]:
    html = fetch(BASE + "/", "funwiki").decode()
    m = re.search(r'src="(/assets/index-[^"]+\.js)"', html)
    if not m:
        raise RuntimeError("fishaofunwiki: app bundle not found on the home page")
    js = fetch(BASE + m.group(1), "funwiki").decode()
    i = js.index(ARRAY_START) + len("JSON.parse(`")
    rows = json.loads(js[i:js.index("`)", i)])
    return [{k: r.get(k) for k in FIELDS} | {"source_url": BASE + "/"} for r in rows]


def _key(s: str) -> str:
    """Slug without separators: 'barnard-s-lanterfish' and 'barnards-lanterfish' meet."""
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _int(v) -> int | None:
    m = re.fullmatch(r"\s*(\d+)\s*(?:cm)?\s*", v or "") if isinstance(v, str) else None
    return int(m.group(1)) if m else v if isinstance(v, int) else None


def _bait(raw: list[str]):
    toks = canonical(", ".join(raw))[0]
    return toks or None


PARSE = {"time": parse_time, "season": parse_season, "bait": _bait}
RAW_ATTR = {"time": "time_raw", "season": "season_raw", "bait": "bait_raw"}


def _same(field: str, a, b) -> bool:
    if field == "bait" and a is not None and b is not None:
        return sorted(a) == sorted(b)
    return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


def _raw(field: str, row: dict) -> str:
    return ", ".join(row["bait"]) if field == "bait" else row[field]


def merge(fish_list: list[dict], rows: list[dict], slugify) -> dict:
    by_key = {}
    for f in fish_list:
        for k in [f["id"], *(slugify(n) for n in f["extra"]["name_variants"])]:
            by_key.setdefault(_key(k), f)
    stats: dict = {}
    differences: list[dict] = []
    unmatched = []

    def note(f, field, rule, prev):
        f["extra"].setdefault("filled_from", {})[field] = {"source": SOURCE, "rule": rule, "previous": prev}
        stats[(field, rule)] = stats.get((field, rule), 0) + 1

    matched = set()
    for row in rows:
        f = by_key.get(_key(row["slug"] or "")) or by_key.get(_key(slugify(row["name"])))
        if not f or f["id"] in matched:
            unmatched.append(row)
            continue
        matched.add(f["id"])
        f["extra"][SOURCE] = row

        lens = [row["minLength"], row["avgLength"], row["maxLength"]]
        f["length_cm"] = ({"min": lens[0], "avg": lens[1], "max": lens[2]}
                          if all(isinstance(n, int) for n in lens) and lens[0] <= lens[1] <= lens[2] else None)

        record = _int(row["record"])
        if f["max_length_cm"] is None and record is not None:
            f["max_length_cm"] = {"min": record, "max": record}
            f["max_length_label"] = f"{record} cm"
            f["max_length_raw"] = [{"value": row["record"], "sources": [SOURCE]}]
            note(f, "max_length", "fill", None)
        elif record is not None and not f["max_length_cm"]["min"] <= record <= f["max_length_cm"]["max"]:
            differences.append({"id": f["id"], "field": "max_length", "ours": f["max_length_label"], "theirs": row["record"]})

        for field, parse in PARSE.items():
            theirs = parse(row[field])
            ours = f[field]
            if theirs is None:
                if row[field]:
                    stats[(field, "unparsed")] = stats.get((field, "unparsed"), 0) + 1
                continue
            prev = {"raw": f[RAW_ATTR[field]], "value": ours}
            if ours is None:
                rule = "fill"
            elif field in f["uncertain"]:
                rule = "confirms_uncertain" if _same(field, ours, theirs) else "resolves_uncertain"
            else:
                if not _same(field, ours, theirs):
                    differences.append({"id": f["id"], "field": field, "ours": f[RAW_ATTR[field]], "theirs": _raw(field, row)})
                continue
            f[field] = theirs
            f[RAW_ATTR[field]] = _raw(field, row)
            if field in f["uncertain"]:
                f["uncertain"].remove(field)
            note(f, field, rule, prev)

        if row["stars"] != f["rarity"]:
            differences.append({"id": f["id"], "field": "rarity", "ours": f["rarity"], "theirs": row["stars"]})

    for f in fish_list:
        f.setdefault("length_cm", None)
    return {
        "rows": len(rows), "matched": len(matched), "unmatched": unmatched,
        "stats": stats, "differences": differences,
        "with_length": sum(1 for f in fish_list if f["length_cm"]),
    }


def save(rows: list[dict], path: Path) -> None:
    path.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n")
