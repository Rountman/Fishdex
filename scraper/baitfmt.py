"""Bait vocabulary: typo fixes and synonyms on the wiki side, Czech -> English for fishao.cz.

The raw text always stays in bait_raw; only the bait[] tokens are canonical.
"""

from __future__ import annotations

# wiki token (lowercase) -> canonical token(s)
CANONICAL = {
    "insects": ["Insects"], "insect": ["Insects"], "isnects": ["Insects"],
    "fish": ["Fish"], "fishm": ["Fish"],
    "vegetal": ["Vegetal"], "vegeal": ["Vegetal"], "vegetables": ["Vegetal"],
    "dough": ["Dough"], "lures": ["Lures"], "meat": ["Meat"], "hook": ["Hook"],
    "fish. lures": ["Fish", "Lures"], "insects vegetal": ["Insects", "Vegetal"],
    "prehistoric bait": ["Prehistoric Bait"], "prehistoirc bait": ["Prehistoric Bait"],
    "prehisoric bait": ["Prehistoric Bait"],
    "monster bait": ["Monster Bait"], "moster bait": ["Monster Bait"],
    "barracuda lure": ["Barracuda Lure"], "barrauda lure": ["Barracuda Lure"],
    # user decision: Shark Lure and Shark Bait are the same bait
    "shark": ["Shark Bait"], "shark bait": ["Shark Bait"], "shark lure": ["Shark Bait"],
    "shark lures": ["Shark Bait"],
    "tuna lure": ["Tuna Lure"], "marlin lure": ["Marlin Lure"], "monkfish lure": ["Monkfish Lure"],
    "pelican lure": ["Pelican Lure"], "star lure": ["Star Lure"],
}

# fishao.cz Návnada values -> canonical English (only unambiguous ones)
CZECH = {
    "hmyz": "Insects", "ryba": "Fish", "rostlinná": "Vegetal", "těsto": "Dough", "nástraha": "Lures",
    "maso": "Meat", "háček": "Hook", "prehistorická návnada": "Prehistoric Bait",
    "žraločí návnada": "Shark Bait", "na monstra": "Monster Bait", "na soltýny": "Barracuda Lure",
    "na tuňáky": "Tuna Lure", "na marlíny": "Marlin Lure", "ďasí návnada": "Monkfish Lure",
}


def tokens(raw: str) -> list[str]:
    return [t.strip() for t in raw.split(",") if t.strip()]


def canonical(raw: str) -> tuple[list[str], list[str]]:
    """-> (canonical tokens in source order without duplicates, unknown raw tokens)."""
    out, unknown = [], []
    for t in tokens(raw):
        mapped = CANONICAL.get(" ".join(t.lower().split()))
        if mapped is None:
            unknown.append(t)
            mapped = [t]
        for m in mapped:
            if m not in out:
                out.append(m)
    return out, unknown


def norm_bait(raw: str) -> str:
    return "|".join(sorted(canonical(raw)[0]))


def from_czech(raw: str) -> list[str] | None:
    """fishao.cz 'ryba | nástraha' -> ['Fish', 'Lures']; None if any word is not in the vocabulary."""
    words = [w.strip() for w in raw.split("|") if w.strip()]
    if not words or any(w not in CZECH for w in words):
        return None
    return list(dict.fromkeys(CZECH[w] for w in words))
