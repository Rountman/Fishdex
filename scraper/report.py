"""Validation + data/report.md for the fishdex scrape."""

from __future__ import annotations

from collections import Counter
from datetime import date

CHECK_FIELDS = ["areas", "time", "season", "rarity", "bait", "max_length_cm", "image"]
PARSED_PAIRS = [("time", "time_raw"), ("season", "season_raw")]


def _md_list(items, fmt=str, limit=None):
    items = list(items)
    shown = items if limit is None else items[:limit]
    out = [f"- {fmt(i)}" for i in shown]
    if limit is not None and len(items) > limit:
        out.append(f"- … a dalších {len(items) - limit}")
    return out or ["- (nic)"]


def write_report(path, fish, areas, snaps, disc, sections, notes, unmatched_area_tokens,
                 candidates, aliases, image_failures, fetch_failures, with_images, cz, man):
    L = []
    w = L.append
    by_id = Counter(f["id"] for f in fish)
    pages_of = {f["id"]: {o["page"] for o in f["extra"]["occurrences"]} for f in fish}

    w("# Fishdex — report scrapu")
    w("")
    w(f"Vygenerováno {date.today().isoformat()} skriptem `scraper/scrape.py`. Soubor se přepisuje při každém běhu — needitovat ručně.")
    w("")

    # ------------------------------------------------------------ summary
    w("## Souhrn")
    w("")
    kinds = Counter(a["kind"] for a in areas)
    w(f"- **Ryb:** {len(fish)}")
    w(f"- **Oblastí:** {len(areas)} (" + ", ".join(f"{k}: {v}" for k, v in sorted(kinds.items())) + ")")
    w(f"- **S obrázkem:** {sum(1 for f in fish if f['image'])} / {len(fish)}"
      + ("" if with_images else " *(běh s --no-images)*"))
    w(f"- **Se zářivou variantou (podle fishao.cz):** {sum(1 for f in fish if f['has_glowing_variant'])} "
      "— fishaowiki zářivé varianty vůbec neuvádí, viz níže.")
    w(f"- **S českým názvem (fishao.cz):** {sum(1 for f in fish if f['names']['cs'])} / {len(fish)}")
    src = Counter(f["extra"].get("image_source") for f in fish if f["image"])
    w("- **Zdroj obrázků:** " + ", ".join(f"{k}: {v}" for k, v in src.most_common()))
    w(f"- **S konfliktem hodnot mezi tabulkami:** {sum(1 for f in fish if f['extra']['conflicts'])}")
    unc = Counter(u for f in fish for u in f["uncertain"])
    w(f"- **S nejistým polem (`uncertain`, UI ukáže „?\"):** {sum(1 for f in fish if f['uncertain'])} — "
      + ", ".join(f"{k}: {v}" for k, v in unc.most_common()))
    w(f"- **S přesným místem v oblasti (`area_spots`):** {sum(1 for f in fish if f['area_spots'])}")
    w("")

    w("## Zdroje")
    w("")
    w("Wiki nemá stránky jednotlivých ryb. Všechna data jsou řádky TablePress tabulek na těchto stránkách "
      "(snapshot nejbližší 2023-07-18 podle CDX):")
    w("")
    w("| stránka | snapshot | počet zachycení v CDX | tabulky |")
    w("|---|---|---|---|")
    for key, s in snaps.items():
        tabs = [x for x in sections if x["page"] == key]
        w(f"| [{key}]({s['source_url']}) | `{s['snapshot_timestamp']}` | {s['captures']} | {len(tabs)} |")
    w("")
    w(f"CDX (`fishaowiki.com/*`, status 200, collapse=urlkey) vrací {len(disc['cdx_rows'])} URL; "
      "ostatní HTML stránky jsou blog, komentáře a nesouvisející stránky (furniture, fruit-combos) — rybí data neobsahují.")
    w("")

    # ------------------------------------------------------------ glowing
    w("## Zářivá (glowing) varianta")
    w("")
    w("fishaowiki zářivé varianty neuvádí vůbec (žádné „glow\" / „shiny\" na stránkách ani v CDX). "
      "fishao.cz má u ryby řádek *Cena v obchodě / zářivá* → `has_glowing_variant: true` a cena v `glowing_info`. "
      "Kde fishao.cz stránku nemá nebo řádek chybí, je `null` (= zdroj neuvádí, ne „nemá\"). "
      "Zářivé **obrázky** nemá ani jeden zdroj → `image_glowing: null` všude.")
    w("")
    w("**Rozhodnutí uživatele (není ze zdroje):** zářivá varianta je stejná ryba, jen shiny — ve hře ji má každá ryba. "
      "Web to má aplikovat v transformačním kroku, ne přepisem dat ze scrapu.")
    w("")

    _cz_section(w, fish, cz)

    # ------------------------------------------------------------ missing in archive
    w("## Co v archivu chybí")
    w("")
    w("### Neúspěšná stahování (fetch selhal 3× nebo 404)")
    w("")
    w("\n".join(_md_list(fetch_failures.items(), lambda kv: f"`{kv[0]}` — {kv[1]['reason']}")))
    w("")
    w("### Ryby, jejichž obrázek nejde stáhnout")
    w("")
    w("\n".join(_md_list(image_failures, lambda x: f"`{x['fish_id']}`: " + "; ".join(
        f"`{t['url']}` → {t['error']}" for t in x["tried"]))))
    w("")
    noimg_src = [f for f in fish if not f["extra"]["image_sources"]]
    w(f"### Ryby bez obrázku ve zdroji ({len(noimg_src)})")
    w("")
    w("Řádek tabulky obrázek ryby nemá (nebo je ryba jen v textové tabulce all-in-one).")
    w("")
    w("\n".join(_md_list(noimg_src, lambda f: f"`{f['id']}` ({', '.join(sorted(pages_of[f['id']]))})")))
    w("")
    cleaned = [f for f in fish if f["extra"].get("image_note")]
    if cleaned:
        w("### Obrázky stažené s opraveným nebo dohledaným URL")
        w("")
        w("\n".join(_md_list(cleaned, lambda f: f"`{f['id']}`: {f['extra']['image_note']}")))
        w("")

    _resolve_section(w, cz.get("resolve_stats", {}))
    _manual_section(w, man)

    # ------------------------------------------------------------ missing fields
    w("## Chybějící pole")
    w("")
    w("`null` = hodnota není ani na wiki, ani (u času a rarity) na fishao.cz, **nebo** se zdroje neshodují. "
      "Ceny a počasí nejsou součástí datasetu (rozhodnutí uživatele) — sloupec *Max Price* se při parsování zahazuje.")
    w("")
    w("| pole | chybí u |")
    w("|---|---|")
    for fld in CHECK_FIELDS:
        n = sum(1 for f in fish if not f[fld])
        w(f"| `{fld}` | {n} |")
    w("")
    w("### Raw hodnota existuje, ale nejde jednoznačně rozparsovat")
    w("")
    w("Parsované pole je null, `*_raw` obsahuje text ze zdroje.")
    w("")
    for parsed, raw in PARSED_PAIRS:
        bad = [f for f in fish if f[raw] is not None and f[parsed] is None]
        w(f"- **{parsed}** ({len(bad)}): " + (", ".join(f"`{f['id']}`=`{f[raw]}`" for f in bad) or "—"))
    w("")
    w("### Ryby s chybějícími poli")
    w("")
    w("| ryba | chybí |")
    w("|---|---|")
    for f in fish:
        miss = [fld for fld in CHECK_FIELDS if not f[fld]]
        if miss:
            w(f"| `{f['id']}` | {', '.join(miss)} |")
    w("")

    # ------------------------------------------------------------ conflicts
    w("## Konflikty mezi tabulkami")
    w("")
    w("Ryba je ve více tabulkách (každá oblast, 5-star, all-in-one) a hodnoty se liší (porovnáno po normalizaci "
      "formátu). Varianty jsou v `extra.conflicts`, celé řádky v `extra.occurrences`. Většinu řeší pravidla "
      "(sekce Automatické řešení) nebo ruční CSV; jinak zůstává hlavní pole null.")
    w("")
    cc = Counter(k for f in fish for k in f["extra"]["conflicts"])
    field_of = {"Time": "time", "Season": "season", "Bait": "bait", "rarity": "rarity"}
    still = Counter(k for f in fish for k in f["extra"]["conflicts"] if f[field_of.get(k, k)] is None)
    w("| pole | ryb s konfliktem | z toho nevyřešeno |")
    w("|---|---|---|")
    for k, v in cc.most_common():
        w(f"| {k} | {v} | {still.get(k, 0)} |")
    w("")
    w("<details><summary>Všechny konflikty</summary>")
    w("")
    for f in fish:
        for k, vals in f["extra"]["conflicts"].items():
            w(f"- `{f['id']}` **{k}**: " + " / ".join(f"`{v}`" for v in vals))
    w("")
    w("</details>")
    w("")

    # ------------------------------------------------------------ duplicates
    w("## Duplicity a kolize id")
    w("")
    w("ID = slug jména po odstranění kvalifikátorů v závorce a slova `Unlockable` (např. `Arctic Char (Raft only)` → "
      "`arctic-char`). Kvalifikátory jsou v `extra.qualifiers`, původní zápisy v `extra.name_variants`.")
    w("")
    dup = [k for k, v in by_id.items() if v > 1]
    w(f"- Duplicitní id ve výstupu: {', '.join(dup) if dup else 'žádné'}")
    merged = [f for f in fish if len(f["extra"]["name_variants"]) > 1]
    w(f"- Ryb sloučených z různě zapsaných jmen: {len(merged)}")
    applied = aliases.get("fish", {})
    w(f"- Ručně schválené aliasy (`scraper/aliases.json` → `fish`): {len(applied)}")
    for a, b in applied.items():
        w(f"  - `{a}` → `{b}`")
    w("")
    comp = [c for c in candidates if c["complementary"]]
    w(f"### Podezřelé duplicity — kandidáti na alias ({len(candidates)}, z toho {len(comp)} komplementárních)")
    w("")
    w("Podobná id (difflib ≥ 0.85). *Komplementární* = jedno id je jen v all-in-one a druhé jen v ostatních "
      "tabulkách → velmi pravděpodobně ta samá ryba s překlepem. Nesloučeno, dokud se nepřidá do "
      "`aliases.json` → `fish` (`\"varianta\": \"cílové-id\"`).")
    w("")
    w("| A | B | podobnost | komplementární | zápisy A | zápisy B |")
    w("|---|---|---|---|---|---|")
    for c in candidates:
        w(f"| `{c['a']}` | `{c['b']}` | {c['ratio']} | {'ano' if c['complementary'] else ''} | "
          f"{'; '.join(c['a_names'])} | {'; '.join(c['b_names'])} |")
    w("")
    only_aio = [f for f in fish if pages_of[f["id"]] == {"all-in-one"}]
    not_aio = [f for f in fish if "all-in-one" not in pages_of[f["id"]]]
    w(f"### Jen v all-in-one ({len(only_aio)}) / chybí v all-in-one ({len(not_aio)})")
    w("")
    w("Jen v all-in-one: " + (", ".join(f"`{f['id']}`" for f in only_aio) or "—"))
    w("")
    w("Chybí v all-in-one: " + (", ".join(f"`{f['id']}`" for f in not_aio) or "—"))
    w("")

    # ------------------------------------------------------------ structure
    w("## Struktura a podezřelé věci")
    w("")
    w("### Varianty hlaviček tabulek")
    w("")
    hv = Counter((s["page"], tuple(s["headers"])) for s in sections)
    for (page, h), n in hv.items():
        w(f"- {page} ({n}×): {' | '.join(h)}")
    w("")
    w("### Oblasti")
    w("")
    w("Oblast = sekce (`<h2>` + tabulka) na area-fish (`kind: area`), tournament-fish (`kind: tournament`) a "
      "breeder-fish (`kind: backyard`). Popis ani obrázek oblasti wiki nemá → `description`/`image` null.")
    w("")
    w("Přesné místo uvnitř oblasti (molo, loď, pyramida, …) je u ryby v `area_spots` `{area_id: [spot]}` — "
      "filtruje se podle oblasti, místo se ukazuje jako poznámka. Furniture Factory je místo v Mystic Desert.")
    w("")
    w("| id | název | kind | ryb | místa |")
    w("|---|---|---|---|---|")
    for a in areas:
        w(f"| `{a['id']}` | {a['name']} | {a['kind']} | {len(a['fish_ids'])} | {', '.join(a.get('spots', []))} |")
    w("")
    w(f"### Hodnoty sloupce Area (all-in-one, 5-star), které neodpovídají žádné oblasti ({len(unmatched_area_tokens)})")
    w("")
    w("Překlepy nebo jiný název; do `areas[]` ryby se nepočítají. Lze schválit v `aliases.json` → `areas` "
      "(`\"text\": \"area-id\"`).")
    w("")
    w("\n".join(_md_list(unmatched_area_tokens.most_common(), lambda kv: f"`{kv[0]}` ({kv[1]}×)")))
    w("")
    w("### Oblasti podle tabulek vs. podle sloupce Area")
    w("")
    w("Ryba je v tabulce oblasti, ale text Area ji tam neuvádí (nebo naopak). `extra.area_sources` říká, odkud která oblast je.")
    w("")
    mism = []
    for f in fish:
        for a, src in f["extra"]["area_sources"].items():
            tab = any(":" not in s for s in src)
            txt = any(s.endswith(":Area") for s in src)
            has_text_col = any("Area" in o["cells"] for o in f["extra"]["occurrences"])
            if has_text_col and tab != txt:
                mism.append(f"`{f['id']}` — `{a}` jen podle {'tabulky' if tab else 'sloupce Area'}")
    w(f"Počet: {len(mism)}")
    w("")
    w("<details><summary>Seznam</summary>")
    w("")
    w("\n".join(_md_list(mism)))
    w("")
    w("</details>")
    w("")
    w("### Slovník návnad (bez oprav překlepů)")
    w("")
    bait = Counter(t for f in fish if f["bait"] for t in f["bait"])
    w(", ".join(f"`{b}` ({n})" for b, n in sorted(bait.items())))
    w("")
    w("### Ostatní poznámky parseru")
    w("")
    w("\n".join(_md_list(notes)))
    w("")
    w("### Pole na wiki → JSON")
    w("")
    w("| wiki | JSON |")
    w("|---|---|")
    w("| Fish | `name` (+ `extra.name_variants`, `extra.qualifiers`) |")
    w("| Bait | `bait[]` (kanonické: opravené překlepy, Shark Lure = Shark Bait), `bait_raw` (text ze zdroje) |")
    w("| Season | `season` (`\"always\"` nebo `[{from: \"MM-DD\", to}]`), `season_raw` |")
    w("| Time | `time` (`\"always\"` nebo `[{from,to}]`), `time_raw` |")
    w("| World record + fishao.cz Délka / maximální | `max_length_cm` `{min, max}`, `max_length_raw` (hodnoty + zdroje) |")
    w("| Max Price, fishao.cz ceny | **zahozeno** (jen `has_glowing_variant` z existence zářivé ceny) |")
    w("| hvězdy (obrázek `Nstar.png`) / Stars | `rarity` 1–5, `rarity_raw` |")
    w("| Area (all-in-one, 5-star) | → `areas[]` při přesné shodě, raw v `extra.occurrences` |")
    w("| Pool (Club) | `extra.pool` |")
    w("| Home points (Backyard) | `extra.home_points` |")
    w("")

    path.write_text("\n".join(L) + "\n")


def _cz_section(w, fish, cz):
    v = cz["validation"]
    w("## Druhý zdroj: fishao.cz")
    w("")
    w("Archiv fishao.cz (živá doména dnes přesměrovává na cizí web — brán jen Wayback). Každá ryba má stránku "
      "`/ryba/<slug>/` s blokem *Informace o rybě*. Uloženo surově v `data/fishao_cz.json` a u ryby v "
      "`extra.fishao_cz`. **Hlavní pole ryby zůstávají z fishaowiki**; fishao.cz doplňuje jen `names.cs`/`names.sk`, "
      "zářivou variantu a chybějící obrázky. Neukládají se jména hráčů (seznam „u kterých lze ulovit\", nabídky fosilií) "
      "ani text návodů.")
    w("")
    w(f"- stránek ryb v archivu: {cz['pages_total']}, spárováno {cz['matched_pages']} stránek na {cz['matched_fish']} ryb z wiki")
    w(f"- ryb z wiki bez stránky na fishao.cz: {sum(1 for f in fish if not f['extra'].get('fishao_cz'))}")
    w(f"- ryb s více stránkami na fishao.cz: {len(cz['multi_page'])}"
      + (" — " + ", ".join(f"`{k}` ({', '.join(s)})" for k, s in cz["multi_page"].items()) if cz["multi_page"] else ""))
    w(f"- nespárovaných stránek fishao.cz (ryba na wiki není nebo jiné jméno): {len(cz['unmatched'])}")
    w("")
    w("Párování: anglický název ze stránky (stejná normalizace jako id), pak slug URL, pak ručně schválené "
      "`aliases.json` → `fishao_cz` (`\"cz-slug\": \"wiki-id\"`).")
    w("")
    w(f"### Kandidáti na párování ({len(cz['candidates'])})")
    w("")
    w("| fishao.cz slug | anglicky | česky | možná wiki id |")
    w("|---|---|---|---|")
    for c in cz["candidates"]:
        w(f"| `{c['fishao_cz_slug']}` | {c['en']} | {c['cs']} | {', '.join(f'`{x}`' for x in c['wiki_ids'])} |")
    w("")
    cand = {c["fishao_cz_slug"] for c in cz["candidates"]}
    rest = [p for p in cz["unmatched"] if p["slug"] not in cand]
    w(f"### Ryby jen na fishao.cz ({len(rest)}) — nejsou ve fish.json")
    w("")
    w("<details><summary>Seznam</summary>")
    w("")
    for p in rest:
        f = p["fields"]
        w(f"- `{p['slug']}` — {f.get('Název / anglicky')} / {f.get('Název / česky')} "
          f"({f.get('Výskyt / oblast')}, {f.get('Výskyt / hvězdy')}) [{p['snapshot_timestamp']}]({p['source_url']})")
    w("")
    w("</details>")
    w("")
    w("### Křížová validace fishaowiki × fishao.cz")
    w("")
    w("Jen report — hodnoty z wiki se nepřepisují (kromě doplnění níže).")
    w("")
    w("| porovnání | rozdílů |")
    w("|---|---|")
    w(f"| hvězdy × Výskyt | {len(v['rarity'])} |")
    w(f"| Time × čas | {len(v['time'])} |")
    w(f"| délka: zdroje se liší → rozsah min–max | {len(v['length_range'])} |")
    w(f"| konfliktní názvy mezi více stránkami (nevyřešené) | {len(v['names_conflict'])} |")
    w("")
    w("**Doplněno z fishao.cz** (na wiki chybí, nejde rozparsovat nebo se tabulky neshodují; fishao.cz stránky se shodují "
      "a hodnota jde rozparsovat): " + ", ".join(f"{k}: {n}" for k, n in v["filled_by_cz"].items())
      + ". U ryby v `extra.filled_from.<pole>` = `{source, reason}`; `*_raw` pak obsahuje text z fishao.cz.")
    w("")
    for key, title in (("rarity", "Hvězdy"), ("time", "Čas")):
        w(f"<details><summary>{title} ({len(v[key])})</summary>")
        w("")
        for fid, a, b in v[key]:
            w(f"- `{fid}`: wiki `{a}` × fishao.cz `{b}`")
        w("")
        w("</details>")
        w("")
    big = [x for x in v["length_range"] if x[1]["max"] > 1.25 * x[1]["min"]]
    w(f"Délky v rozsahu: {len(v['length_range'])} ryb, z toho {len(big)} s rozdílem > 25 % (podezřelé):")
    w("")
    w("<details><summary>Seznam</summary>")
    w("")
    for fid, rng, raws in v["length_range"]:
        flag = " ⚠️" if rng["max"] > 1.25 * rng["min"] else ""
        w(f"- `{fid}` {rng['min']}–{rng['max']} cm{flag}: " + "; ".join(f"`{r['value']}` ({', '.join(r['sources'])})" for r in raws))
    w("")
    w("</details>")
    w("")
    w(f"Názvy ze dvou stránek, kde jedna má jen nepřeložené anglické jméno → vzat přeložený ({len(v['names_resolved'])}):")
    w("")
    w("<details><summary>Seznam</summary>")
    w("")
    for fid, lang, vals, chosen in v["names_resolved"]:
        w(f"- {lang} `{fid}`: " + " / ".join(vals) + f" → **{chosen}**")
    w("")
    w("</details>")
    w("")
    if v["names_conflict"]:
        w("Neřešitelné konflikty názvů (název = null):")
        w("")
        for fid, lang, vals in v["names_conflict"]:
            w(f"- název {lang} `{fid}`: " + " / ".join(vals))
        w("")
    w("### Názvy oblastí na fishao.cz")
    w("")
    w(", ".join(f"`{a}`" for a in cz["cz_area_names"]))
    w("")
    if cz["image_failures"]:
        w("### Nestažené obrázky z fishao.cz")
        w("")
        for x in cz["image_failures"]:
            w(f"- `{x['fish_id']}`: `{x['url']}` → {x['error']}")
        w("")


def _manual_section(w, man):
    w("## Ruční doplnění — `scraper/resolutions.csv`")
    w("")
    w("Zbylé konflikty a díry (návnada, sezóna, čas, rarita, český název), které žádný zdroj jednoznačně neřeší. "
      "CSV (`;`, UTF-8) jde otevřít v Excelu: sloupec `options` = hodnoty z wiki s tabulkami, odkud jsou, "
      "`fishao_cz` = co uvádí fishao.cz (česky, jako nápověda). Vyplněná `value` se při dalším buildu použije "
      "(`extra.filled_from.<pole>.source = \"manual\"`) a při přegenerování CSV se nikdy nepřepíše.")
    w("")
    by = Counter((r["field"], r["problem"]) for r in man["rows"])
    open_by = Counter((r["field"], r["problem"]) for r in man["open"])
    w("| pole | problém | celkem | otevřeno |")
    w("|---|---|---|---|")
    for (fld, prob), n in sorted(by.items()):
        w(f"| {fld} | {prob} | {n} | {open_by.get((fld, prob), 0)} |")
    w("")
    w(f"Použito ručních hodnot: {man['applied']}; otevřeno: {len(man['open'])}.")
    w("")


def _resolve_section(w, stats):
    w("## Automatické řešení konfliktů (`scraper/resolve.py`)")
    w("")
    w("Čas, sezóna a návnada, kde se tabulky wiki neshodují nebo je hodnota nejistá. Pořadí pravidel: "
      "**certain_consensus** (zahodit `?`/`???`/datum ve sloupci času; zbylé jisté hodnoty se shodují) → "
      "**fishao_cz_tiebreak** (jisté hodnoty se liší, vybrána ta, se kterou souhlasí fishao.cz) → "
      "**fishao_cz_fill** (wiki nemá jistou hodnotu, fishao.cz má jednoznačnou). "
      "Porovnává se rozparsovaný tvar, takže `Sept - March` = `Sep-Dec, Jan-March` = `01.09. - 31.03.`. "
      "Řádky s prohozeným Season/Time jsou opravené (`fix` v `extra.occurrences`). "
      "Rozhodnutí je u ryby v `extra.filled_from.<pole>` včetně kandidátů. "
      "Nakonec **newer_source**: kde se wiki a fishao.cz pořád neshodují, vyhrává novější fishao.cz a pole jde do "
      "`uncertain` (UI „?\"); **uncertain_value**: použita hodnota s `?` ze zdroje (taky `uncertain`). "
      "Oblasti: když fishao.cz uvádí jinou sadu oblastí, použije se ta (`extra.areas_wiki` drží původní).")
    w("")
    w("| pole | pravidlo | ryb |")
    w("|---|---|---|")
    for (fld, rule), n in sorted(stats.items()):
        w(f"| {fld} | {rule} | {n} |")
    w("")
