# Fishdex — CLAUDE.md

Fanouškovská pomůcka do hry FishAO: album všech ryb s možností odškrtávat
chycené ryby. Rekonstrukce zaniklého fishaowiki.com/fishdex z dat
vytažených z Wayback Machine.

## Struktura projektu

```
data/          # výstup scrapu — fish.json, areas.json, furniture*.json, report.md (NEUPRAVOVAT RUČNĚ)
images/        # obrázky ryb a nábytku ze scrapu (images/fish, images/furniture)
scraper/       # Python scraper (requests + BeautifulSoup), cache/ v .gitignore; nábytek = furniture.py
web/           # samotná webovka (Vite + React + TS)
  scripts/build-data.ts   # data/ + images/ -> src/data/*.json, public/fish/*.webp (generované, v .gitignore)
  src/styles/tokens.css   # design tokeny (viz prototypes/styleguide.html)
  src/progress/           # progres v localStorage + testy
prototypes/    # schválené mockupy a styleguide (fáze 1–2), DECISIONS.md
```

## Pravidla pro data

- `data/` je jediný zdroj pravdy. Nikdy si nevymýšlej ryby, časy, návnady
  ani rarity. Co v datech chybí, UI zobrazí jako „neznámé", ne odhad.
- Pokud web potřebuje data v jiném tvaru, napiš transformační skript
  (`web/scripts/build-data.ts`, spouští se `npm run data` i před dev/build),
  neměň JSON ručně. Bílé pozadí u 17 obrázků z fishao.cz odstraňuje tentýž skript.
- Před prací s daty si přečti `data/report.md` — jsou tam známé díry.
- Scraper: max 1 request/s na web.archive.org, vše cachovat, používat `id_`
  URL varianty pro čisté HTML.

## Stack

- Vite + React + TypeScript (strict). Žádný Next.js — je to statický web.
- Styling: CSS Modules nebo vanilla CSS s custom properties. Tailwind jen
  pokud ho výslovně schválím.
- Animace: Motion (framer-motion) pro UI, GSAP jen pro scroll efekty.
- Bez backendu. Stav chycených ryb v `localStorage` (vše v try/catch),
  plus export/import do JSON souboru, ať uživatel nepřijde o progres.
- Hosting: **GitHub Pages** (viz sekce níže).

## GitHub Pages — povinná pravidla

- Deploy přes GitHub Actions (`.github/workflows/deploy.yml`, oficiální
  `actions/deploy-pages`), build při pushi do `main`. Žádná větev gh-pages
  ručně.
- `vite.config.ts`: `base` nastav na `/<nazev-repa>/` (z env proměnné,
  lokálně `/`). Všechny cesty k assetům přes `import.meta.env.BASE_URL`,
  nikdy absolutní `/images/...`.
- Pages neumí SPA fallback → **žádný BrowserRouter s cestami**. Použij
  HashRouter (`#/fish/xyz`) nebo jen query parametry (`?fish=xyz`).
  Detail ryby jako modal/panel nad mřížkou, ne samostatná stránka.
- Origin `<ucet>.github.io` sdílí localStorage se všemi mými project pages
  → všechny klíče s prefixem `fishdex:` (např. `fishdex:caught:v1`)
  a verzí schématu kvůli budoucím migracím.
- Obrázky ryb zkomprimuj do webp už v build skriptu; žádný soubor nad
  ~1 MB, celé repo drž výrazně pod 1 GB.
- Do repa necommituj `scraper/cache/` (raw HTML) — jen výsledné `data/`
  a `images/`.
- Přidej `public/.nojekyll`.
- Po deployi ověř přes Playwright i produkční URL (base path, obrázky,
  favicon, export/import).

## Doménová logika — chytání

- Každá ryba má 2 nezávislé stavy: `caught` a `caughtGlowing`.
  Zářivá varianta se počítá zvlášť (ryba jde chytit 2×).
- Ryby bez zářivé varianty (podle dat) druhý stav nemají a UI ho neukazuje.
- Ryby z Backyard (`areas` obsahuje `backyard`) mají navíc třetí nezávislý stav
  `bred` = „mám za domem“ (ikonka domku na kartě, přepínač v detailu).
  Ostatní ryby ho nemají.
- Ovládání karty ryby:
  - klik → přepne `caught`
  - Shift+klik nebo klik na ikonku záře → přepne `caughtGlowing`
  - mobil: tap = caught, dlouhý stisk (500 ms) = glowing
- Progres: celkem / per oblast, normální a zářivé zvlášť; u Backyard i „mám za domem“.
- Filtry: oblast a pod ní její místa jako plnohodnotné položky (Laketown › farma; jen ryby
  s uvedeným místem), u každé volby filtru počet ryb podle ostatních aktivních filtrů,
  rarita, návnada (multi-výběr, NEBO), čas, chyceno / nechyceno /
  chybí zářivá; při vybrané oblasti Backyard i „za domem: mám / nemám“.
- Délky ryb se jen zobrazují (text), žádné měřítko ani zadávání.
- Vyhledávání podle jména (fuzzy, bez diakritiky).
- Undo posledního kliknutí (toast s „Vrátit", 5 s).

## Záložka Nábytek

- Data: `data/furniture.json` + `furniture_sets.json` ze `scraper/furniture.py` (hlavní zdroj fishaofunwiki,
  české názvy z fishao.cz, kontrola proti archivu fishaowiki). Report: `data/furniture-report.md`.
- Kolekce: 14 setů + mimo sety Rostliny / Obrazy / Ostatní. Každý kus patří do právě jedné.
- Jeden stav `owned` (razítko VLASTNĚNO), klik přepne, undo toast jako u ryb. Kompletní set = razítko.
- Filtry v URL s prefixem `f` (`tab=furniture&fset=&ftype=&frarity=&fstatus=&fq=`).

## Progres uživatele (localStorage)

- Progres je per prohlížeč a zařízení, nesynchronizuje se. Každý
  návštěvník vidí jen svůj.
- Schéma: `fishdex:progress:v2` → `{ version, updatedAt, fish: { [id]: { caught, caughtGlowing, bred?, caughtAt? } }, furniture: { [id]: { owned, ownedAt? } } }`.
  v1 (bez `furniture`) se migruje, klíč v1 zůstává jako záloha.
  `bred` jen u ryb z Backyard.
  Ukládej jen ryby s aspoň jedním `true`.
- Při změně schématu přidej migraci z předchozí verze, nikdy data tiše nezahazuj.
- Pokud localStorage není dostupný (anonymní režim, blokace), web musí
  fungovat dál a zobrazit nenápadnou hlášku, že progres se neuloží.
- Export: stáhne `fishdex-progress-YYYY-MM-DD.json`. Import: validuj
  strukturu, ukaž náhled (kolik ryb) a nabídni Sloučit / Nahradit.
- Nenápadná připomínka zálohy: po prvních ~20 chycených rybách a pak
  jednou za čas ukaž hint „Zápisy z deníku jsou jen v tomto prohlížeči — stáhni si zálohu".
  Musí jít trvale skrýt.
- ID ryb v progresu = `id` z `data/fish.json`. Ryba, která v datech už není,
  zůstane v progresu uložená, jen se nezobrazí.
- Stav filtrů v URL query, ať jde odkaz sdílet.

## Designový směr

Koncept: **terénní deník rybáře / muzejní katalog** — ne SaaS dashboard.
Pozadí je jednotný světle modrý papír s jemným přechodem (bez textury), tmavý
režim = noční deník. Ryby jako vlepené exponáty s razítkem ULOVENO. Zářivé varianty = bioluminiscence (jemná záře, ne neon).

Tokeny (výchozí návrh, doladit podle obrázků ryb):
- Fonty (schváleno): **Alegreya** (nadpisy, jména ryb, poznámky kurzívou)
  + **Schibsted Grotesk** (data). Žádné ručně psané písmo. NIKDY Inter, Roboto, Arial.
- Barvy definuj jako CSS custom properties v OKLCH na `:root`, s dark mode.
- Rarity mají vlastní barvy, ale nespoléhej jen na barvu — i ikona/text.
- Spacing škála: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96.

### Zakázané vzory (generický AI look)

- fialovo-modré gradienty, glassmorphism všude, neonové glow na všem
- vycentrovaný hero s „badge" pillem nad nadpisem
- mřížka 3 stejných karet s emoji/lucide ikonou nahoře
- shadcn komponenty v defaultním vzhledu
- `rounded-2xl` + `shadow-lg` na každém prvku
- generické texty typu „Discover", „Unlock", „Seamless"
- dekorativní animace bez funkce

Místo toho: asymetrie, výrazná typografická hierarchie, hustá ale čitelná
data (je to nástroj — uživatel chce rychle najít rybu), detaily z herního
světa (měřítko, štítky, razítko „ULOVENO").

## Workflow

- Před větší UI změnou nejdřív navrhni plán a počkej na schválení.
- Po každé UI změně udělej screenshot přes Playwright MCP na 1440 px
  a 375 px a sám zkontroluj: přetékání, kontrast, zarovnání, prázdné stavy.
- Testuj prázdné a extrémní stavy: ryba bez obrázku, dlouhé jméno,
  0 výsledků filtru, 100 % chyceno.
- Přístupnost: ovládání klávesnicí, viditelný focus, `aria-pressed`
  na togglech chycení, kontrast min. WCAG AA.
- Výkon: obrázky lazy-load, ve webp, mřížka plynulá i s 300+ rybami.
- Commituj po malých funkčních krocích s popisnou zprávou.

## Komunikace

- Odpovídej česky, kód a názvy v angličtině.
- Když si nejsi jistý daty nebo zadáním, zeptej se — nehádej.