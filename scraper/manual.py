"""Manual resolutions: a CSV worklist of remaining conflicts / gaps that a human fills in.

scraper/resolutions.csv  (UTF-8 with BOM, ';' separated — opens directly in Excel)
  fish_id;name;field;problem;current;options;fishao_cz;value;note

problem: conflict / missing / uncertain (value has '?') / newer_source (sources disagreed, fishao.cz
used, shown with '?') / fallback_en (no Czech name). `current` = what fish.json has now.

Each build regenerates the worklist but keeps every filled `value` and `note`.
A filled value is applied to fish.json with extra.filled_from.<field> = {"source": "manual", ...}.
"""

from __future__ import annotations

import csv
from pathlib import Path

from baitfmt import canonical
from seasonfmt import parse_season
from timefmt import parse_time

CSV_PATH = Path(__file__).resolve().parent / "resolutions.csv"
COLUMNS = ["fish_id", "name", "field", "problem", "current", "options", "fishao_cz", "value", "note"]

# worklist field -> (column name in wiki tables / conflicts key, fishao.cz field used as a hint)
FIELDS = {
    "bait": ("Bait", "Návnada"),
    "season": ("Season", "Výskyt / období"),
    "time": ("Time", "Výskyt / čas"),
    "rarity": ("rarity", "Výskyt / hvězdy"),
    "name_cs": (None, "Název / česky"),
}


def load() -> dict[tuple[str, str], dict]:
    if not CSV_PATH.exists():
        return {}
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as fh:
        return {(r["fish_id"], r["field"]): r for r in csv.DictReader(fh, delimiter=";")}


def _label(o: dict) -> str:
    return f"{o['page']}/{o['section']}" if o.get("section") and o["page"] != "5-star-fish" else o["page"]


def _options(f: dict, column: str) -> str:
    """Distinct wiki values with the tables they come from: 'Fish, Lures [area-fish/Laketown, all-in-one] || ...'."""
    if column == "rarity":
        vals: dict[str, list] = {}
        for o in f["extra"]["occurrences"]:
            for v in ([o["cells"]["Stars"]] if "Stars" in o["cells"] else []) + [s[0] for s in o["star_images"]]:
                vals.setdefault(v, []).append(_label(o))
    else:
        vals = {}
        for o in f["extra"]["occurrences"]:
            v = o["cells"].get(column)
            if v is not None:
                vals.setdefault(v, []).append(_label(o))
    return " || ".join(f"{v} [{', '.join(dict.fromkeys(src))}]" for v, src in vals.items())


def _cz_hint(f: dict, cz_field: str) -> str:
    pages = f["extra"].get("fishao_cz") or []
    return " || ".join(dict.fromkeys(p["fields"][cz_field] for p in pages if p["fields"].get(cz_field)))


def issues(f: dict) -> list[dict]:
    """Open problems for one fish (computed before manual values are applied)."""
    out = []
    filled = f["extra"].get("filled_from", {})
    checks = {
        "bait": f["bait"] is None,
        "season": f["season"] is None,
        "time": f["time"] is None,
        "rarity": f["rarity"] is None,
        "name_cs": f["names"]["cs"] is None or "cs" in f["extra"].get("names_fallback", {}),
    }
    for field, is_open in checks.items():
        if not is_open or field in filled:
            continue
        column, cz_field = FIELDS[field]
        raw_attr = {"time": "time_raw", "season": "season_raw", "bait": "bait_raw"}.get(field)
        if field == "name_cs" and "cs" in f["extra"].get("names_fallback", {}):
            problem = "fallback_en"
        elif column and column in f["extra"]["conflicts"]:
            problem = "conflict"
        elif raw_attr and f[raw_attr] is not None:
            problem = "uncertain"  # value exists but contains '?' or similar
        else:
            problem = "missing"
        out.append({
            "fish_id": f["id"], "name": f["name"], "field": field, "problem": problem, "current": "",
            "options": _options(f, column) if column else "",
            "fishao_cz": _cz_hint(f, cz_field),
        })
    raw_of = {"time": "time_raw", "season": "season_raw", "bait": "bait_raw", "rarity": "rarity_raw"}
    for field in f["uncertain"]:
        if field not in raw_of or any(r["field"] == field for r in out):
            continue
        column, cz_field = FIELDS[field]
        rule = f["extra"].get("filled_from", {}).get(field, {}).get("rule")
        out.append({
            "fish_id": f["id"], "name": f["name"], "field": field,
            "problem": "newer_source" if rule == "newer_source" else "uncertain",
            "current": f[raw_of[field]] or "", "options": _options(f, column), "fishao_cz": _cz_hint(f, cz_field),
        })
    return out


def apply(f: dict, field: str, value: str) -> None:
    value = value.strip()
    prev = {"bait": f["bait_raw"], "season": f["season_raw"], "time": f["time_raw"],
            "rarity": f["rarity_raw"], "name_cs": f["names"]["cs"]}[field]
    if field == "bait":
        f["bait_raw"] = value
        f["bait"] = canonical(value)[0]
    elif field == "season":
        f["season_raw"] = value
        f["season"] = parse_season(value)
    elif field == "time":
        f["time_raw"] = value
        f["time"] = parse_time(value)
    elif field == "rarity":
        f["rarity_raw"] = value
        f["rarity"] = int(value) if value in {"1", "2", "3", "4", "5"} else None
    elif field == "name_cs":
        f["names"]["cs"] = value
        f["extra"].pop("names_fallback", None)
    f["extra"].setdefault("filled_from", {})[field] = {"source": "manual", "reason": "manual", "previous_raw": prev}
    if field in f["uncertain"]:
        f["uncertain"].remove(field)


def run(fish_list: list[dict]) -> dict:
    saved = load()
    rows = []
    applied = 0
    for f in fish_list:
        for row in issues(f):
            old = saved.get((row["fish_id"], row["field"]), {})
            row["value"] = (old.get("value") or "").strip()
            row["note"] = old.get("note") or ""
            if row["value"]:
                apply(f, row["field"], row["value"])
                applied += 1
            rows.append(row)
    # keep filled rows whose problem disappeared (e.g. source fixed) so no human input is ever lost
    current = {(r["fish_id"], r["field"]) for r in rows}
    for key, old in saved.items():
        if key not in current and (old.get("value") or "").strip():
            rows.append({**{c: old.get(c, "") for c in COLUMNS}, "problem": "obsolete (no longer open)"})
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS, delimiter=";")
        w.writeheader()
        w.writerows(rows)
    open_rows = [r for r in rows if not r["value"]]
    return {"rows": rows, "applied": applied, "open": open_rows}
