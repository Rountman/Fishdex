"""Rule-based resolution of time / season / bait where the wiki tables disagree or are uncertain.

Order, per field, only while the parsed value is still null:
  1. certain_consensus — drop uncertain wiki values ('???', 'May - ?', a date in the time column);
                         if the remaining certain values agree, take them
  2. fishao_cz_tiebreak — certain wiki values still disagree: take the one fishao.cz agrees with
  3. fishao_cz_fill     — no certain wiki value: take fishao.cz if all its pages agree and it parses
Every decision is recorded in extra.filled_from.<field> = {source, rule, candidates}.
"""

from __future__ import annotations

import json
import re

from baitfmt import canonical, from_czech
from seasonfmt import parse_season
from timefmt import parse_time

SOURCE_ORDER = ["all-in-one", "area-fish", "5-star-fish", "breeder-fish", "tournament-fish"]


def _key(parsed) -> str:
    return json.dumps(parsed, sort_keys=True)


def _bait_parse(raw):
    toks = canonical(raw)[0]
    return sorted(toks) if toks else None


FIELDS = {
    # field: (wiki column, fishao.cz field, parse wiki raw, parse cz raw, raw attr, value from raw)
    "time": ("Time", "Výskyt / čas", parse_time, parse_time, "time_raw", parse_time),
    "season": ("Season", "Výskyt / období", parse_season, parse_season, "season_raw", parse_season),
    "bait": ("Bait", "Návnada", _bait_parse,
             lambda raw: sorted(from_czech(raw)) if from_czech(raw) else None,
             "bait_raw", lambda raw: canonical(raw)[0]),
}


def resolve(f: dict, stats: dict) -> None:
    cz_pages = f["extra"].get("fishao_cz") or []
    for field, (col, cz_field, parse_wiki, parse_cz, raw_attr, value_of) in FIELDS.items():
        if f[field] is not None:
            continue
        occs = sorted(f["extra"]["occurrences"], key=lambda o: SOURCE_ORDER.index(o["page"]))
        wiki = [(o["cells"].get(col), o["page"]) for o in occs if o["cells"].get(col)]
        certain = [(raw, parse_wiki(raw)) for raw, _ in wiki if parse_wiki(raw) is not None]
        cz_vals = list(dict.fromkeys(p["fields"][cz_field] for p in cz_pages if p["fields"].get(cz_field)))
        cz_parsed = [parse_cz(v) for v in cz_vals]
        candidates = list(dict.fromkeys(raw for raw, _ in wiki))

        chosen = rule = source = None
        groups = {}
        for raw, parsed in certain:
            groups.setdefault(_key(parsed), raw)
        if len(groups) == 1:
            chosen, rule, source = next(iter(groups.values())), "certain_consensus", "fishaowiki"
        elif len(groups) > 1 and cz_parsed and all(p is not None for p in cz_parsed):
            hits = [raw for k, raw in groups.items() if k in {_key(p) for p in cz_parsed}]
            if len(hits) == 1:
                chosen, rule, source = hits[0], "fishao_cz_tiebreak", "fishaowiki"
        elif not groups and len(cz_vals) == 1 and cz_parsed[0] is not None and field != "bait":
            chosen, rule, source = cz_vals[0], "fishao_cz_fill", "fishao.cz"

        if chosen is None:
            continue
        if source == "fishao.cz":
            f[field] = cz_parsed[0]
        else:
            f[field] = value_of(chosen)
        f[raw_attr] = chosen
        f["extra"].setdefault("filled_from", {})[field] = {
            "source": source, "rule": rule, "candidates": candidates, "fishao_cz": cz_vals,
        }
        stats[(field, rule)] = stats.get((field, rule), 0) + 1


# ---------------------------------------------------------------- newer source wins

MARKERS = re.compile(r"[?+]")


def _lenient(field: str, raw: str):
    """Parse after removing uncertainty markers ('22:00? - 14:00?' -> 22:00-14:00). None if still unparseable."""
    if field == "bait":
        toks = from_czech(raw)
        return sorted(toks) if toks else None
    if field == "rarity":
        stars = MARKERS.sub("", raw).strip()
        return len(stars) if re.fullmatch(r"\*{1,5}", stars) else None
    parse = parse_time if field == "time" else parse_season
    return parse(MARKERS.sub("", raw))


def _comparable(field: str, value):
    return sorted(value) if field == "bait" and value is not None else value


NEWER = {
    # field: (fishao.cz field, raw attr, wiki column)
    "time": ("Výskyt / čas", "time_raw", "Time"),
    "season": ("Výskyt / období", "season_raw", "Season"),
    "bait": ("Návnada", "bait_raw", "Bait"),
    "rarity": ("Výskyt / hvězdy", "rarity_raw", "rarity"),
}


def prefer_newer(f: dict, stats: dict) -> None:
    """User decision: where sources disagree, take the newer website (fishao.cz, ~2019-2023 content vs.
    fishaowiki ~2018) and mark the field uncertain ('?'). Without a usable fishao.cz value, an uncertain
    wiki value ('March - September?') is still used, also marked uncertain."""
    pages = f["extra"].get("fishao_cz") or []
    for field, (cz_field, raw_attr, col) in NEWER.items():
        cz_vals = list(dict.fromkeys(p["fields"][cz_field] for p in pages if p["fields"].get(cz_field)))
        parsed = [_lenient(field, v) for v in cz_vals]
        cz_ok = bool(cz_vals) and None not in parsed and len({_key(_comparable(field, p)) for p in parsed}) == 1
        wiki_value = f[field]
        wiki_disputed = col in f["extra"]["conflicts"] or f[raw_attr] is not None and wiki_value is None

        if cz_ok:
            new = parsed[0]
            if wiki_value is not None and _key(_comparable(field, wiki_value)) == _key(_comparable(field, new)):
                continue  # sources agree
            marked = any(MARKERS.search(v) for v in cz_vals)
            prev = {"raw": f[raw_attr], "value": wiki_value}
            f[field] = new if field != "bait" else from_czech(cz_vals[0])
            f[raw_attr] = cz_vals[0]
            if wiki_value is not None or wiki_disputed or marked:
                f["uncertain"].append(field)
            f["extra"].setdefault("filled_from", {})[field] = {
                "source": "fishao.cz", "rule": "newer_source", "wiki": prev, "fishao_cz": cz_vals}
            stats[(field, "newer_source")] = stats.get((field, "newer_source"), 0) + 1
        elif wiki_value is None and field in ("time", "season"):
            occs = sorted(f["extra"]["occurrences"], key=lambda o: SOURCE_ORDER.index(o["page"]))
            for o in occs:
                raw = o["cells"].get(col)
                val = _lenient(field, raw) if raw else None
                if val is not None:
                    f[field], f[raw_attr] = val, raw
                    f["uncertain"].append(field)
                    f["extra"].setdefault("filled_from", {})[field] = {
                        "source": "fishaowiki", "rule": "uncertain_value", "fishao_cz": cz_vals}
                    stats[(field, "uncertain_value")] = stats.get((field, "uncertain_value"), 0) + 1
                    break
