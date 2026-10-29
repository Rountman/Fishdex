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
