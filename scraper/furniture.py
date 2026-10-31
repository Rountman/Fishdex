"""Furniture (home decorations) from all three sources into data/furniture.json + images/furniture/.

Run:  .venv/bin/python furniture.py            (all fetches cached)
      .venv/bin/python furniture.py --no-images

Sources (user decision 2026-10-31: sets and items outside sets, same "owned" logic as fish):
- fishaofunwiki.com — main source. Its lazy `decorations-*.js` chunk holds every item as JSON
  (name, set, type, rarity, availability, level, season, source, price, image). Images are live webp.
- fishaowiki.com/furniture/ (Wayback) — the original tables funwiki copied. Used to cross-check
  values (report only) and to map the old `graphics_128x128_N.png` image names to English names.
- fishao.cz/<x>-set/ (Wayback) — one page per set: Czech names, a preview picture of the whole set.
  Items found only there are added with source fishao.cz.

Values from funwiki win; disagreements are listed in data/furniture-report.md, never silently merged.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

from bs4 import BeautifulSoup

from fetch import FetchFailed, fetch, fetch_meta

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
IMG_DIR = ROOT / "images" / "furniture"
ALIASES_FILE = Path(__file__).resolve().parent / "aliases.json"

FUNWIKI = "https://www.fishaofunwiki.com"
WAYBACK = "https://web.archive.org/web"
CDX_WIKI = "https://web.archive.org/cdx/search/cdx?url=fishaowiki.com/*&filter=statuscode:200&collapse=urlkey&output=json"
CDX_CZ = "https://web.archive.org/cdx/search/cdx?url=fishao.cz/*&output=json&filter=statuscode:200&collapse=urlkey&fl=timestamp,original,mimetype"

# fishao.cz set page slug -> funwiki set name. Pages are named in Czech; mapping checked against item matches.
CZ_SETS = {
    "jednoduchy-set": "Simple Set", "princeznovsky-set": "Princess Set", "klasicky-set": "Classic Set",
    "designovy-set": "Design Set", "zlaty-set": "Gold Set", "ledovy-set": "Ice Set",
    "vanocni-set": "Christmas Set", "strasidelny-set": "Spooky Set", "piratsky-set": "Pirate Set",
    "balonovy-set": "Balloon Set", "bonbonovy-set": "Candy Set", "puvabny-set": "Gorgeous Set",
    "fotbalovy-set": "Soccer Set", "vesmirny-set": "Space Set",
}
RARITY = {"very common": "very-common", "common": "common", "uncommon": "uncommon", "rare": "rare",
          "very rare": "very-rare", "epic": "epic", "legendary": "legendary", "normal": "normal"}
SOURCE = {"Furniture Shop": "shop", "Furniture Factory": "factory", "Mission reward": "mission"}
TYPE = {"wall": "wall", "walls": "wall", "floor": "floor", "floors": "floor", "furniture": "furniture",
        "plant": "plant", "plants": "plant", "painting": "painting", "paintings": "painting"}
# Czech type words -> English, to pair "Balónová stěna" with "Balloon Wall" when the image name has no English
CZ_WORDS = {"stena": "wall", "podlaha": "floor", "postel": "bed", "zidle": "chair", "hodiny": "clock",
            "lampa": "lamp", "nocni stolek": "nightstand", "rostlina": "plant", "pohovka": "sofa",
            "stul": "table", "televize": "tv", "kreslo": "armchair", "stolicka": "stool"}
# ("skříň" is left out on purpose: it is Closet in some sets and Wardrobe in others — aliases decide)
# fishao.cz writes the rarity of factory items in Czech where shop items have "Level N / season"
CZ_RARITY = {"velmi bezna": "Very common", "bezna": "Common", "bezne": "Common", "neobvykla": "Uncommon",
             "neobvykle": "Uncommon", "vzacna": "Rare", "vzacne": "Rare", "velmi vzacna": "Very rare",
             "epicka": "Epic", "epicke": "Epic", "legendarni": "Legendary"}


def key(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def ascii_fold(s: str) -> str:
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFKD", s.lower()) if not unicodedata.combining(c))


def image_ext(body: bytes) -> str | None:
    if body.startswith(b"\x89PNG"):
        return "png"
    if body[:3] == b"\xff\xd8\xff":
        return "jpg"
    if body[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if body[:4] == b"RIFF" and body[8:12] == b"WEBP":
        return "webp"
    return None


def latest(cdx_url: str, pred) -> dict[str, str]:
    """{normalized url: newest timestamp} for CDX rows whose url matches pred."""
    rows = json.loads(fetch(cdx_url, "cdx"))
    head = rows[0]
    ti, oi = head.index("timestamp"), head.index("original")
    out: dict[str, str] = {}
    for r in rows[1:]:
        u = r[oi].split("?")[0].replace(":80/", "/").replace("https://", "http://").rstrip("/")
        if pred(u):
            out[u] = max(out.get(u, "0"), r[ti])
    return out


# ---------------------------------------------------------------- sources

def load_funwiki() -> tuple[list[dict], str, dict[str, str]]:
    """(items, chunk url, {collection name: badge path}). Badges: transparent webp per set + Plants/Paintings."""
    html = fetch(FUNWIKI + "/", "funwiki").decode()
    main = re.search(r'src="(/assets/index-[^"]+\.js)"', html).group(1)
    js = fetch(FUNWIKI + main, "funwiki").decode()
    m = re.search(r"assets/(decorations-[A-Za-z0-9_-]+\.js)", js)
    if not m:
        raise RuntimeError("fishaofunwiki: decorations chunk not referenced from the app bundle")
    chunk_url = f"{FUNWIKI}/assets/{m.group(1)}"
    chunk = fetch(chunk_url, "funwiki").decode()
    i = chunk.index("JSON.parse(`") + len("JSON.parse(`")
    rows = json.loads(chunk[i:chunk.index("`)", i)])
    badges = {}
    m = re.search(r"assets/(collections-[A-Za-z0-9_-]+\.js)", js)
    if m:
        coll = fetch(f"{FUNWIKI}/assets/{m.group(1)}", "funwiki").decode()
        badges = dict(re.findall(r"\[`([^`]+)`,`(/decorations-set-badges/[^`]+)`\]", coll))
        badges |= dict(re.findall(r"name:`(Plants|Paintings)`,badge:`([^`]+)`", coll))
    return rows, chunk_url, badges


def load_fishaowiki() -> tuple[list[dict], str, str]:
    snaps = latest(CDX_WIKI, lambda u: u == "http://fishaowiki.com/furniture")
    ts = snaps["http://fishaowiki.com/furniture"]
    url = "http://fishaowiki.com/furniture/"
    soup = BeautifulSoup(fetch(f"{WAYBACK}/{ts}id_/{url}"), "lxml")
    rows = []
    for t in soup.select("table.tablepress"):
        heads = [th.get_text(strip=True) for th in t.select("thead th")]
        for tr in t.select("tbody tr"):
            tds = tr.find_all("td")
            cells = {h: td.get_text(" ", strip=True) for h, td in zip(heads, tds)}
            img = tr.find("img")
            rows.append({"table_id": t.get("id"), "cells": cells, "image": img.get("src") if img else None})
    return rows, url, ts


def load_fishao_cz() -> list[dict]:
    pages = latest(CDX_CZ, lambda u: re.fullmatch(r"http://www\.fishao\.cz/[a-z]+-set", u) is not None)
    out = []
    for slug in CZ_SETS:
        u = f"http://www.fishao.cz/{slug}"
        ts = pages.get(u)
        if not ts:
            out.append({"slug": slug, "error": "not in CDX"})
            continue
        soup = BeautifulSoup(fetch(f"{WAYBACK}/{ts}id_/{u}/"), "lxml")
        title = soup.find("title")  # "Zlatý set | FISHAO.cz"
        table = soup.find("table")
        items, preview = [], None
        for tr in table.find_all("tr") if table else []:
            tds = tr.find_all(["td", "th"])
            img = tr.find("img")
            if not img or len(tds) < 2:
                continue
            src = img["src"]
            name = tds[1].get_text(" ", strip=True)
            if name.startswith("Název"):  # header row carries the preview of the whole set
                preview = src
                continue
            items.append({"name_cs": name, "image": src,
                          "availability_raw": tds[2].get_text(" ", strip=True) if len(tds) > 2 else None,
                          "price_raw": tds[3].get_text(" ", strip=True) if len(tds) > 3 else None})
        out.append({"slug": slug, "title": title.get_text(strip=True).split("|")[0].strip() if title else None,
                    "source_url": f"https://www.fishao.cz/{slug}/", "snapshot_timestamp": ts,
                    "preview": preview, "items": items})
    return out


# ---------------------------------------------------------------- matching fishao.cz -> funwiki

def match_cz(page: dict, set_items: list[dict], by_key: dict, wiki_by_img: dict, aliases: dict) -> None:
    """Fill item['match'] (funwiki slug) and item['match_by'] for every fishao.cz item of one page."""
    taken = set()
    set_name = CZ_SETS[page["slug"]]
    prefix = set_name.removesuffix(" Set")
    by_type_word = {key(r["name"].removeprefix(prefix)): r for r in set_items}
    for it in page["items"]:
        fn = it["image"].rsplit("/", 1)[-1].rsplit(".", 1)[0]
        hit, how = None, None
        alias = aliases.get(f"{page['slug']}/{fn}")
        if alias:
            hit, how = by_key.get(key(alias)), "alias"
        if not hit:  # 'zlata-lampa-gold-lamp' -> try suffixes 'gold-lamp', 'lamp'
            parts = fn.replace("designer", "design").split("-")
            for k in range(len(parts)):
                tail = key("".join(parts[k:]))
                if tail in by_key and by_key[tail]["set"] == set_name:
                    hit, how = by_key[tail], "image name"
                    break
        if not hit and fn.startswith("graphics_128x128_"):  # same game asset name on fishaowiki
            wiki = wiki_by_img.get(fn)
            if wiki:
                hit, how = by_key.get(key(wiki)), "fishaowiki image"
        if not hit:  # Czech type word -> English item of the same set
            word = ascii_fold(it["name_cs"]).split(" ", 1)[-1]
            en = CZ_WORDS.get(word)
            if en and key(en) in by_type_word:
                hit, how = by_type_word[key(en)], "czech word"
        if hit and hit["slug"] not in taken:
            taken.add(hit["slug"])
            it["match"], it["match_by"] = hit["slug"], how
        else:
            it["match"], it["match_by"] = None, None


# ---------------------------------------------------------------- images

def download(url: str, dest_stem: Path, with_images: bool) -> tuple[str | None, str | None]:
    """Returns (repo-relative path, error)."""
    existing = sorted(dest_stem.parent.glob(dest_stem.name + ".*"))
    if not with_images:
        return (str(existing[0].relative_to(ROOT)), None) if existing else (None, "not downloaded (--no-images)")
    try:
        body, meta = fetch_meta(url, "img")
    except FetchFailed as exc:
        return None, str(exc)
    ext = image_ext(body)
    if not ext:
        return None, f"not an image ({meta.get('content_type')})"
    dest = dest_stem.with_suffix("." + ext)
    for old in existing:
        if old != dest:
            old.unlink()
    if not dest.exists() or dest.read_bytes() != body:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(body)
    return str(dest.relative_to(ROOT)), None


def cz_image_url(src: str, ts: str) -> str:
    full = src if src.startswith("http") else "http://www.fishao.cz" + src
    return f"{WAYBACK}/{ts}im_/{full}"


# ---------------------------------------------------------------- build

def norm_level(availability: str | None, level) -> int | None:
    if isinstance(level, int):
        return level
    m = re.fullmatch(r"Level (\d+)", availability or "")
    return int(m.group(1)) if m else None


def build(with_images: bool) -> None:
    aliases_all = json.loads(ALIASES_FILE.read_text())
    aliases = aliases_all.get("furniture_cz", {})

    fw_rows, fw_url, badges = load_funwiki()
    wiki_rows, wiki_url, wiki_ts = load_fishaowiki()
    cz_pages = load_fishao_cz()

    by_key = {key(r["name"]): r for r in fw_rows}
    wiki_by_key = {key(w["cells"].get("Product", "")): w for w in wiki_rows}
    wiki_by_img = {}
    for w in wiki_rows:
        if w["image"]:
            wiki_by_img[w["image"].rsplit("/", 1)[-1].rsplit(".", 1)[0]] = w["cells"].get("Product", "")

    # ---- fishao.cz pairing
    cz_by_slug: dict[str, dict] = {}
    cz_only: list[dict] = []
    for page in cz_pages:
        if "items" not in page:
            continue
        set_items = [r for r in fw_rows if r["set"] == CZ_SETS[page["slug"]]]
        match_cz(page, set_items, by_key, wiki_by_img, aliases)
        for it in page["items"]:
            if it["match"]:
                cz_by_slug[it["match"]] = {**it, "page": page["slug"], "snapshot_timestamp": page["snapshot_timestamp"]}
            else:
                cz_only.append({**it, "page": page["slug"], "snapshot_timestamp": page["snapshot_timestamp"]})

    # ---- sets
    sets = []
    set_names = list(dict.fromkeys(r["set"] for r in fw_rows if r["set"] and r["set"] != "Other"))
    cz_page_of = {v: k for k, v in CZ_SETS.items()}
    page_by_slug = {p["slug"]: p for p in cz_pages}
    for name in set_names:
        sid = slugify(name.removesuffix(" Set"))
        page = page_by_slug.get(cz_page_of.get(name, ""), {})
        cs = page.get("title")
        image, err = (None, "no badge in funwiki nor fishao.cz")
        if badges.get(name):
            image, err = download(FUNWIKI + badges[name], IMG_DIR / "sets" / sid, with_images)
        if not image and page.get("preview"):
            image, err = download(cz_image_url(page["preview"], page["snapshot_timestamp"]), IMG_DIR / "sets" / sid, with_images)
        sets.append({"id": sid, "name": name, "names": {"en": name, "cs": cs or name}, "kind": "set",
                     "image": image, "image_error": err,
                     "source_url": page.get("source_url"), "snapshot_timestamp": page.get("snapshot_timestamp")})
    set_id = {s["name"]: s["id"] for s in sets}
    # funwiki groups items outside sets by type; they get a badge too (no Czech source for these names)
    for name, cs in (("Plants", "Rostliny"), ("Paintings", "Obrazy")):
        image, err = download(FUNWIKI + badges[name], IMG_DIR / "sets" / slugify(name), with_images) if name in badges else (None, "no badge")
        sets.append({"id": slugify(name), "name": name, "names": {"en": name, "cs": cs}, "kind": "type",
                     "image": image, "image_error": err, "source_url": fw_url, "snapshot_timestamp": None})

    # ---- items
    items, conflicts, image_failures = [], {}, []
    for r in fw_rows:
        sid = set_id.get(r["set"])
        wiki = wiki_by_key.get(key(r["name"]))
        cz = cz_by_slug.get(r["slug"])
        rarity = RARITY.get((r["rarity"] or "").lower())
        diffs = {}
        if wiki:
            c = wiki["cells"]
            pairs = {"type": (TYPE.get(r["type"].lower()), TYPE.get(c.get("Type", "").lower())),
                     "rarity": (r["rarity"], c.get("Rareness")),
                     "season": (r["season"], c.get("Season")),
                     "price": (str(r["price"]) if r["price"] is not None else None, c.get("Price / Home points"))}
            if "In shop from level" in c:
                pairs["availability"] = (r["availability"], c["In shop from level"])
            diffs = {k: {"fishaofunwiki": a, "fishaowiki": b} for k, (a, b) in pairs.items()
                     if b not in (None, "") and (a or "").strip().lower() != b.strip().lower()}
        if cz:
            cz_rarity = CZ_RARITY.get(ascii_fold(cz["availability_raw"] or ""))
            if cz_rarity and cz_rarity.lower() != (r["rarity"] or "").lower():
                diffs["rarity_cz"] = {"fishaofunwiki": r["rarity"], "fishao.cz": cz["availability_raw"]}
            if CZ_SETS[cz["page"]] != r["set"]:
                diffs["set"] = {"fishaofunwiki": r["set"], "fishao.cz": CZ_SETS[cz["page"]]}
        if diffs:
            conflicts[r["slug"]] = diffs
        image, err = download(FUNWIKI + r["image"], IMG_DIR / r["slug"], with_images) if r["image"] else (None, "no image")
        image_source = "fishaofunwiki"
        if not image and cz:
            image, err2 = download(cz_image_url(cz["image"], cz["snapshot_timestamp"]), IMG_DIR / r["slug"], with_images)
            image_source = "fishao.cz" if image else None
            err = err if image is None and err2 is None else err2
        if not image:
            image_failures.append({"id": r["slug"], "error": err})
        items.append({
            "id": r["slug"],
            "name": r["name"],
            "names": {"en": r["name"], "cs": cz["name_cs"] if cz else r["name"]},
            "set": sid,
            "type": TYPE.get((r["type"] or "").lower()),
            "type_raw": r["type"],
            "rarity": rarity,
            "rarity_raw": r["rarity"],
            "source": SOURCE.get(r["source"]),
            "source_raw": r["source"],
            "level": norm_level(r["availability"], r["level"]),
            "availability_raw": r["availability"],
            "season_raw": r["season"],
            "price": r["price"],
            "image": image,
            "image_source": image_source if image else None,
            "source_url": fw_url,
            "extra": {"fishaofunwiki": r,
                      "fishaowiki": ({**wiki, "source_url": wiki_url, "snapshot_timestamp": wiki_ts} if wiki else None),
                      "fishao_cz": cz, "conflicts": diffs},
        })

    # items only on fishao.cz (not in funwiki): kept, with what that page says
    for it in cz_only:
        en = CZ_SETS[it["page"]]
        fn = it["image"].rsplit("/", 1)[-1].rsplit(".", 1)[0]
        m = re.search(r"-(" + re.escape(en.split()[0].lower()) + r"|designer)-(.+)$", fn)
        name = (en.removesuffix(" Set") + " " + m.group(2).replace("-", " ").title()) if m else it["name_cs"]
        iid = slugify(name)
        image, err = download(cz_image_url(it["image"], it["snapshot_timestamp"]), IMG_DIR / iid, with_images)
        if not image:
            image_failures.append({"id": iid, "error": err})
        lvl = re.match(r"Level (\d+)", it["availability_raw"] or "")
        items.append({
            "id": iid, "name": name, "names": {"en": name, "cs": it["name_cs"]},
            "set": set_id.get(en), "type": None, "type_raw": None, "rarity": None, "rarity_raw": None,
            "source": None, "source_raw": None, "level": int(lvl.group(1)) if lvl else None,
            "availability_raw": it["availability_raw"], "season_raw": None,
            "price": int(it["price_raw"]) if (it["price_raw"] or "").isdigit() else None,
            "image": image, "image_source": "fishao.cz" if image else None,
            "source_url": f"https://www.fishao.cz/{it['page']}/",
            "extra": {"fishaofunwiki": None, "fishaowiki": None, "fishao_cz": it, "conflicts": {},
                      "only_in": "fishao.cz", "name_from": "image file name" if m else "czech name"},
        })

    for s in sets:
        s["item_count"] = sum(1 for i in items if i["set"] == s["id"]) if s["kind"] == "set" else \
            sum(1 for i in items if not i["set"] and i["type"] == s["id"].removesuffix("s"))

    (DATA_DIR / "furniture.json").write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n")
    (DATA_DIR / "furniture_sets.json").write_text(json.dumps(sets, indent=2, ensure_ascii=False) + "\n")
    write_report(items, sets, cz_pages, cz_only, conflicts, image_failures, fw_url, wiki_url, wiki_ts, with_images)
    print(f"items: {len(items)}  sets: {len(sets)}  cz names: {len(cz_by_slug)}  cz-only: {len(cz_only)}  "
          f"conflicts: {len(conflicts)}  images: {sum(1 for i in items if i['image'])}")


def write_report(items, sets, cz_pages, cz_only, conflicts, image_failures, fw_url, wiki_url, wiki_ts, with_images):
    L = []
    w = L.append
    w("# Fishdex — report nábytku")
    w("")
    w(f"Vygenerováno {date.today().isoformat()} skriptem `scraper/furniture.py`. Přepisuje se při každém běhu — needitovat ručně.")
    w("")
    w("## Souhrn")
    w("")
    w(f"- **Kusů:** {len(items)} (v setech: {sum(1 for i in items if i['set'])}, mimo sety: {sum(1 for i in items if not i['set'])})")
    real = [s for s in sets if s["kind"] == "set"]
    w(f"- **Setů:** {len(real)} — s odznakem: {sum(1 for s in real if s['image'])}"
      + "; bez odznaku: " + (", ".join(s["name"] for s in real if not s["image"]) or "žádný"))
    w("- **Skupiny mimo sety** (jako na funwiki): " + ", ".join(f"{s['names']['cs']} ({s['item_count']})" for s in sets if s["kind"] == "type")
      + f", Ostatní ({sum(1 for i in items if not i['set'] and i['type'] not in ('plant', 'painting'))})")
    w(f"- **S obrázkem:** {sum(1 for i in items if i['image'])} / {len(items)}" + ("" if with_images else " *(běh s --no-images)*"))
    w(f"- **S českým názvem (fishao.cz):** {sum(1 for i in items if i['names']['cs'] != i['names']['en'] or i['extra']['fishao_cz'])} / {len(items)}"
      " — kusy mimo sety fishao.cz nepopisuje, mají jen anglický název.")
    w(f"- **Bez rarity (zdroj „Unknown“ nebo chybí, UI ukáže „neznámé“):** {sum(1 for i in items if not i['rarity'])}")
    w("")
    w("## Zdroje")
    w("")
    w(f"- **fishaofunwiki.com** — hlavní zdroj, chunk `{fw_url.rsplit('/', 1)[-1]}`. Všechny hodnoty i obrázky (webp).")
    w(f"- **fishaowiki.com/furniture/** — snapshot `{wiki_ts}`, jen křížová kontrola a párování starých názvů obrázků.")
    w("- **fishao.cz** — stránky setů (české názvy, náhled celého setu):")
    for p in cz_pages:
        if "items" in p:
            n = sum(1 for i in p["items"] if i["match"])
            w(f"  - [{p['slug']}]({p['source_url']}) `{p['snapshot_timestamp']}` — {len(p['items'])} kusů, spárováno {n}")
        else:
            w(f"  - {p['slug']} — {p['error']}")
    w("")
    w("Párování fishao.cz → funwiki: ruční alias (`aliases.json` → `furniture_cz`), anglický konec názvu obrázku, "
      "stejný herní obrázek `graphics_128x128_N` na fishaowiki, české slovo typu (stěna → Wall).")
    w("")
    w(f"## Kusy jen na fishao.cz ({len(cz_only)})")
    w("")
    w("Funwiki je nemá; přidány s údaji ze stránky setu (typ a rarita neznámé).")
    w("")
    for it in cz_only:
        w(f"- `{it['page']}`: {it['name_cs']} — obrázek `{it['image'].rsplit('/', 1)[-1]}`, {it['availability_raw']}")
    if not cz_only:
        w("- (nic)")
    w("")
    w(f"## Rozdíly mezi zdroji ({len(conflicts)})")
    w("")
    w("funwiki × fishaowiki (typ, rarita, sezóna, cena, dostupnost) a funwiki × fishao.cz (`rarity_cz`, `set`). "
      "Platí hodnota z funwiki (novější). Jen report.")
    w("")
    c = Counter(k for d in conflicts.values() for k in d)
    w("| pole | rozdílů |")
    w("|---|---|")
    for k, v in c.most_common():
        w(f"| {k} | {v} |")
    w("")
    w("<details><summary>Seznam</summary>")
    w("")
    for slug, d in sorted(conflicts.items()):
        w(f"- `{slug}`: " + "; ".join(
            f"{k}: funwiki `{v['fishaofunwiki']}` × " + " ".join(f"{s} `{x}`" for s, x in v.items() if s != "fishaofunwiki")
            for k, v in d.items()))
    w("")
    w("</details>")
    w("")
    w(f"## Chybějící obrázky ({len(image_failures)})")
    w("")
    for f in image_failures:
        w(f"- `{f['id']}`: {f['error']}")
    if not image_failures:
        w("- (nic)")
    w("")
    (DATA_DIR / "furniture-report.md").write_text("\n".join(L))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-images", action="store_true", help="skip image downloads (use already downloaded files)")
    build(with_images=not ap.parse_args().no_images)
