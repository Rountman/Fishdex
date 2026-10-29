# Fishdex: předávka z fáze SCRAPE do návrhu designu

> **Prompt pro Clauda:** Přečti si `CLAUDE.md` (hlavně *Designový směr*, *Zakázané vzory*,
> *Doménová logika* a *Workflow*) a tento dokument. Data jsou hotová, web zatím neexistuje.
> **Úkol: navrhni design webu.** Zatím nic neimplementuj, nejdřív předlož návrh a počkej na
> schválení (viz CLAUDE.md → Workflow). Návrh má obsahovat:
>
> 1. **Koncept a vizuální jazyk:** jak pojmout „terénní deník rybáře / muzejní katalog“.
>    Navrhni 2 varianty a jednu doporuč.
> 2. **Design tokeny:** fonty, barvy v OKLCH pro light i dark, barvy rarit včetně ikony nebo
>    textu (nesmí to stát jen na barvě), spacing, rádiusy, stíny, vzhled záře u zářivé varianty.
> 3. **Layout pro 1440 px a 375 px:** mřížka ryb, karta ryby, detail ryby (modal nebo panel),
>    filtry, vyhledávání, progres celkem a podle oblastí, toast s „Vrátit“, hláška o záloze,
>    export a import.
> 4. **Kartu ryby ve všech stavech:** nechyceno, chyceno, chycena zářivá, obojí, pole s „?“,
>    dlouhé jméno, focus, hover a mobilní long-press.
> 5. **Prázdné a extrémní stavy:** 0 výsledků filtru, 100 % chyceno, nedostupný localStorage.
> 6. **Ovládání klávesnicí a přístupnost:** `aria-pressed`, viditelný focus, kontrast AA.
>
> Navrhuj nad skutečnými daty z `data/`. Konkrétní čísla a hraniční případy jsou níže.

---

## 1. Co se udělalo

**Zdroje.** Obě stránky jsou dnes mrtvé a data jsou z archivu Wayback Machine.
- **fishaowiki.com** je hlavní zdroj. Je to WordPress s tabulkami podle oblastí plus tabulky
  5-star, breeder, tournament a all-in-one. Snapshot je nejbližší k 2023-07-18, obsah je
  zhruba z roku 2018.
- **fishao.cz** je druhý, novější zdroj (snapshot 2023-12). Každá ryba tam má vlastní stránku.
  Dodal české názvy, informaci o zářivé variantě, přesná místa v oblastech, 21 obrázků
  a novější hodnoty tam, kde se zdroje rozcházely.

**Scraper.** Je v `scraper/` (Python, requests + BeautifulSoup).
- Stahuje nejvýš 1 request/s a všechno ukládá do cache (`scraper/cache/`, je v .gitignore).
- Dá se pustit znovu a výsledek je deterministický.
- Spuštění: `scraper/.venv/bin/python scraper/scrape.py`.

**Jak se data čistila.** Každé rozhodnutí je zapsané u ryby v `extra` a v `data/report.md`.
- Různé zápisy jmen se sloučily do jednoho stabilního `id`. Překlepy se slučovaly jen se
  souhlasem uživatele (`scraper/aliases.json`).
- Časy a sezóny se rozparsovaly z obou zdrojů a jejich formátů do jednotného tvaru.
- Návnady jsou kanonické: překlepy jsou opravené a *Shark Lure = Shark Bait*.
- Kde se zdroje neshodují, platí novější fishao.cz a pole se označí jako nejisté (UI ukáže „?“).
- Ceny a počasí jsou **záměrně vyřazené** (rozhodnutí uživatele).
- Ruční opravy jdou přes `scraper/resolutions.csv` a build je převezme.

## 2. Data pro web

`data/fish.json` obsahuje **615 ryb**, `data/areas.json` **22 oblastí**. Obrázky jsou
v `images/fish/<id>.png`.

### Záznam ryby (reálný příklad, zkrácený)

```json
{
  "id": "arapaima",                       // STABILNÍ klíč progresu uživatele, nikdy neměnit
  "name": "Arapaima",
  "names": { "en": "Arapaima", "cs": "Arapaima velká" },
  "areas": ["aquayama", "rio-tropical"],  // filtruje se podle těchto velkých oblastí
  "area_spots": {},                       // např. {"pinheira-beach": ["Pier"]}: poznámka „na molu“
  "time": [{ "from": "20:00", "to": "11:00" }],   // nebo "always" nebo null; může přecházet přes půlnoc
  "season": [{ "from": "07-01", "to": "09-30" }], // MM-DD; nebo "always" nebo null; může přecházet přes Nový rok
  "rarity": 5,                            // 1–5 hvězd
  "bait": ["Fish", "Lures"],              // kanonické anglické tokeny (viz níže)
  "max_length_cm": { "min": 448, "max": 449 },
  "max_length_label": "(448–449 cm)?",    // hotový text k zobrazení; při shodě zdrojů "449 cm"
  "has_glowing_variant": true,
  "uncertain": ["max_length"],            // pole, u kterých UI ukáže „?“
  "image": "images/fish/arapaima.png",
  "image_glowing": null,                  // zářivé obrázky neexistují nikde
  "time_raw": "…", "season_raw": "…", "bait_raw": "…", "rarity_raw": "…",  // NEZOBRAZOVAT (viz pravidla)
  "source_url": "…", "snapshot_timestamp": "…", "extra": { … }             // pro audit, ne pro UI
}
```

Záznam oblasti:
`{"id": "pinheira-beach", "name": "Pinheira Beach", "kind": "area", "spots": ["Pier", "Pyramid"], "fish_ids": [...], "description": null, "image": null}`

### Pravidla pro UI, která z dat plynou

- **Zobrazuj jen parsovaná pole** (`time`, `season`, `bait`, `rarity`, `max_length_label`).
  Pole `*_raw` můžou obsahovat český text z fishao.cz (`kdykoliv`, `01.07. - 30.09.`).
- **`null` znamená „neznámé“.** Nikdy neodhaduj (CLAUDE.md).
- **„?“ u pole:** pokud je název pole v `uncertain` (`time`, `season`, `bait`,
  `max_length`), UI ukáže jemný otazník nebo štítek „nejisté“. U délky už „?“ obsahuje
  i `max_length_label`, nezdvojuj ho. Nejisté pole má 159 ryb: délka 92, čas 54,
  sezóna 16, návnada 12.
- **Zářivá varianta:** uživatel rozhodl, že ji má každá ryba (`has_glowing_variant: true`
  u všech 615). Každá karta tedy má druhý stav `caughtGlowing`. Zářivý obrázek neexistuje,
  takže záři musí udělat **CSS efekt nad normálním obrázkem** („bioluminiscence“,
  žádný neon).
- **Lokace:** filtruje se podle `areas`. Přesné místo z `area_spots` se ukazuje jako
  poznámka, např. „Pinheira Beach · molo“.
- **Jména:** UI je ve dvou jazycích, CZ a EN. `names.cs` je vyplněné u všech ryb, u 5 z nich
  je to anglická náhrada (african-mottled-eel, blue-panchax, bluestripe-pipefish,
  crocodile-tooth-pipefish, sulawesi-coelacanth). Hledání má fungovat v obou jazycích,
  bez diakritiky a fuzzy.
- **Překlady UI:**
  - Návnady a místa jsou anglické tokeny, takže potřebují slovník pro UI.
  - České názvy návnad jsou ve `scraper/baitfmt.py` → `CZECH`, chybí Pelican Lure a Star Lure.
  - Česká místa (`z mola`, `z člunu`, `z voru`, `v pyramidě`, `za plotem`, `farma`,
    `uvnitř`/`vně`, levá slaná / pravá sladká nádrž) jsou ve `scraper/places.py` → `SPOTS`.

## 3. Čísla a hraniční případy pro návrh

| | |
|---|---|
| Ryb / oblastí | 615 / 22: 17 běžných, 4 turnaje (`kind: tournament`), 1 Backyard (`kind: backyard`) |
| Rarita | 1★ 48 · 2★ 102 · 3★ 153 · 4★ 150 · 5★ 162 |
| Největší oblasti | Palm Island 84, Backyard 83, Club 80; nejmenší Pirate Cave 7 |
| Ryby ve víc oblastech | 33 (max 4) |
| Přesná místa (`area_spots`) | 292 ryb: Outside 78, Salt Water Pond 50, Pier 44, Boat 38, Inside 38, Fresh Water Pond 31, Raft 19, Enclosure 15, Pyramid 7, Trout Farm 6, Furniture Factory 5, Monster Pond 3 |
| Čas | 514 ryb „kdykoliv“; 48 oken přes půlnoc (`from > to`), 3 ryby s víc okny; null u 2 ryb |
| Sezóna | 570 ryb „celý rok“; 9 rozsahů přes Nový rok; null u žádné ryby |
| Návnady (16) | Insects 337, Fish 302, Vegetal 135, Dough 118, Lures 110, Shark Bait 46, Prehistoric Bait 45, Meat 37, Barracuda/Tuna/Marlin/Monkfish/Pelican/Star Lure, Hook, Monster Bait |
| Délka | 2 cm až 1974 cm, 2 ryby bez délky |
| Nejdelší jméno | EN „Spotted Tiger Shovelnose Catfish“ (32 znaků), CZ „Štika americká červenoploutvá“ (29) |
| **Obrázky** | PNG s průhledností, **malé**: typicky 120×120 px (594 z wiki); 21 z fishao.cz je širších (~300×94). Max 300 px, všechny obrázky dohromady 10 MB |

Důsledky pro návrh:
- **Obrázky jsou malé, nezvětšuj je moc nad 2×**, jinak budou rozmazané. Ryby mají různé
  poměry stran (úhoř vs. platýs), takže karta potřebuje jednotný rámeček a obrázek
  `object-fit: contain`. Dva zdroje mají mírně jiný styl kresby.
- Filtry času a sezóny jsou užitečné jen pro menšinu ryb. Můžou být sekundární
  (např. „aktivní teď“ podle místního času, ale herní čas může být jiný; neověřeno, nehádej).
- Mřížka musí zůstat plynulá s 615 kartami.

## 4. Co dál z CLAUDE.md platí pro web

- Vite + React + TypeScript strict, žádný Tailwind bez schválení, Motion pro UI.
- GitHub Pages: HashRouter nebo query parametry, `base` z env proměnné, `public/.nojekyll`.
- Data se pro web upravují jen skriptem `scripts/build-data.ts`, `data/` se ručně needituje.
  Ten skript má mimo jiné převést obrázky do webp.
- Progres: `fishdex:progress:v1` → `{ version, updatedAt, fish: { [id]: { caught, caughtGlowing, caughtAt? } } }`.
- Ovládání: klik = chyceno, Shift+klik nebo ikonka = zářivá, na mobilu long-press 500 ms = zářivá,
  Undo toast 5 s, export/import JSON se Sloučit/Nahradit, hint o záloze.
- Zakázaný generický AI look (viz CLAUDE.md). Fonty NIKDY Inter, Roboto ani Arial.

## 5. Otevřené body (nejsou blokující)

- `scraper/resolutions.csv` obsahuje 80 hodnot s „?“, které může uživatel ručně ověřit.
- Nemají dohledanou hodnotu:
  - konec časového okna u 2 ryb (`22:00-?`, `02:00-?`), takže `time` je null,
  - délku u 2 ryb,
  - český název u 5 ryb.
- Oblasti nemají popis ani obrázek (`description`/`image` jsou null). Pokud je design
  potřebuje, musí fungovat i bez nich, nebo použít ilustraci, ne vymyšlený text.
- Podrobnosti ke každé díře jsou v `data/report.md`.
