"""Locations: big area (filterable) + exact spot inside it (shown as a note).

'Pinheira Beach (Pier only)', 'Pinheira Beach (z mola)', 'Mystic Desert (Py)', 'Trout farm (Laketown)'
all become (area_id, spot) pairs, e.g. ('pinheira-beach', 'Pier'), ('laketown', 'Trout Farm').
"""

from __future__ import annotations

import re

# spot text (lowercase, wiki legend abbreviations + fishao.cz Czech) -> canonical spot
SPOTS = {
    "pier": "Pier", "pier only": "Pier", "p": "Pier", "z mola": "Pier",
    "boat": "Boat", "boat only": "Boat", "b": "Boat", "z člunu": "Boat",
    "raft": "Raft", "raft only": "Raft", "r": "Raft", "z voru": "Raft",
    "pyramid": "Pyramid", "py": "Pyramid", "inside pyramid only": "Pyramid", "v pyramidě": "Pyramid",
    "trout farm": "Trout Farm", "tf": "Trout Farm", "farma": "Trout Farm",
    "enclosure": "Enclosure", "enclosure only": "Enclosure", "e": "Enclosure", "za plotem": "Enclosure",
    "furniture factory": "Furniture Factory", "f": "Furniture Factory",
    "salt water pond": "Salt Water Pond", "salt": "Salt Water Pond", "vlevo, slaná voda": "Salt Water Pond",
    "fresh water pond": "Fresh Water Pond", "fresh": "Fresh Water Pond", "vpravo, sladká voda": "Fresh Water Pond",
    "monster": "Monster Pond",
    "uvnitř": "Inside", "vně": "Outside",
}
NOT_SPOTS = {"u", "unlockable"}  # legend 'U' = Unlockable — a property of the fish, not a place

# area names that are not table headings (fishao.cz Czech names, tournaments, sections that are spots)
EXTRA_AREA_NAMES = {
    "klub": ("club", None), "lost valley i": ("lost-valley-1", None), "lost valley ii": ("lost-valley-2", None),
    "pirátská jeskyně": ("pirate-cave", None), "za domem": ("backyard", None), "backyard": ("backyard", None),
    "turnaj boat on sea": ("boat-on-sea-tournament", None), "turnaj lake run": ("lake-run-tournament", None),
    "turnaj magic 15": ("race-magic-15-tournament", None), "turnaj moray": ("moray-tournament", None),
    "race tournament": ("race-magic-15-tournament", None),
    # Furniture Factory is a building in Mystic Desert: filter under the town, show the spot
    "furniture factory": ("mystic-desert", "Furniture Factory"),
    "továrna na nábytek": ("mystic-desert", "Furniture Factory"),
}
# table sections that are spots of a bigger area rather than areas of their own
SECTION_AS_SPOT = {"Furniture Factory": ("mystic-desert", "Furniture Factory")}


def spot_of(text: str) -> str | None:
    return SPOTS.get(" ".join(text.lower().split()))


def build_lookup(area_names: dict[str, str], aliases: dict[str, str]) -> dict[str, tuple[str, str | None]]:
    """area_names: {lowercase name: area_id}; aliases: approved typo map {lowercase text: area_id}."""
    lookup = {k: (v, None) for k, v in area_names.items()}
    lookup.update(EXTRA_AREA_NAMES)
    for raw, target in aliases.items():
        lookup.setdefault(raw.lower(), (target, None))
    return lookup


def place(text: str, lookup: dict) -> tuple[str | None, list[str], list[str]]:
    """'Pinheira Beach (Pier only)' -> ('pinheira-beach', ['Pier'], []); unknown parts returned as leftovers."""
    t = " ".join(text.split())
    if ")" in t and "(" not in t:  # 'Pinheira Beach Pier)'
        t = re.sub(r"\s(\S+\))$", r" (\1", t)
    parens = [p.strip() for p in re.findall(r"\(([^)]*)\)?", t)]
    base = re.sub(r"\([^)]*\)?", "", t).strip()
    area, spots, leftover = None, [], []
    if t.lower() in lookup:  # parentheses are part of the name: 'Race (Magic 15) Tournament'
        aid, s = lookup[t.lower()]
        return aid, [s] if s else [], []
    hit = lookup.get(base.lower())
    if hit:
        area, s = hit
        if s:
            spots.append(s)
    elif spot_of(base) and len(parens) == 1 and lookup.get(parens[0].lower()):  # 'Trout farm (Laketown)'
        area = lookup[parens[0].lower()][0]
        spots.append(spot_of(base))
        parens = []
    for p in parens:
        if p.lower() in NOT_SPOTS or (area and lookup.get(p.lower(), (None,))[0] == area):
            continue  # 'Trout farm (Laketown)': the parenthesis just repeats the area
        s = spot_of(p)
        if s:
            spots.append(s)
        else:
            leftover.append(p)
    return area, list(dict.fromkeys(spots)), leftover


CZ_AREA_FIELD = "Výskyt / oblast"


def apply_cz(f: dict, lookup: dict, stats: dict, notes: list) -> None:
    """Newer source (fishao.cz) decides the area list when it disagrees with the wiki -> 'areas' uncertain.
    Its spots (z mola, z člunu, ...) are added either way."""
    pages = f["extra"].get("fishao_cz") or []
    texts = list(dict.fromkeys(a.strip() for p in pages for a in (p["fields"].get(CZ_AREA_FIELD) or "").split("|")
                               if a.strip()))
    if not texts:
        return
    cz: dict[str, set] = {}
    unmapped = []
    for t in texts:
        aid, spots, leftover = place(t, lookup)
        if not aid:
            unmapped.append(t)
            continue
        cz.setdefault(aid, set()).update(spots)
        for lo in leftover:
            notes.append(f"{f['id']}: unknown fishao.cz spot {lo!r} in {t!r}")
    for t in unmapped:
        notes.append(f"{f['id']}: fishao.cz area {t!r} not recognised")
    for aid in cz:
        f["extra"]["area_sources"].setdefault(aid, [])
        if "fishao.cz" not in f["extra"]["area_sources"][aid]:
            f["extra"]["area_sources"][aid] = sorted(f["extra"]["area_sources"][aid] + ["fishao.cz"])
    if not unmapped and set(cz) != set(f["areas"]):
        f["extra"]["areas_wiki"] = f["areas"]
        f["areas"] = sorted(cz)
        f["uncertain"].append("areas")
        stats[("areas", "newer_source")] = stats.get(("areas", "newer_source"), 0) + 1
    spots = {a: set(s) for a, s in f["area_spots"].items()}
    for aid, s in cz.items():
        spots.setdefault(aid, set()).update(s)
    f["area_spots"] = {a: sorted(s) for a, s in sorted(spots.items()) if s and a in f["areas"]}
