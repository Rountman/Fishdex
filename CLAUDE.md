# Fishdex — CLAUDE.md

Fanouškovská pomůcka do hry Fishao: album všech ryb s možností odškrtávat
chycené ryby. Rekonstrukce zaniklého fishaowiki.com/fishdex z dat
vytažených z Wayback Machine.

## Struktura projektu

```
data/          # výstup scrapu — fish.json, areas.json, fishao_net.json, furniture*.json, reporty (NEUPRAVOVAT RUČNĚ)
images/        # obrázky ryb a nábytku ze scrapu (images/fish, images/furniture)
scraper/       # Python scraper archivu (requests + BeautifulSoup), cache/ v .gitignore; nábytek = furniture.py;
               # oficiální wiki = fishao_net.mjs (Node, běží bez Pythonu)
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
- Před prací s daty si přečti `data/report.md` a `data/fishao-net-report.md` — jsou tam známé díry.
- **Hlavní zdroj je oficiální wiki fishao.net** (`data/fishao_net.json`, `node scraper/fishao_net.mjs`):
  oblasti, místa, zóny Palm Islandu, rarita, „× vzácnější“, návnady, čas, sezóna, délky, chov, odemknutí.
  Databáze je JS literál v bundlu wiki — čte se jako text, NIKDY se nespouští. Archivní scrape
  (`data/fish.json`) dává už jen id, české názvy, světové rekordy a obrázky.
- České názvy: z archivu; kde archiv má jen kopii anglického, doplní se z fishao.net (`name_cs`, stránka
  ryby `/wiki/fish/<id>` s `Accept-Language: cs`), pak z fishao-tracker.cz. Doplnění vypíše `npm run data`.
- **fishao-tracker.cz** (`data/fishao_tracker.json`, `node scraper/fishao_tracker.mjs`, report
  `data/fishao-tracker-report.md`): jediný zdroj **zón Moray turnaje** (fishao.net je nemá). Stejné zóny
  A–H jako Palm Island (`EFPT_PALM_ISLAND_ZONE_*`; „Vnější oblast“ = A … „Malé ostrovy“ = H), zóny
  Palm Islandu z něj sedí s fishao.net. Bundle se čte jako text, nespouští se.
  Z téhož bundlu i **odhad výkupní ceny** (`FISHAO_ESTIMATED_PRICES` → `estimated_prices` → `Fish.price`):
  výpočet trackeru, ne skutečná cena, web ho ukazuje jen jako „~min–max FB“ (karta + detail, bez řazení
  a filtru). Ceny od hráčů z jejich Firestore nebereme.
- Ruční opravy dat ani „?“ u sporných časů se už nepoužívají — co říká fishao.net, platí.
- Scraper: max 1 request/s na web.archive.org, vše cachovat, používat `id_`
  URL varianty pro čisté HTML.

## Stack

- Vite + React + TypeScript (strict). Žádný Next.js — je to statický web.
- Styling: CSS Modules nebo vanilla CSS s custom properties. Tailwind jen
  pokud ho výslovně schválím.
- Animace: Motion (framer-motion) pro UI, GSAP jen pro scroll efekty.
- Bez backendu. Stav chycených ryb v `localStorage` (vše v try/catch),
  plus export/import do JSON souboru, ať uživatel nepřijde o progres.
  **Jediná výjimka:** veřejný chov v záložce Chovatelé (Cloudflare Worker + D1 ve `worker/`,
  viz sekce níže). Vše ostatní funguje bez přihlášení i bez dostupného serveru.
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
- Filtry: oblast a pod ní její místa jako plnohodnotné položky (Laketown › farma). Podle fishao.net
  je místo vždy oddělené: ryba s místem v oblasti bere JEN tam, ve volné vodě oblasti ne (žádné „i odsud“).
  Místa: Laketown (farma), Mystic Desert (pyramida, továrna), Cool Mountain (vor), Pinheira Beach (molo),
  Thombani Town (za plotem), Seagull Harbor (člun), Club (slaná / sladká nádrž; Monster Pond neexistuje),
  Palm Island a Moray turnaj (`ZONED_AREAS`: zóny A–H jako místa `Zone A`…; `zones` u ryby, ryba bez zóny
  ve zdroji = všechny zóny). Palm Island, Moray turnaj a Club nemají volnou vodu (`open: false`): jejich výběr
  ukáže všechny ryby všech jejich míst, každou jednou. Přepínač „Jen odsud“ (`only=1`) se ukáže jen tam,
  kde ryba může být na víc místech oblasti (zóny).
- Mapa se zónami (`ZoneMap`, prop `area`) nad mřížkou po výběru Palm Islandu, Moray turnaje nebo jejich zóny:
  oficiální obrázek Palm Islandu (`images/maps/palm-island.webp` ze scraperu → `public/maps/`), turnaj se
  chytá na téže mapě. Přes něj naše vrstva zón z mřížky 13 × 13 (`palmZones.json`, viewBox 0 0 12.5 12.5
  jako na fishao.net). Klik na zónu = filtr zóny, znovu = celá oblast. Ovládání klávesnicí přes legendu
  vedle mapy (SVG je `aria-hidden`).
  V detailu ryby žádná mapka, jen text „zóny B, C, G“ / „všechny zóny“.
  Řazení podle rarity: hvězdy, pak „× vzácnější“, pak jméno. U každé volby filtru počet ryb podle ostatních aktivních filtrů,
  rarita, návnada (multi-výběr, NEBO), čas, velikost (od–do cm, ryba
  se ukáže, když se její rozsah úlovku překrývá se zadaným), chyceno / nechyceno /
  chybí zářivá; při vybrané oblasti Backyard i „za domem: mám / nemám“ a „Chovatel“ (hráč z registru).
- Délky ryb se zobrazují jako text a filtrují rozmezím, žádné měřítko ani zadávání ulovené délky.
- Vyhledávání podle jména (fuzzy, bez diakritiky).
- Undo posledního kliknutí (toast s „Vrátit", 5 s).

## Záložka Nábytek

- Data: `data/furniture.json` + `furniture_sets.json` ze `scraper/furniture.py` (hlavní zdroj fishaofunwiki,
  české názvy z fishao.cz, kontrola proti archivu fishaowiki). Report: `data/furniture-report.md`.
- Kolekce: 14 setů + mimo sety Rostliny / Obrazy / Ostatní. Každý kus patří do právě jedné.
- Jeden stav `owned` (razítko VLASTNĚNO), klik přepne, undo toast jako u ryb. Kompletní set = razítko.
- Filtry v URL s prefixem `f` (`tab=furniture&fset=&ftype=&frarity=&fstatus=&fq=`).

## Záložka Timery

- Herní odpočty v `web/src/timers/`: maso od Sida (Aquayama) 10 dní (archiv fishao.cz),
  Bob (Rio Tropical) 7 dní (neoficiální přepisy wiki),
  továrna na nábytek 2 dny (ověřeno uživatelem, bez popisku). Odpočet běží od kliknutí na „Vybráno“, čas jde ručně upravit.
- Uloženo jen v `fishdex:timers:v1` → `{ version, collectedAt: { [id]: epochMs } }`, mimo export progresu.
- URL `tab=timers`.

## Záložka Aktuální

- Inspirace přehledem fishao.net/wiki: Teď berou (zbývá), Brzy začnou (do 24 h), Sezóna končí
  (dní včetně dneška + poslední den), Sezóna začne (za kolik dní + od kdy). Počítá se jen z dat
  (`web/src/current/current.ts`, testy proti přehledu fishao.net), nic se nestahuje za běhu.
- Filtry: Skrýt chycené (`chide=1`) a Oblast (`carea=`); URL `tab=current`. Klik na řádek otevře detail.
- Mockup: `prototypes/b-aktualni/`.

## Záložka Chovatelé (jediná část s backendem)

- Veřejný registr toho, co hráči chovají za domem (`bred`). Nic jiného se nezveřejňuje.
  URL `tab=breeders`. Záložka je jen seznam hráčů (nejvíc ryb nahoře) + lístek Můj zápis, žádné filtry ani hlavička.
  Pruh ryb u hráče je jedno tlačítko: rozbalí pod řádkem jeho ryby jako karty z mřížky (FishGrid, tvoje stavy, detail);
  žádné přesměrování. Filtr Chovatel v Ryby › Backyard (`area=backyard&breeder=<č. zápisu>`) zůstává.
- Přihlášení přes Discord OAuth, scope jen `identify`. Zobrazuje se **avatar z Discordu a Fishao přezdívka**,
  nikdy Discord jméno. Přezdívka 3–20 znaků, unikátní bez ohledu na velikost písmen, nepředvyplňuje se.
- Zveřejnění je opt-in (tlačítko). Po zveřejnění se změny `bred` (detail, import) synchronizují samy
  (debounce ~2 s, při chybě čekají ve frontě a odešlou se později). Smazání zápisu i odhlášení jedním klikem.
- Filtr **Chovatel** jen u Backyardu (vedle Za domem: mám / nemám): mřížka jen s rybami toho hráče, kombinuje se
  s ostatními filtry („on má, já ne“ = Chovatel + Za domem: nemám). Dokud se registr nenačte, nezužuje nic.
- Detail ryby z Backyardu: řádek Chovatelé se jmény hráčů (max. 6 + „a N dalších“), jméno = filtr Chovatel.
- Backend `worker/` (Cloudflare Worker + D1): `GET /breeders`, `/auth/login|callback`, `GET|PUT|DELETE /me`,
  `POST /breeders/:id/report`, `/admin/*`. Server přijme jen ID ryb z Backyardu (`worker/src/backyard.json`
  generuje `build-data.ts` z `data/`), CORS jen Pages + localhost, rate limit zápisů a nahlášení.
- Moderace: nahlášení, po 3 nahlášeních od různých účtů se zápis sám skryje; admin (`ADMIN_IDS` ve Workeru)
  skryje / obnoví / smaže / zabanuje přímo v záložce.
- Uložené na serveru: Discord id, hash avataru, přezdívka, ID ryb, časy. Popsané v patičce („Co ukládáme“).
- localStorage: `fishdex:session:v1` (token, mimo export), `fishdex:breeders:v1` (zveřejněno, fronta změn).
  `fishdex:progress:v2` se kvůli tomu nemění. Bez dostupného API nefunguje jen tahle záložka.
- Client Secret Discordu jen ve `wrangler secret`, nikdy v repu ani v kódu webu. API URL přes `VITE_API_URL`.
- Sync: posílá se, jen když server drží to, co tento prohlížeč naposledy poslal (`planSync`); jinak (nové
  zařízení, změna jinde) ukáže volbu „Převzít z registru“ / „Poslat tento deník“, nikdy nepřepíše sám.
- Lokálně bez Cloudflare: `worker/test/dev-server.ts --seed` (stejná aplikace nad node:sqlite, falešný Discord),
  web s `VITE_API_URL=http://localhost:8787`. Bez `VITE_API_URL` záložka jen řekne, že registr není zapnutý.
- Mockup: `prototypes/c-chovatele/`.

## Časové pásmo

- Časy ryb v datech jsou herní čas = **UTC** (ověřeno proti fishao.net). V hlavičce jde vybrat
  Podle zařízení nebo pevné pásmo UTC−12 … UTC+14 včetně půlhodinových (bez letního času), v závorce
  max. 3 města, která v tu chvíli mají daný posun (`time/cities.ts`, letní čas je přesune).
  Volba „Česko“ v seznamu není: dokud uživatel nic nevybere, platí český čas (`Europe/Prague`)
  a ve výběru je označené jeho aktuální pásmo (UTC+1 / v létě UTC+2). Uloženo v `fishdex:prefs:v1`
  (`zone`: `Europe/Prague`, `device` nebo `UTC+05:30`; starší uložené IANA id dál platí).
- Test v `current.test.ts` ověřuje převod pro každou rybu, každé nabízené pásmo a každou minutu dne.
- Převod je na jednom místě (`localizeFish` v `App.tsx`): karty, detail („(Praha)“) i filtr hodiny
  pracují v zvoleném pásmu. Sezóny se počítají podle data v UTC. Timery zůstávají v čase zařízení.

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