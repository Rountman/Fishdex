# Fishdex — CLAUDE.md

Fanouškovská pomůcka do hry FishAO: album všech ryb s možností odškrtávat
chycené ryby. Rekonstrukce zaniklého fishaowiki.com/fishdex z dat
vytažených z Wayback Machine.

## Struktura projektu

```
data/          # výstup scrapu — fish.json, areas.json, report.md (NEUPRAVOVAT RUČNĚ)
images/        # obrázky ryb ze scrapu
scraper/       # Python scraper (requests + BeautifulSoup), cache/ v .gitignore
web/           # samotná webovka
```

## Pravidla pro data

- `data/` je jediný zdroj pravdy. Nikdy si nevymýšlej ryby, časy, návnady
  ani rarity. Co v datech chybí, UI zobrazí jako „neznámé", ne odhad.
- Pokud web potřebuje data v jiném tvaru, napiš transformační skript
  (`scripts/build-data.ts`), neměň JSON ručně.
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
- Filtry: oblast, rarita, návnada (multi-výběr, NEBO), čas, chyceno / nechyceno /
  chybí zářivá; při vybrané oblasti Backyard i „za domem: mám / nemám“.
- Délky ryb se jen zobrazují (text), žádné měřítko ani zadávání.
- Vyhledávání podle jména (fuzzy, bez diakritiky).
- Undo posledního kliknutí (toast s „Vrátit", 5 s).

## Progres uživatele (localStorage)

- Progres je per prohlížeč a zařízení, nesynchronizuje se. Každý
  návštěvník vidí jen svůj.
- Schéma: `fishdex:progress:v1` → `{ version, updatedAt, fish: { [id]: { caught, caughtGlowing, bred?, caughtAt? } } }`.
  `bred` jen u ryb z Backyard.
  Ukládej jen ryby s aspoň jedním `true`.
- Při změně schématu přidej migraci z předchozí verze, nikdy data tiše nezahazuj.
- Pokud localStorage není dostupný (anonymní režim, blokace), web musí
  fungovat dál a zobrazit nenápadnou hlášku, že progres se neuloží.
- Export: stáhne `fishdex-progress-YYYY-MM-DD.json`. Import: validuj
  strukturu, ukaž náhled (kolik ryb) a nabídni Sloučit / Nahradit.
- Nenápadná připomínka zálohy: po prvních ~20 chycených rybách a pak
  jednou za čas ukaž hint „Progres je jen v tomto prohlížeči — exportuj zálohu".
  Musí jít trvale skrýt.
- ID ryb v progresu = `id` z `data/fish.json`. Ryba, která v datech už není,
  zůstane v progresu uložená, jen se nezobrazí.
- Stav filtrů v URL query, ať jde odkaz sdílet.

## Designový směr

Koncept: **terénní deník rybáře / muzejní katalog** — ne SaaS dashboard.
Papírová textura nebo hluboká voda, ručně působící typografie, ryby jako
exponáty. Zářivé varianty = bioluminiscence (jemná záře, ne neon).

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