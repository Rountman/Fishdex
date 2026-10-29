"""Second source: archived fishao.cz (Czech fan site) — one page per fish at /ryba/<slug>/.

Run standalone to (re)download + parse:  .venv/bin/python fishao_cz.py
Writes data/fishao_cz.json. scrape.py merges it into fish.json for names/validation.

Deliberately NOT stored: player usernames ("Hráči u kterých lze ulovit", fossil offers)
and the free-form catching guide — personal data / prose, not fish data.
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

from bs4 import BeautifulSoup

from fetch import FetchFailed, fetch

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "fishao_cz.json"
WAYBACK = "https://web.archive.org/web"
CDX_URL = ("https://web.archive.org/cdx/search/cdx?url=fishao.cz/ryba/*&output=json"
           "&filter=statuscode:200&filter=mimetype:text/html&fl=timestamp,original")

SKIP_SECTIONS = {"Hráči u kterých lze ulovit", "Nabídka fosilií této ryby"}


def ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def discover() -> dict[str, tuple[str, str]]:
    from scrape import closest  # shared snapshot choice (closest to 2023-07-18)
    rows = json.loads(fetch(CDX_URL, "cdx"))[1:]
    pages = defaultdict(list)
    for ts, original in rows:
        m = re.search(r"/ryba/([^/?#]+)/?$", original)
        if m:
            pages[m.group(1)].append((ts, original))
    out = {}
    for slug, caps in sorted(pages.items()):
        ts = closest([t for t, _ in caps])
        out[slug] = (ts, next(o for t, o in caps if t == ts))
    return out


def cell_text(td) -> str:
    """Cell text with <br> kept as ' | ' separators."""
    for br in td.find_all("br"):
        br.replace_with(" | ")
    return ws(td.get_text(" ")).strip(" |")


def parse(html: bytes, slug: str, ts: str, url: str) -> dict:
    soup = BeautifulSoup(html, "lxml")
    title = soup.find("h2") or soup.title
    rd = soup.select_one(".rybadata")
    rec = {
        "slug": slug, "source_url": url, "snapshot_timestamp": ts,
        "title": ws(soup.title.get_text()) if soup.title else None,
        "fields": {}, "image_src": None, "categories": None, "notes_raw": None,
        "sections": [], "parse_warnings": [],
    }
    img = soup.select_one(".ryba-nahled img")
    if img:
        rec["image_src"] = img.get("src")
    pd = soup.select_one(".postdata")
    if pd:
        rec["categories"] = [ws(a.get_text()) for a in pd.find_all("a", rel=re.compile("tag|category"))] or \
            [ws(a.get_text()) for a in pd.find_all("a") if "/category/" in (a.get("href") or "")]
    if not rd:
        rec["parse_warnings"].append("no .rybadata block")
        return rec

    # tables are grouped under <h4> headings: "Informace o rybě", "Informace o chovu", ...
    heading = None
    for el in rd.find_all(["h4", "table", "pre"]):
        if el.name == "h4":
            heading = ws(el.get_text())
            rec["sections"].append(heading)
            continue
        if heading in SKIP_SECTIONS:
            continue
        if el.name == "pre":
            if heading == "Poznámky o rybě":
                rec["notes_raw"] = el.get_text().strip() or None
            continue
        group = None
        for tr in el.find_all("tr"):
            tds = tr.find_all("td")
            if not tds:
                continue
            label = ws(tds[0].get_text())
            if label:
                group = label
            if len(tds) == 1:
                rec["parse_warnings"].append(f"1-cell row under {heading!r}: {ws(tr.get_text())[:60]}")
                continue
            sub = ws(tds[1].get_text())
            values = [cell_text(td) for td in tds[2:]]
            prefix = heading if heading != "Informace o rybě" else None
            pairs = []
            if re.fullmatch(r"\*+", sub):
                # Výskyt | ***** | velmi vzácný
                pairs = [("hvězdy", sub), ("slovy", " ".join(values))]
            elif not sub or not re.fullmatch(r"[^\d?*].*", sub):
                # Cena | 2300 | měny  (breeding table: no sub-label, value starts in 2nd cell)
                pairs = [(None, " ".join([sub] + values))] if sub or values else []
            else:
                pairs = [(sub, " ".join(v for v in values if v))]
            for sublabel, val in pairs:
                key = " / ".join(x for x in (prefix, group, sublabel) if x)
                val = val.strip()
                if key in rec["fields"]:
                    rec["parse_warnings"].append(f"duplicate key {key!r}")
                    key = f"{key} #2"
                rec["fields"][key] = val
    return rec


def run() -> list[dict]:
    pages = discover()
    records, failed = [], []
    for i, (slug, (ts, url)) in enumerate(pages.items(), 1):
        try:
            html = fetch(f"{WAYBACK}/{ts}id_/{url}")
        except FetchFailed as exc:
            failed.append({"slug": slug, "url": url, "timestamp": ts, "error": str(exc)})
            continue
        records.append(parse(html, slug, ts, url))
        if i % 50 == 0:
            print(f"  fishao.cz {i}/{len(pages)}", flush=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"pages": records, "failed": failed}, indent=2, ensure_ascii=False) + "\n")
    return records


if __name__ == "__main__":
    recs = run()
    print(f"fishao.cz pages parsed: {len(recs)}")
