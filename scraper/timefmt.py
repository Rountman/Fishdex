"""Time-of-day parsing shared by both sources.

Only formatting is normalised (spaces, 1-digit hours, en dash, trailing comma).
Anything uncertain ('?', '+', dates in the time column) stays unparsed -> None.
"""

from __future__ import annotations

import json
import re

ALWAYS = {"always", "kdykoliv"}
RANGE_RE = re.compile(r"(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})")


def parse_time(raw: str | None):
    """'Always' -> 'always'; '18:00 - 9:00, 1:00-2:00' -> [{'from': '18:00', 'to': '09:00'}, ...]; else None."""
    if raw is None:
        return None
    text = raw.strip().rstrip(",").strip()
    if text.lower() in ALWAYS:
        return "always"
    ranges = []
    for part in text.split(","):
        m = RANGE_RE.fullmatch(part.strip())
        if not m:
            return None
        ranges.append({"from": f"{int(m.group(1)):02d}:{m.group(2)}",
                       "to": f"{int(m.group(3)):02d}:{m.group(4)}"})
    return ranges


def norm_time(raw: str) -> str:
    """Comparison key: parsed form when parseable, otherwise whitespace-free lowercase text."""
    parsed = parse_time(raw)
    return json.dumps(parsed) if parsed is not None else re.sub(r"\s+", "", raw or "").lower()
