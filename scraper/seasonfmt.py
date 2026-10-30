"""Season parsing shared by both sources.

parse_season(raw) -> "always" | [{"from": "MM-DD", "to": "MM-DD"}, ...] | None

- month-only bounds become whole months ("July-September" -> 07-01..09-30)
- adjacent ranges are merged, also across new year ("Sep-Dec, Jan-March" == "Sept - March")
- a range covering the whole year becomes "always"
- anything uncertain ('?', '+', a year, a time of day) -> None
"""

from __future__ import annotations

import json
import re
from datetime import date, timedelta

YEAR = 2023  # non-leap reference year: Feb ends on the 28th
MONTHS = {
    "jan": 1, "january": 1, "janurary": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10, "october": 10,
    "nov": 11, "november": 11, "dec": 12, "december": 12,
}
ALWAYS = {"always", "vždy"}
MONTH = r"([A-Za-z]+)\.?"
DAY = r"(\d{1,2})(?:st|nd|rd|th)?"


def _last_day(month: int) -> int:
    nxt = date(YEAR + (month == 12), month % 12 + 1, 1)
    return (nxt - timedelta(days=1)).day


def _bound(text: str, is_end: bool):
    """'July' / 'July 15th' / '15 July' / '15.07.' -> date, or None."""
    text = text.strip()
    m = re.fullmatch(r"(\d{1,2})\.(\d{1,2})\.", text)  # fishao.cz 01.07.
    if m:
        d, mo = int(m.group(1)), int(m.group(2))
    else:
        m1 = re.fullmatch(MONTH + r"(?:\s+" + DAY + r")?", text)
        m2 = re.fullmatch(DAY + r"\s+" + MONTH, text)
        if m1 and m1.group(1).lower() in MONTHS:
            mo, d = MONTHS[m1.group(1).lower()], int(m1.group(2)) if m1.group(2) else None
        elif m2 and m2.group(2).lower() in MONTHS:
            mo, d = MONTHS[m2.group(2).lower()], int(m2.group(1))
        else:
            return None
        if d is None:
            d = _last_day(mo) if is_end else 1
    try:
        return date(YEAR, mo, d)
    except ValueError:
        return None


def _merge(ranges: list[tuple[date, date]]):
    """Merge touching/overlapping ranges on a circular year; returns list or 'always'."""
    # unroll to day-of-year intervals, wrapping ranges split in two
    days = set()
    for a, b in ranges:
        d = a
        while True:
            days.add(d.timetuple().tm_yday)
            if d == b:
                break
            d = d + timedelta(days=1) if d != date(YEAR, 12, 31) else date(YEAR, 1, 1)
    if len(days) >= 365:
        return "always"
    out, run = [], []
    for doy in range(1, 366):
        if doy in days:
            run.append(doy)
        elif run:
            out.append([run[0], run[-1]])
            run = []
    if run:
        out.append([run[0], run[-1]])
    if len(out) > 1 and out[0][0] == 1 and out[-1][1] == 365:  # join across new year
        first = out.pop(0)
        out[-1][1] = first[1]
    fmt = lambda doy: (date(YEAR, 1, 1) + timedelta(days=doy - 1)).strftime("%m-%d")
    return [{"from": fmt(a), "to": fmt(b)} for a, b in out]


def parse_season(raw: str | None):
    if raw is None:
        return None
    text = raw.strip()
    if ";" in text:  # 'Halloween; 28 October - 3 November'
        text = text.split(";", 1)[1].strip()
    if text.lower() in ALWAYS:
        return "always"
    if re.search(r"[?+]|\d{4}|\d:\d", text):
        return None
    ranges = []
    for part in text.split(","):
        part = part.strip()
        if not part:
            continue
        same_month = re.fullmatch(MONTH + r"\s+" + DAY + r"\s*[-–]\s*" + DAY, part)  # 'January 1-31'
        if same_month:
            part = f"{same_month.group(1)} {same_month.group(2)} - {same_month.group(1)} {same_month.group(3)}"
        ends = re.split(r"\s*[-–]\s*", part)
        if len(ends) == 1:  # single month: 'April'
            a, b = _bound(ends[0], False), _bound(ends[0], True)
        elif len(ends) == 2:
            a, b = _bound(ends[0], False), _bound(ends[1], True)
        else:
            return None
        if not a or not b:
            return None
        ranges.append((a, b))
    return _merge(ranges) if ranges else None


def norm_season(raw: str) -> str:
    parsed = parse_season(raw)
    return json.dumps(parsed) if parsed is not None else re.sub(r"\s+", "", raw or "").lower()
