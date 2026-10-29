# Designová rozhodnutí (fáze 1)

Zvolená varianta: **A — terénní deník** (`prototypes/a-denik/`).
Varianta B (`prototypes/b-kabinet/`) je jen archiv, dál se neudržuje.

## Schválené úpravy po výběru A

- **Délky se jen zobrazují.** Žádné měřítko ani nic, co vypadá jako posuvník.
  Délka je text (`max_length_label`, při `null` „neznámá“).
- **Za domem (Backyard): stav „mám za domem“** (`bred`). Jde zakliknout jen u ryb,
  které mají v `areas` hodnotu `backyard` (83 ryb). Je nezávislý na `caught`/`caughtGlowing`.
  - Karta: ikonka domku pod ikonkou záře, po zakliknutí poznámka „✓ mám za domem“.
  - Detail: třetí přepínač „Mám za domem“.
  - Filtr „Za domem: Vše / Mám / Nemám“ se ukáže jen při vybrané oblasti Backyard.
  - Obsah deníku u Backyard ukazuje navíc „mám za domem X/83“.
- **Výběr návnad:** tlačítko s panelem (na mobilu bottom sheet), multi-výběr,
  logika NEBO, řazeno podle počtu ryb s počtem u každé návnady. Vybrané návnady
  jsou i jako odebíratelné chipy vedle tlačítka.
- **Obsah deníku začíná položkou „Všechny oblasti“** (výchozí, celkový progres X/615),
  pod ní oblasti, turnaje a Backyard. Na mobilu je to první volba selectu oblastí.
- **Podtitul** „Rybářský deník Fishao“ je ve fontu názvů ryb (ne ručně psaný).
- **Fonty (schváleno):** Alegreya na nadpisy, jména ryb a poznámky (poznámky,
  popisky filtrů a „Zápis“ kurzívou), Schibsted Grotesk na data. Žádné ručně psané
  písmo. Hlavní nadpis zůstává „Fishdex“.

## Rozhodnutí, která uživatel nezadal (k potvrzení)

- Klik na kartu = ulovení, takže detail otevírá zvláštní tlačítko „Zápis“.
- Nechycená ryba = vybledlá kresba v čárkovaném rámečku. Chycená = vlepený lístek
  s páskou a fialovým razítkem ULOVENO. Zářivá = rámeček „noční snímek“ (tmavá voda)
  a ryba svítí. Platí i pro „jen zářivá“ bez normální.
- Pelican Lure, Star Lure, Monster Pond a Furniture Factory nemají český zdroj,
  takže jsou anglicky kurzívou. Překlad se doplní ve fázi 3 (zeptat se).
- Obrázky max. 2× přirozené velikosti (strop se počítá z `naturalWidth`).

## Známé problémy dat pro fázi 3

- 17 obrázků má **bílé neprůhledné pozadí**, i když předávka tvrdí průhlednost:
  allis-shad, asp, bridled-leatherjacket, broad-barred-goby, guapote,
  gulf-signal-blenny, indonesian-speckled-carpetshark, jack-dempsey,
  jaguar-guapote, painted-electric-ray, parrot-cichlid, red-irish-lord,
  redhead-cichlid, sawback-angelshark, southern-bluefin-tuna, stone-loach, sunbleak.
  Na papíře v light mode to schová `mix-blend-mode: multiply`, v dark mode a v zářivém
  rámečku je vidět bílý obdélník. Návrh: v build skriptu odstranit bílou od rohů
  (flood fill). **Zeptat se.**
