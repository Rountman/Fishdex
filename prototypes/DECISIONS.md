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

# Fáze 1b: rozhodnutí, která nebyla v zadání

Rozcestník: `prototypes/index.html`. Každá obrazovka je URL prototypu A,
seznam je v `prototypes/screens.js`, screenshoty v `prototypes/screens/1b/`.

1. **Obrazovka = URL, ne samostatný soubor.** Jeden prototyp s parametry
   (`?view=`, `?dialog=`, `?lang=`, `?progress=all`, `?storage=off`…), ať se 15 kopií
   markupu nerozjede. Stejně se bude chovat i aplikace (stav v URL).
2. **Filtry v URL** (`q`, `area`, `rarity`, `bait`, `status`, `bred`) se zapisují průběžně,
   odkaz jde sdílet.
3. **Desktop: filtry trvale viditelné**, panel se otevírá jen u návnad.
   **Mobil: filtry v jednom bottom sheetu** (tlačítko „Filtry (n)“), návnady jsou
   v sheetu rovnou jako seznam, dole „Zobrazit N ryb“.
4. **Pruh aktivních filtrů** pod filtry: každý filtr jako chip s ×, „Zrušit vše“ od 2 chipů.
   Počet výsledků vpravo („7 z 40“).
5. **Detail:** desktop panel zprava (modal `<dialog>`), mobil přes celou obrazovku,
   ne bottom sheet (detail je dlouhý a sheet by se scrolloval ve dvou vrstvách).
6. **Přehled oblastí** je samostatný pohled (`?view=progress`), otevírá se kliknutím na
   progres v hlavičce („Přehled oblastí“). Tabulka: ulovené, zářivé, za domem (jen Backyard).
   Klik na oblast = filtr. Na desktopu v přehledu schovávám postranní obsah deníku (duplikoval by ho).
   Na mobilu se tabulka láme do bloků.
7. **Záloha** je jeden dialog („Záloha“ v hlavičce, „Exportovat“ v hintu, odkaz v hlášce o úložišti):
   nahoře stažení, dole nahrání. Po výběru souboru náhled (počet ryb, ulovené / zářivé / za domem,
   datum uložení) a dvě velké volby **Sloučit** (výchozí, nic neodškrtne) a **Nahradit** (červeně).
   Sloučení = logické NEBO po polích. Ryby, které v datech nejsou, se uloží a hlásí se počtem.
   Import i export jsou v prototypu funkční nad skutečným souborem.
8. **100 % chyceno:** razítko „Deník kompletní“ v hlavičce + věta, kolik zářivých zbývá,
   fajfky u kompletních oblastí. Žádná animace ani konfety.
9. **Nedostupný localStorage:** čárkovaný pruh pod hlavičkou s „!“ a odkazem na stažení zálohy.
   Hint o záloze se v tom stavu neukazuje (pruh ho nahrazuje).
10. **CZ / EN:** přepínač v hlavičce. Hlavní jméno v zvoleném jazyce, druhé jméno pod ním
    v druhém jazyce (pomáhá hráčům, kteří znají jen jeden název). Návnady a místa v EN jsou
    tokeny z dat, v CZ ze slovníků; bez českého zdroje kurzívou anglicky.
    Názvy oblastí jsou v obou jazycích stejné (vlastní jména z dat).
11. **Hledání:** slova dotazu se hledají v CZ i EN jménu bez diakritiky, prefix/podřetězec,
    u slov od 4 písmen tolerance 1 překlepu („velryba“ najde „Žralok velrybář“).
    Původní „podposloupnost znaků“ byla moc benevolentní.
12. **Placeholder hledání** zkrácen na „Jméno ryby, česky i anglicky“ (na 375 px se nevešel).
13. **Česká typografie:** jednopísmenné předložky v místech mají nezlomitelnou mezeru („z mola“).
14. **Toast** je dole uprostřed, na mobilu přes celou šířku nad spodním okrajem.
15. **Sticker sheet** (`?view=stickers`) ukazuje i chybu dat: bílé pozadí obrázku v zářivém
    rámečku (allis-shad) jako bílý obdélník. Řeší se ve fázi 3.
