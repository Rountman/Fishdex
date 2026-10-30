# Fishdex — report scrapu

Vygenerováno 2026-10-30 skriptem `scraper/scrape.py`. Soubor se přepisuje při každém běhu — needitovat ručně.

## Souhrn

- **Ryb:** 615
- **Oblastí:** 22 (area: 17, backyard: 1, tournament: 4)
- **S obrázkem:** 615 / 615
- **Se zářivou variantou (podle fishao.cz):** 615 — fishaowiki zářivé varianty vůbec neuvádí, viz níže.
- **S českým názvem (fishao.cz):** 615 / 615
- **Zdroj obrázků:** fishaowiki: 594, fishao.cz: 21
- **S konfliktem hodnot mezi tabulkami:** 72
- **S nejistým polem (`uncertain`, UI ukáže „?"):** 92 — max_length: 92
- **S přesným místem v oblasti (`area_spots`):** 291

## Zdroje

Wiki nemá stránky jednotlivých ryb. Všechna data jsou řádky TablePress tabulek na těchto stránkách (snapshot nejbližší 2023-07-18 podle CDX):

| stránka | snapshot | počet zachycení v CDX | tabulky |
|---|---|---|---|
| [area-fish](http://fishaowiki.com/fishdex/area-fish/) | `20230718084642` | 147 | 18 |
| [tournament-fish](http://fishaowiki.com/fishdex/tournament-fish/) | `20230718084743` | 107 | 4 |
| [breeder-fish](http://fishaowiki.com/fishdex/breeder-fish/) | `20230718084736` | 113 | 1 |
| [5-star-fish](http://fishaowiki.com/fishdex/5-star-fish/) | `20230718084741` | 103 | 1 |
| [all-in-one](http://fishaowiki.com/fishdex/all-in-one/) | `20230718084734` | 105 | 1 |

CDX (`fishaowiki.com/*`, status 200, collapse=urlkey) vrací 1542 URL; ostatní HTML stránky jsou blog, komentáře a nesouvisející stránky (furniture, fruit-combos) — rybí data neobsahují.

## Zářivá (glowing) varianta

fishaowiki zářivé varianty neuvádí vůbec (žádné „glow" / „shiny" na stránkách ani v CDX). fishao.cz má u ryby řádek *Cena v obchodě / zářivá* → `has_glowing_variant: true` a cena v `glowing_info`. Kde fishao.cz stránku nemá nebo řádek chybí, je `null` (= zdroj neuvádí, ne „nemá"). Zářivé **obrázky** nemá ani jeden zdroj → `image_glowing: null` všude.

**Rozhodnutí uživatele (není ze zdroje):** zářivá varianta je stejná ryba, jen shiny — ve hře ji má každá ryba. Web to má aplikovat v transformačním kroku, ne přepisem dat ze scrapu.

## Druhý zdroj: fishao.cz

Archiv fishao.cz (živá doména dnes přesměrovává na cizí web — brán jen Wayback). Každá ryba má stránku `/ryba/<slug>/` s blokem *Informace o rybě*. Uloženo surově v `data/fishao_cz.json` a u ryby v `extra.fishao_cz`. **Hlavní pole ryby zůstávají z fishaowiki**; fishao.cz doplňuje jen `names.cs`/`names.sk`, zářivou variantu a chybějící obrázky. Neukládají se jména hráčů (seznam „u kterých lze ulovit", nabídky fosilií) ani text návodů.

- stránek ryb v archivu: 685, spárováno 685 stránek na 615 ryb z wiki
- ryb z wiki bez stránky na fishao.cz: 0
- ryb s více stránkami na fishao.cz: 70 — `astraspis` (Astraspis, astraspis), `boreaspis` (Boreaspis, boreaspis), `carcharocles-chubutensis` (Carcharocles-chubutensis, carcharocles-chubutensis), `ctenurella` (Ctenurella, ctenurella), `dartmuthia` (Dartmuthia, dartmuthia), `deltoptychius` (Deltoptychius, deltoptychius), `doryaspis-arctica` (Doryaspis-arctica, doryaspis-arctica), `doryaspis-nathorsti` (Doryaspis-nathorsti, doryaspis-nathorsti), `ischnacanthus` (Ischnacanthus, ischnacanthus), `green-birdmouth-wrasse` (akilolo-nosaty, green-birdmouth-wrasse), `allis-shad` (allis-shad, placka-pomoranska), `angler-snake-eel` (angler-snake-eel, hadar-zubatkovy), `pictus-catfish` (antenovec-ozdobny, pictus-catfish), `spotted-tiger-shovelnose-catfish` (antenovec-skvrnity, spotted-tiger-shovelnose-catfish), `asp` (asp, bolen-dravy), `atlantic-mackerel` (atlantic-mackerel, makrela-obecna), `austrolebias-adloffi` (austrolebias-adloffi, vejirovka-pricnopruha), `azul-peacock-bass` (azul-peacock-bass, cichlida-piquiti), `black-diamond-cichlid` (black-diamond-cichlid, cichlida-madagaskarska), `blind-cave-eel` (blind-cave-eel, hrdlozabrik-belavy), `bonnethead-shark` (bonnethead-shark, kladivoun-tiburo), `boulengerella-cuvieri` (boulengerella-cuvieri, stikovka-brazilska), `bridled-leatherjacket` (bridled-leatherjacket, pilnikotrn-slepeny), `broad-barred-goby` (broad-barred-goby, hlavac-sirokopruhy), `chilhuil-sea-catfish` (chilhuil-sea-catfish, krizovec-panamsky), `inlecypris-jayarami` (danio-jayarami, inlecypris-jayarami), `evermannella-balbo` (dlouhozubec-dravy, evermannella-balbo), `red-rainbowfish` (duhovka-lososova, red-rainbowfish), `dwarf-moray` (dwarf-moray, murena-zlata), `eurasian-ruffe` (eurasian-ruffle, jezdik-obecny), `european-sprat` (european-sprat, sprot-obecny), `freshwater-angelfish` (freshwater-angelfish, skalara-amazonska), `fresh-water-moray` (freshwater-moray, murena-sladkovodni), `giant-salmon-carp` (giant-salmon-carp, sanak-asijsky), `golden-cave-catfish` (golden-cave-catfish, kerickovec-jeskynni), `golden-trevally` (golden-trevally, kranas-zlaty), `grammonus-yunokawai` (grammonus-yunokawai, jeskynovka-yunokawa), `grideye-fish` (grideye-fish, ipnops), `guapote` (guapote, kancik-doviuv), `gulf-signal-blenny` (gulf-signal-blenny, slizoun-znamenity), `isichthys-henryi` (isichthys-henryi, rypoun-zapadoafricky), `jack-dempsey` (jack-dempsey, kancik-perletovy), `jaguar-guapote` (jaguar-guapote, kancik-managujsky), `redhead-cichlid` (kancik-cervenohlavy, redhead-cichlid), `parrot-cichlid` (kancik-papousci, parrot-cichlid), `winghead-shark` (kladivoun-kridlohlavy, winghead-shark), `three-spined-stickleback` (koljuska-triostna, three-spined-stickleback), `lavender-mbuna` (lavender-mbuna, tlamovec-sprengerae), `spotted-sicklefish` (lesklec-africky, spotted-sicklefish), `narrowhead-catshark` (macka-uzkohlava, narrowhead-catshark), `smoothtail-mobula` (manta-mexicka, smoothtail-mobula), `marcusenius-furcidens` (marcusenius-furcidens, rypoun-vidlozuby), `mariana-snailfish` (mariana-snailfish, pseudoliparis-swirei), `midwater-eelpout` (midwater-eelpout, slimule-pelagicka), `stone-loach` (mrenka-mramorovana, stone-loach), `painted-electric-ray` (narcina-surinamska, painted-electric-ray), `razorback-sucker` (pakaprovec-ostrohrbety, razorback-sucker), `pangio-mariarum` (pangio-mariarum, sekavec-sabazsky), `unicorn-crestfish` (paskoun-pruhovany, unicorn-crestfish), `peled` (peled, sih-peled), `taylors-inflator-filefish` (pilnikotrn-tayloruv, taylors-inflator-filefish), `piraya` (pirana-tmava, piraya), `vimba-bream` (podoustev-ricni, vimba-bream), `red-phantom-tetra` (red-phantom-tetra, tetra-sweglesova), `red-wolf-fish` (red-wolf-fish, trahir-kratkoocasy), `rissos-smooth-head` (rissos-smooth-head, uzlatka-vychodoatlantska), `shortdorsal-cutthroat-eel` (shortdorsal-cutthroat-eel, tupohlavec-kraktochvosty), `whitebar-eelpout` (slimule-belopruha, whitebar-eelpout), `sunbleak` (slunka-obecna, sunbleak), `tadpole-snailfish` (tadpole-snailfish, tercovka-pulcovita)
- nespárovaných stránek fishao.cz (ryba na wiki není nebo jiné jméno): 0

Párování: anglický název ze stránky (stejná normalizace jako id), pak slug URL, pak ručně schválené `aliases.json` → `fishao_cz` (`"cz-slug": "wiki-id"`).

### Kandidáti na párování (0)

| fishao.cz slug | anglicky | česky | možná wiki id |
|---|---|---|---|

### Ryby jen na fishao.cz (0) — nejsou ve fish.json

<details><summary>Seznam</summary>


</details>

### Křížová validace fishaowiki × fishao.cz

Jen report — hodnoty z wiki se nepřepisují (kromě doplnění níže).

| porovnání | rozdílů |
|---|---|
| hvězdy × Výskyt | 0 |
| Time × čas | 51 |
| délka: zdroje se liší → rozsah min–max | 92 |
| konfliktní názvy mezi více stránkami (nevyřešené) | 0 |

**Doplněno z fishao.cz** (na wiki chybí, nejde rozparsovat nebo se tabulky neshodují; fishao.cz stránky se shodují a hodnota jde rozparsovat): rarity: 3. U ryby v `extra.filled_from.<pole>` = `{source, reason}`; `*_raw` pak obsahuje text z fishao.cz.

<details><summary>Hvězdy (0)</summary>


</details>

<details><summary>Čas (51)</summary>

- `african-mottled-eel`: wiki `22:00-04:00` × fishao.cz `['kdykoliv']`
- `albino-alligator-gar`: wiki `22:00-05:00` × fishao.cz `['22:00+ - 11:00+']`
- `albino-catfish`: wiki `22:00-06:00` × fishao.cz `['23:00 - 06:00?']`
- `amur-sturgeon`: wiki `Always` × fishao.cz `['22:00? - 14:00?']`
- `angler-snake-eel`: wiki `02:00-02:15` × fishao.cz `['02:00 - ?']`
- `banggai-cardinalfish`: wiki `08:00-19:00` × fishao.cz `['6:00 - 19:00']`
- `bird-wrasse`: wiki `15:00-03:00` × fishao.cz `['kdykoliv']`
- `black-dragonfish`: wiki `00:00-07:00` × fishao.cz `['0:00 - 4:00']`
- `black-ghost-knifefish`: wiki `19:00-11:00` × fishao.cz `['kdykoliv']`
- `blacktip-reef-shark`: wiki `20:00-05:00` × fishao.cz `['20:00 - 7:00']`
- `blue-dot-jawfish`: wiki `09:00-19:00` × fishao.cz `['6:00 - 20:00']`
- `bridled-leatherjacket`: wiki `12:00-13:00` × fishao.cz `['kdykoliv']`
- `chevron-butterflyfish`: wiki `Always` × fishao.cz `['13:00 - ?']`
- `chilhuil-sea-catfish`: wiki `02:00-10:00` × fishao.cz `['kdykoliv']`
- `chinese-paddlefish`: wiki `13:00-15:00` × fishao.cz `['14:00 - 15:00']`
- `crested-bullhead-shark`: wiki `23:00-05:30` × fishao.cz `['kdykoliv']`
- `cylindrical-lanternshark`: wiki `02:00-02:30, 04:00-04:30, 06:00-06:15` × fishao.cz `['02:00 - 07:00']`
- `dwarf-moray`: wiki `23:00-06:00` × fishao.cz `['kdykoliv']`
- `fiddler-ray`: wiki `21:00-08:00` × fishao.cz `['kdykoliv']`
- `fresh-water-moray`: wiki `01:00-06:00` × fishao.cz `['kdykoliv']`
- `gloved-snailfish`: wiki `01:00-10:00` × fishao.cz `['2:00? - 4:00?']`
- `gold-spotted-rabbitfish`: wiki `22:00-05:00` × fishao.cz `['22:00 - 06:00?']`
- `hellers-barracuda`: wiki `Always` × fishao.cz `['10:00? - 18:00?']`
- `indonesian-speckled-carpetshark`: wiki `00:00-03:00` × fishao.cz `['0:00 - 5:00']`
- `kuhli-loach`: wiki `Always` × fishao.cz `['20:00 - 04:00']`
- `lemon-shark`: wiki `23:00-04:00` × fishao.cz `['23:00 - 07:00']`
- `long-finned-eel`: wiki `23:00-05:00` × fishao.cz `['23:00 - 04:00']`
- `marcusenius-furcidens`: wiki `Always` × fishao.cz `['12:00+ - 22:00+', '08:00+ - 03:00+']`
- `midnight-parrotfish`: wiki `08:00-17:30` × fishao.cz `['08:00 - 18:00']`
- `oceanic-whitetip-shark`: wiki `19:00-11:00` × fishao.cz `['15:00 - 11:00']`
- `orange-spotted-snakehead`: wiki `12:00-05:00` × fishao.cz `['21:00 - 05:00']`
- `palometa`: wiki `11:00-04:00` × fishao.cz `['kdykoliv']`
- `pangio-mariarum`: wiki `17:00-?` × fishao.cz `['kdykoliv']`
- `pelican-eel`: wiki `22:00-06:00` × fishao.cz `['kdykoliv']`
- `pickhandle-barracuda`: wiki `Always` × fishao.cz `['0:00? - 12:00?']`
- `pineapplefish`: wiki `00:00-05:00` × fishao.cz `['kdykoliv']`
- `porkfish`: wiki `23:00-05:30` × fishao.cz `['22:00 - 07:00']`
- `prickly-shark`: wiki `Always` × fishao.cz `['21:00 - 06:00']`
- `pumpkinseed-sunfish`: wiki `Always` × fishao.cz `['9:00 - ?']`
- `rissos-smooth-head`: wiki `02:00-05:00` × fishao.cz `['kdykoliv']`
- `sandbar-shark`: wiki `Always` × fishao.cz `['17:00 - 11:00']`
- `senegal-bichir`: wiki `22:00-06:00` × fishao.cz `['00:00 - 04:00']`
- `spikefin-goby`: wiki `Always` × fishao.cz `['08:00 - 23:00']`
- `spot-tail-shark`: wiki `Always` × fishao.cz `['21:00+? - 05:00+?']`
- `striped-headstander`: wiki `Always` × fishao.cz `['08:00 - ?']`
- `sulawesi-coelacanth`: wiki `00:00-05:00` × fishao.cz `['kdykoliv']`
- `tadpole-snailfish`: wiki `00:00-05:00` × fishao.cz `['0:00 - ?']`
- `tire-track-eel`: wiki `23:00-04:00` × fishao.cz `['kdykoliv']`
- `whitebar-eelpout`: wiki `02:00-06:00` × fishao.cz `['2:00 - 5:00', '2:00 - 4:00']`
- `yangtze-sturgeon`: wiki `Always` × fishao.cz `['20:00 - 11:00']`
- `zebra-shark`: wiki `Always` × fishao.cz `['00:00 - 06:00']`

</details>

Délky v rozsahu: 92 ryb, z toho 15 s rozdílem > 25 % (podezřelé):

<details><summary>Seznam</summary>

- `african-mottled-eel` 191–196 cm: `191 cm` (fishaowiki all-in-one, fishaowiki area-fish/Thombani Town, fishaowiki 5-star-fish); `196 cm` (fishao.cz african-mottled-eel)
- `angler-monkfish` 206–209 cm: `209 cm` (fishaowiki all-in-one, fishaowiki area-fish/Pirate Cave, fishaowiki 5-star-fish); `206 cm` (fishao.cz das-morsky)
- `aphyonidae` 21–22 cm: `21 cm` (fishaowiki all-in-one, fishaowiki area-fish/Club, fishaowiki 5-star-fish); `22 cm` (fishao.cz hlubinar)
- `arapaima` 448–449 cm: `448 cm` (fishaowiki all-in-one, fishaowiki area-fish/Rio Tropical, fishaowiki area-fish/Aquayama, fishaowiki 5-star-fish); `449 cm` (fishao.cz arapaima-velka)
- `asp` 118–119 cm: `119 cm` (fishaowiki all-in-one, fishaowiki area-fish/Cool Mountain, fishao.cz bolen-dravy); `118 cm` (fishao.cz asp)
- `australian-barracuda` 101–102 cm: `102 cm` (fishaowiki all-in-one, fishao.cz soltyn-australsky); `101 cm` (fishaowiki area-fish/Lucky Raft)
- `barramundi` 184–199 cm: `194 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish); `184 cm` (fishaowiki area-fish/Palm Island); `199 cm` (fishao.cz lates-stribrity)
- `basking-shark` 1181–1223 cm: `1223 cm` (fishaowiki all-in-one, fishaowiki area-fish/Sibiri City, fishaowiki area-fish/Seagull Harbor, fishaowiki tournament-fish/Boat on Sea Tournament); `1181 cm` (fishaowiki 5-star-fish); `1220 cm` (fishao.cz zralok-veliky)
- `beluga-sturgeon` 846–851 cm: `850 cm` (fishaowiki all-in-one, fishaowiki area-fish/Cool Mountain); `846 cm` (fishaowiki 5-star-fish); `851 cm` (fishao.cz vyza-velka)
- `bigeye-barracuda` 73–74 cm: `74 cm` (fishaowiki all-in-one, fishaowiki area-fish/Lucky Raft); `73 cm` (fishao.cz soltyn-velkooky)
- `black-alligator-gar` 297–298 cm: `298 cm` (fishaowiki all-in-one, fishaowiki area-fish/Club, fishao.cz kostlin-cerny); `297 cm` (fishaowiki 5-star-fish)
- `black-marlin` 459–464 cm: `459 cm` (fishaowiki all-in-one, fishaowiki area-fish/Lucky Raft, fishaowiki 5-star-fish); `464 cm` (fishao.cz marlin-cerny)
- `blackbar-soldierfish` 26–34 cm ⚠️: `26 cm` (fishaowiki all-in-one, fishao.cz pruhatec-cernopruhy); `34 cm` (fishaowiki area-fish/Palm Island)
- `blackfin-dartfish` 9–13 cm ⚠️: `13 cm` (fishaowiki all-in-one, fishao.cz hlavacovec-cernoploutvy); `9 cm` (fishaowiki area-fish/Pinheira Beach)
- `blind-cave-eel` 37–39 cm: `39 cm` (fishaowiki all-in-one, fishaowiki area-fish/Club, fishaowiki 5-star-fish, fishao.cz hrdlozabrik-belavy); `37 cm` (fishao.cz blind-cave-eel)
- `blue-marlin` 428–429 cm: `429 cm` (fishaowiki all-in-one, fishaowiki area-fish/Seagull Harbor, fishao.cz marlin-modry); `428 cm` (fishaowiki 5-star-fish)
- `bonnethead-shark` 145–149 cm: `149 cm` (fishaowiki all-in-one, fishaowiki area-fish/Club, fishao.cz kladivoun-tiburo); `145 cm` (fishao.cz bonnethead-shark)
- `boulengerella-cuvieri` 85–87 cm: `87 cm` (fishaowiki all-in-one, fishaowiki area-fish/Rio Tropical, fishao.cz stikovka-brazilska); `85 cm` (fishao.cz boulengerella-cuvieri)
- `bull-shark` 400–401 cm: `401 cm` (fishaowiki all-in-one, fishaowiki breeder-fish/Backyard fish, fishao.cz zralok-belavy); `400 cm` (fishaowiki 5-star-fish)
- `carcharocles-chubutensis` 1158–1214 cm: `1158 cm` (fishaowiki all-in-one, fishaowiki area-fish/Lost Valley 2); `???` (fishaowiki 5-star-fish); `1214 cm` (fishao.cz Carcharocles-chubutensis, fishao.cz carcharocles-chubutensis)
- `chilhuil-sea-catfish` 48–50 cm: `50 cm` (fishaowiki all-in-one, fishaowiki area-fish/Seagull Harbor); `48 cm` (fishao.cz chilhuil-sea-catfish, fishao.cz krizovec-panamsky)
- `common-ponyfish` 26–27 cm: `27 cm` (fishaowiki all-in-one, fishaowiki area-fish/Club); `26 cm` (fishao.cz plosak-stribrity)
- `cyclops-shark` 49–55 cm: `55 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish, fishao.cz zralok-kyklop); `49 cm` (fishaowiki area-fish/Pirate Cave)
- `danube-salmon` 163–164 cm: `164 cm` (fishaowiki all-in-one, fishaowiki breeder-fish/Backyard fish, fishao.cz hlavatka-obecna); `163 cm` (fishaowiki 5-star-fish)
- `dragon-moray` 89–91 cm: `89 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish, fishaowiki tournament-fish/Moray Tournament); `91 cm` (fishao.cz murena-pardali)
- `dunkleosteus` 182–794 cm ⚠️: `182 cm` (fishaowiki all-in-one, fishaowiki area-fish/Lost Valley 2, fishaowiki 5-star-fish); `794 cm` (fishao.cz dunkleosteus)
- `emperor-red-snapper` 115–116 cm: `115 cm` (fishaowiki all-in-one, fishaowiki area-fish/Club); `116 cm` (fishao.cz chnapal-cisarsky)
- `fangtooth-moray` 118–119 cm: `118 cm` (fishaowiki all-in-one, fishao.cz murena-tygrovita); `119 cm` (fishaowiki tournament-fish/Moray Tournament)
- `fiddler-ray` 88–89 cm: `89 cm` (fishaowiki all-in-one, fishaowiki area-fish/Club, fishaowiki 5-star-fish); `88 cm` (fishao.cz pilohrbet-jihoaustralsky)
- `fire-eel` 118–119 cm: `119 cm` (fishaowiki all-in-one, fishaowiki breeder-fish/Backyard fish, fishao.cz hrotocelec-ohnivy); `118 cm` (fishaowiki 5-star-fish)
- `florida-gar` 130–131 cm: `131 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish); `130 cm` (fishaowiki area-fish/Club, fishao.cz kostlin-floridsky)
- `fresh-water-moray` 148–149 cm: `149 cm` (fishaowiki all-in-one, fishaowiki area-fish/Aquayama); `148 cm` (fishao.cz freshwater-moray, fishao.cz murena-sladkovodni)
- `frilled-shark` 194–213 cm: `213 cm` (fishaowiki all-in-one, fishaowiki area-fish/Seagull Harbor); `194 cm` (fishaowiki 5-star-fish, fishao.cz zralok-limcovy)
- `giant-freshwater-stingray` 457–459 cm: `459 cm` (fishaowiki all-in-one, fishaowiki breeder-fish/Backyard fish); `457 cm` (fishaowiki 5-star-fish); `458 cm` (fishao.cz trnucha-thajska)
- `giant-kokopu` 54–57 cm: `57 cm` (fishaowiki all-in-one, fishaowiki area-fish/Club, fishaowiki 5-star-fish); `54 cm` (fishao.cz galaxie-velka)
- `giant-oarfish` 1409–1754 cm: `1754 cm` (fishaowiki all-in-one, fishaowiki area-fish/Pinheira Beach, fishaowiki area-fish/Sibiri City, fishaowiki area-fish/Seagull Harbor, fishaowiki tournament-fish/Boat on Sea Tournament, fishao.cz hlistoun-cervenohrivy); `1409 cm` (fishaowiki 5-star-fish)
- `giant-oceanic-manta-ray` 908–909 cm: `909 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish, fishao.cz manta-obrovska); `908 cm` (fishaowiki area-fish/Lost Valley 1)
- `giant-salmon-carp` 112–129 cm: `128cm` (fishaowiki all-in-one, fishaowiki area-fish/Aquayama); `???` (fishaowiki 5-star-fish); `112 cm` (fishao.cz giant-salmon-carp); `129 cm` (fishao.cz sanak-asijsky)
- `goblin-shark` 324–610 cm ⚠️: `610 cm` (fishaowiki all-in-one, fishaowiki area-fish/Sibiri City, fishao.cz zralok-sotek); `324 cm` (fishaowiki 5-star-fish)
- `gold-carp` 118–119 cm: `119 cm` (fishaowiki all-in-one, fishaowiki area-fish/Laketown, fishao.cz kapr-zlaty); `118 cm` (fishaowiki 5-star-fish)
- `golden-cave-catfish` 15–16 cm: `16cm` (fishaowiki all-in-one, fishaowiki area-fish/Mystic Desert); `???` (fishaowiki 5-star-fish); `15 cm` (fishao.cz golden-cave-catfish); `16 cm` (fishao.cz kerickovec-jeskynni)
- `golden-pike` 137–139 cm: `139 cm` (fishaowiki all-in-one, fishaowiki area-fish/Club, fishaowiki 5-star-fish); `137 cm` (fishao.cz stika-zlata)
- `golden-trevally` 115–119 cm: `118 cm` (fishaowiki all-in-one); `119 cm` (fishaowiki area-fish/Club, fishao.cz kranas-zlaty); `115 cm` (fishao.cz golden-trevally)
- `goliath-tigerfish` 149–197 cm ⚠️: `149 cm` (fishaowiki all-in-one, fishaowiki tournament-fish/Race (Magic 15) Tournament, fishao.cz binga-tygri); `197 cm` (fishaowiki 5-star-fish)
- `great-white-shark` 785–790 cm: `790 cm` (fishaowiki all-in-one, fishaowiki area-fish/Seagull Harbor, fishao.cz zralok-bily); `785 cm` (fishaowiki 5-star-fish)
- `green-red-arowana` 123–124 cm: `124 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish); `123 cm` (fishaowiki breeder-fish/Backyard fish, fishao.cz zeleno-cervena-arowana)
- `green-sawfish` 726–729 cm: `729 cm` (fishaowiki all-in-one, fishaowiki area-fish/Pinheira Beach); `728 cm` (fishaowiki 5-star-fish); `726 cm` (fishao.cz piloun-mnohozuby)
- `guapote` 69–71 cm: `70 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish, fishaowiki breeder-fish/Backyard fish); `69 cm` (fishao.cz guapote); `71 cm` (fishao.cz kancik-doviuv)
- `gyrosteus` 514–515 cm: `514 cm` (fishaowiki all-in-one, fishaowiki area-fish/Lost Valley 2); `???` (fishaowiki 5-star-fish); `515 cm` (fishao.cz gyrosteus)
- `halibut` 364–365 cm: `365 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish); `364 cm` (fishaowiki area-fish/Seagull Harbor, fishao.cz platys-tichomorsky)
- `ischnacanthus` 201–202 cm: `201 cm` (fishaowiki all-in-one, fishaowiki area-fish/Lost Valley 2); `202 cm` (fishao.cz Ischnacanthus, fishao.cz ischnacanthus)
- `largetooth-sawfish` 703–704 cm: `704 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish, fishao.cz piloun-mikrodon); `703 cm` (fishaowiki breeder-fish/Backyard fish)
- `leedsichthys` 1208–1381 cm: `1381 cm` (fishaowiki all-in-one, fishaowiki area-fish/Lost Valley 2, fishao.cz leedsichthys); `1208 cm` (fishaowiki 5-star-fish)
- `lionhead-goldfish` 20–21 cm: `21 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish, fishaowiki tournament-fish/Lake Run Tournament); `20 cm` (fishao.cz karas-lvi-hlava)
- `long-finned-eel` 119–120 cm: `119 cm` (fishaowiki all-in-one, fishaowiki area-fish/Marshville, fishao.cz uhor-novozelandsky); `120 cm` (fishaowiki area-fish/Laketown)
- `mariana-snailfish` 22–28 cm ⚠️: `28 cm` (fishaowiki all-in-one, fishaowiki area-fish/Seagull Harbor, fishaowiki 5-star-fish, fishao.cz pseudoliparis-swirei); `22 cm` (fishao.cz mariana-snailfish)
- `meadia-roseni` 70–75 cm: `75 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish); `74 cm` (fishaowiki area-fish/Pirate Cave); `70 cm` (fishao.cz tupohlavec-rosenuv)
- `megamouth-shark` 599–705 cm: `705 cm` (fishaowiki all-in-one, fishaowiki area-fish/Sibiri City); `599 cm` (fishaowiki 5-star-fish); `702 cm` (fishao.cz zralok-velkousty)
- `narrowhead-catshark` 297–299 cm: `299 cm` (fishaowiki all-in-one, fishaowiki area-fish/Pinheira Beach); `297 cm` (fishao.cz macka-uzkohlava, fishao.cz narrowhead-catshark)
- `nurse-shark` 428–429 cm: `429 cm` (fishaowiki all-in-one, fishaowiki area-fish/Pinheira Beach); `428 cm` (fishao.cz zralok-vouskaty)
- `pacific-barracuda` 143–144 cm: `144 cm` (fishaowiki all-in-one, fishao.cz soltyn-stribrity); `143 cm` (fishaowiki area-fish/Lucky Raft)
- `pacific-bluefin-tuna` 300–303 cm: `300 cm` (fishaowiki all-in-one, fishaowiki area-fish/Lucky Raft, fishaowiki 5-star-fish); `303 cm` (fishao.cz tunak-tichomorsky)
- `peled` 48–49 cm: `49 cm` (fishaowiki all-in-one, fishao.cz peled, fishao.cz sih-peled); `48 cm` (fishaowiki breeder-fish/Backyard fish)
- `piraya` 48–49 cm: `49 cm` (fishaowiki all-in-one, fishaowiki area-fish/Club); `48 cm` (fishao.cz pirana-tmava)
- `platinum-golden-arowana` 97–98 cm: `98 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish, fishaowiki breeder-fish/Backyard fish); `97 cm` (fishao.cz arowana-platinova)
- `razorback-sucker` 89–90 cm: `90 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish, fishao.cz pakaprovec-ostrohrbety); `89 cm` (fishaowiki breeder-fish/Backyard fish, fishao.cz razorback-sucker)
- `red-tail-golden-arowana` 92–93 cm: `93 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish, fishaowiki breeder-fish/Backyard fish); `92 cm` (fishao.cz arowana-zlata-cervenoocasa)
- `ruby-seadragon` 23–29 cm ⚠️: `29 cm` (fishaowiki all-in-one, fishaowiki area-fish/Palm Island, fishaowiki 5-star-fish); `23 cm` (fishao.cz rasovnik-rubinovy)
- `salpa-maggiore` 16–23 cm ⚠️: `23 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish, fishao.cz salpa-maggiore); `16 cm` (fishaowiki tournament-fish/Moray Tournament)
- `saurychthis` 127–128 cm: `127 cm` (fishaowiki all-in-one, fishaowiki area-fish/Lost Valley 2); `???` (fishaowiki 5-star-fish); `128 cm` (fishao.cz saurichthys)
- `schoolmaster-snapper` 44–45 cm: `44 cm` (fishaowiki all-in-one, fishao.cz chnapal-zlutoploutvy); `45 cm` (fishaowiki area-fish/Palm Island)
- `siberian-sturgeon` 201–202 cm: `202 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish); `201 cm` (fishaowiki area-fish/Club, fishao.cz jeseter-sibirsky)
- `silver-carp` 138–139 cm: `139 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish, fishao.cz tolstolobik-bily); `138 cm` (fishaowiki breeder-fish/Backyard fish)
- `smalltooth-sawfish` 708–749 cm: `708 cm` (fishaowiki all-in-one, fishaowiki area-fish/Club, fishaowiki 5-star-fish); `749 cm` (fishao.cz piloun-malozuby)
- `smoothtail-mobula` 188–219 cm: `219 cm` (fishaowiki all-in-one, fishao.cz manta-mexicka); `188 cm` (fishaowiki 5-star-fish, fishaowiki tournament-fish/Boat on Sea Tournament, fishao.cz smoothtail-mobula)
- `spot-tail-shark` 163–164 cm: `164 cm` (fishaowiki all-in-one, fishao.cz zralok-zapadoaustralsky); `163 cm` (fishaowiki area-fish/Palm Island)
- `spotted-eagle-ray` 485–499 cm: `499 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish, fishao.cz siba-skvrnita); `485 cm` (fishaowiki area-fish/Palm Island)
- `spotted-gar` 148–149 cm: `149 cm` (fishaowiki all-in-one, fishaowiki area-fish/Club, fishaowiki 5-star-fish); `148 cm` (fishao.cz kostlin-skvrnity)
- `spotted-tiger-shovelnose-catfish` 138–139 cm: `139cm` (fishaowiki all-in-one, fishaowiki area-fish/Rio Tropical); `139 cm` (fishao.cz antenovec-skvrnity); `138 cm` (fishao.cz spotted-tiger-shovelnose-catfish)
- `stethacanthus` 55–189 cm ⚠️: `188 cm` (fishaowiki all-in-one, fishaowiki area-fish/Lost Valley 2); `55 cm` (fishaowiki 5-star-fish); `189 cm` (fishao.cz stethacanthus)
- `striped-marlin` 418–419 cm: `418 cm` (fishaowiki all-in-one, fishaowiki area-fish/Lucky Raft); `419 cm` (fishao.cz marlin-pruhovany)
- `thresher-shark` 602–759 cm ⚠️: `759 cm` (fishaowiki all-in-one, fishaowiki tournament-fish/Boat on Sea Tournament, fishao.cz liskoun-obecny); `602 cm` (fishaowiki 5-star-fish)
- `tiger-shark` 703–747 cm: `747 cm` (fishaowiki all-in-one, fishaowiki area-fish/Seagull Harbor, fishao.cz zralok-tygri); `703 cm` (fishaowiki 5-star-fish)
- `titanichthys` 670–698 cm: `670 cm` (fishaowiki all-in-one, fishaowiki area-fish/Lost Valley 2, fishaowiki 5-star-fish); `698 cm` (fishao.cz titanichthys)
- `viper-moray` 117–285 cm ⚠️: `285 cm` (fishaowiki all-in-one, fishaowiki 5-star-fish); `117 cm` (fishaowiki tournament-fish/Moray Tournament); `252 cm` (fishao.cz murena-psi)
- `whale-shark` 856–1974 cm ⚠️: `1859 cm` (fishaowiki all-in-one, fishaowiki tournament-fish/Boat on Sea Tournament); `856 cm` (fishaowiki 5-star-fish); `1974 cm` (fishao.cz zralok-obrovsky)
- `white-bass` 24–49 cm ⚠️: `48 cm` (fishaowiki all-in-one, fishao.cz morcak-stribrity); `24 cm` (fishaowiki area-fish/Laketown); `49 cm` (fishaowiki area-fish/Cool Mountain)
- `white-crappie` 48–49 cm: `48 cm` (fishaowiki all-in-one, fishao.cz okounek-svetly); `49 cm` (fishaowiki breeder-fish/Backyard fish)
- `white-sturgeon` 405–609 cm ⚠️: `609 cm` (fishaowiki all-in-one, fishaowiki breeder-fish/Backyard fish, fishao.cz jeseter-bily); `405 cm` (fishaowiki 5-star-fish)
- `whitebar-eelpout` 75–76 cm: `76cm` (fishaowiki all-in-one); `75 cm` (fishaowiki area-fish/Seagull Harbor, fishao.cz slimule-belopruha, fishao.cz whitebar-eelpout)
- `xiphactinus` 62–620 cm ⚠️: `620 cm` (fishaowiki all-in-one, fishao.cz xiphactinus); `62 cm` (fishaowiki area-fish/Lost Valley 2)
- `yellow-mouth-moray` 180–181 cm: `181 cm` (fishaowiki all-in-one, fishaowiki tournament-fish/Moray Tournament); `180 cm` (fishao.cz murena-zlutotlama)

</details>

Názvy ze dvou stránek, kde jedna má jen nepřeložené anglické jméno → vzat přeložený (28):

<details><summary>Seznam</summary>

- cs `atlantic-mackerel`: Atlantic Mackerel / Makrela obecná → **Makrela obecná**
- cs `austrolebias-adloffi`: Austrolebias Adloffi / Vějířovka příčnopruhá → **Vějířovka příčnopruhá**
- cs `black-diamond-cichlid`: Black Diamond Cichlid / Cichlida madagaskarská → **Cichlida madagaskarská**
- cs `blind-cave-eel`: Blind Cave Eel / Hrdložábřík bělavý → **Hrdložábřík bělavý**
- cs `bonnethead-shark`: Bonnethead Shark / Kladivoun tiburo → **Kladivoun tiburo**
- cs `broad-barred-goby`: Broad-barred Goby / Hlaváč širokopruhý → **Hlaváč širokopruhý**
- cs `chilhuil-sea-catfish`: Chilhuil Sea Catfish / Křížovec panamský → **Křížovec panamský**
- cs `eurasian-ruffe`: Eurasian Ruffle / Ježdík obecný → **Ježdík obecný**
- cs `european-sprat`: European Sprat / Šprot obecný → **Šprot obecný**
- cs `freshwater-angelfish`: Freshwater Angelfish / Skalára amazonská → **Skalára amazonská**
- cs `golden-trevally`: Golden Trevally / Kranas zlatý → **Kranas zlatý**
- cs `grideye-fish`: Grideye Fish / Ipnops → **Ipnops**
- cs `guapote`: Kančík Doviúv / Kančík Doviův → **Kančík Doviův**
- cs `gulf-signal-blenny`: Gulf Signal Blenny / Slizoun znamenitý → **Slizoun znamenitý**
- cs `inlecypris-jayarami`: Dánio jayarami / Inlecypris Jayarami → **Dánio jayarami**
- cs `isichthys-henryi`: Isichthys Henryi / Rypoun západoafrický → **Rypoun západoafrický**
- cs `lavender-mbuna`: Lavender Mbuna / Tlamovec sprengerae → **Tlamovec sprengerae**
- cs `marcusenius-furcidens`: Marcusenius Furcidens / Rypoun vidlozubý → **Rypoun vidlozubý**
- cs `narrowhead-catshark`: Máčka úzkohlavá / Narrowhead Catshark → **Máčka úzkohlavá**
- cs `pangio-mariarum`: Pangio Mariarum / Sekavec sabažský → **Sekavec sabažský**
- cs `peled`: Peled / Síh peleď → **Síh peleď**
- cs `piraya`: Piraňa tmavá / Piraya → **Piraňa tmavá**
- cs `razorback-sucker`: Pakaprovec ostrohřbetý / Razorback Sucker → **Pakaprovec ostrohřbetý**
- cs `red-phantom-tetra`: Red Phantom Tetra / Tetra Sweglesova → **Tetra Sweglesova**
- cs `spotted-sicklefish`: Lesklec africký / Spotted Sicklefish → **Lesklec africký**
- cs `three-spined-stickleback`: Koljuška tříostná / Three-spined Stickleback → **Koljuška tříostná**
- cs `whitebar-eelpout`: Slimule bělopruhá / Whitebar Eelpout → **Slimule bělopruhá**
- cs `winghead-shark`: Kladivoun křídlohlavý / Winghead Shark → **Kladivoun křídlohlavý**

</details>

### Názvy oblastí na fishao.cz

`Aquayama`, `Cool Mountain`, `Cool Mountain (z voru)`, `Klub (vlevo, slaná voda)`, `Klub (vpravo, sladká voda)`, `Laketown`, `Laketown (farma)`, `Little Rio`, `Lost Valley I`, `Lost Valley II`, `Lucky Raft`, `Marshville`, `Mystic Desert`, `Mystic Desert (v pyramidě)`, `Palm Island (uvnitř)`, `Palm Island (vně)`, `Pinheira Beach`, `Pinheira Beach (z mola)`, `Pirátská jeskyně`, `Rio Tropical`, `Seagull Harbor`, `Seagull Harbor (z člunu)`, `Sibiri City`, `Thombani Town`, `Thombani Town (za plotem)`, `Továrna na nábytek`, `Turnaj Boat on Sea`, `Turnaj Lake Run`, `Turnaj Magic 15`, `Turnaj Moray`, `Za domem`

## Třetí zdroj: fishaofunwiki.com

Živá komunitní wiki (stav 2026), novější než oba archivy. SPA — seznam ryb je přímo v JS bundlu (`JSON.parse`), uloženo surově v `data/fishaofunwiki.json` a u ryby v `extra.fishaofunwiki`. `/api/fish-data` (~30 komunitních úprav) jen kopíruje maxLength do prázdného rekordu → nepoužito.

**Rozhodnutí uživatele (2026-10-30):** funwiki doplní chybějící hodnoty a délkový rozsah `length_cm` `{min, avg, max}`; u polí s „?" (čas, sezóna, návnada) její hodnota nahradí naši a „?" zmizí. Jistá pole nepřepisuje — rozdíly jsou jen níže.

- ryb ve funwiki: 615, spárováno 615 (id/jméno bez oddělovačů, takže `barnard-s-lanterfish` = `barnards-lanterfish`)
- s délkovým rozsahem `length_cm`: 615
- nespárováno: 0

| pole | pravidlo | ryb |
|---|---|---|
| bait | resolves_uncertain | 12 |
| max_length | fill | 2 |
| season | confirms_uncertain | 5 |
| season | resolves_uncertain | 11 |
| time | confirms_uncertain | 19 |
| time | fill | 2 |
| time | resolves_uncertain | 35 |

`fill` = naše data hodnotu nemají; `resolves_uncertain` = nahrazena nejistá hodnota; `confirms_uncertain` = funwiki potvrdila naši nejistou hodnotu („?" zmizí); `unparsed` = hodnotu funwiki nejde rozparsovat, nepoužito.

### Rozdíly u jistých hodnot (ponecháno naše)

<details><summary>bait (2)</summary>

| ryba | naše | funwiki |
|---|---|---|
| `green-moray` | Fish, Insects, Lures | Insects, Lures |
| `whitemouth-moray` | Fish, Insects, Meat | Fish, Insects |

</details>

<details><summary>max_length (401)</summary>

| ryba | naše | funwiki |
|---|---|---|
| `acanthodes` | 57 cm | 58 cm |
| `achilles-tang` | 24 cm | 25 cm |
| `african-butter-catfish` | 39 cm | 40 cm |
| `african-knifefish` | 164 cm | 161 cm |
| `albino-alligator-gar` | 298 cm | 282 cm |
| `albino-catfish` | 619 cm | 585 cm |
| `alligator-gar` | 299 cm | 296 cm |
| `allis-shad` | 82 cm | 83 cm |
| `alpine-bullhead` | 10 cm | 11 cm |
| `amazon-leaf-fish` | 11 cm | 12 cm |
| `amur-pike` | 114 cm | 113 cm |
| `amur-sturgeon` | 319 cm | 307 cm |
| `angel-shark` | 242 cm | 243 cm |
| `angler-snake-eel` | 12 cm | 15 cm |
| `antiarchi` | 103 cm | 104 cm |
| `apache-trout` | 41 cm | 42 cm |
| `aphyonidae` | (21–22 cm)? | 19 cm |
| `arandaspis` | 15 cm | 16 cm |
| `arapaima` | (448–449 cm)? | 442 cm |
| `arctic-char` | 106 cm | 104 cm |
| `ariidae` | 59 cm | 60 cm |
| `arrowhead-soapfish` | 14 cm | 15 cm |
| `asian-arowana` | 89 cm | 90 cm |
| `asian-green-arowana` | 103 cm | 102 cm |
| `asp` | (118–119 cm)? | 117 cm |
| `aspidorhynchus` | 80 cm | 81 cm |
| `astraspis` | 19 cm | 20 cm |
| `atlantic-bluefin-tuna` | 457 cm | 448 cm |
| `atlantic-herring` | 44 cm | 45 cm |
| `atlantic-needlefish` | 110 cm | 111 cm |
| `atlantic-wolffish` | 149 cm | 145 cm |
| `austrolebias-adloffi` | 4 cm | 5 cm |
| `ballan-wrasse` | 65 cm | 66 cm |
| `banded-butterflyfish` | 14 cm | 15 cm |
| `barbel` | 119 cm | 120 cm |
| `barbeled-houndshark` | 81 cm | 82 cm |
| `barnards-lanterfish` | 11 cm | 12 cm |
| `basketfish` | 14 cm | 15 cm |
| `beluga-sturgeon` | (846–851 cm)? | 818 cm |
| `bigeye-scad` | 29 cm | 30 cm |
| `bigeye-tuna` | 250 cm | 249 cm |
| `bighead-carp` | 149 cm | 148 cm |
| `bigmouth-buffalo` | 122 cm | 121 cm |
| `bitterling` | 8 cm | 9 cm |
| `black-alligator-gar` | (297–298 cm)? | 265 cm |
| `black-arowana` | 89 cm | 88 cm |
| `black-bullhead` | 64 cm | 65 cm |
| `black-crappy` | 48 cm | 49 cm |
| `black-dragonfish` | 52 cm | 49 cm |
| `black-ghost-knifefish` | 52 cm | 53 cm |
| `black-marlin` | (459–464 cm)? | 457 cm |
| `black-molly` | 8 cm | 9 cm |
| `black-sharkminnow` | 89 cm | 90 cm |
| `black-triggerfish` | 45 cm | 46 cm |
| `blackbar-soldierfish` | (26–34 cm)? | 25 cm |
| `blackcheek-moray` | 99 cm | 100 cm |
| `blackfin-dartfish` | (9–13 cm)? | 14 cm |
| `blackfin-pearlfish` | 6 cm | 7 cm |
| `blind-cave-eel` | (37–39 cm)? | 40 cm |
| `blue-catfish` | 239 cm | 235 cm |
| `blue-dot-jawfish` | 9 cm | 10 cm |
| `blue-lyretail` | 6 cm | 7 cm |
| `blue-malayan-arowana` | 131 cm | 124 cm |
| `blue-marlin` | (428–429 cm)? | 421 cm |
| `blue-panchax` | 8 cm | 9 cm |
| `blue-parrotfish` | 119 cm | 116 cm |
| `blue-ring-angelfish` | 30 cm | 31 cm |
| `blue-striped-grunt` | 27 cm | 28 cm |
| `blue-tang` | 37 cm | 38 cm |
| `blue-bellied-night-wanderer` | 2 cm | 3 cm |
| `blue-green-chromis` | 9 cm | 10 cm |
| `bluegill` | 40 cm | 41 cm |
| `bluehead-wrasse` | 14 cm | 15 cm |
| `bluespine-unicornfish` | 71 cm | 70 cm |
| `bluestripe-pipefish` | 6 cm | 7 cm |
| `bluestripe-snapper` | 39 cm | 40 cm |
| `boreaspis` | 12 cm | 13 cm |
| `bowfin` | 108 cm | 109 cm |
| `bowmouth-guitarfish` | 306 cm | 304 cm |
| `bramble-shark` | 309 cm | 296 cm |
| `bridled-leatherjacket` | 13 cm | 14 cm |
| `brook-trout` | 85 cm | 86 cm |
| `brown-trout` | 99 cm | 100 cm |
| `bull-shark` | (400–401 cm)? | 398 cm |
| `bullet-tuna` | 49 cm | 50 cm |
| `burbot` | 59 cm | 60 cm |
| `candy-basslet` | 5 cm | 6 cm |
| `chaca-chaca-catfish` | 31 cm | 32 cm |
| `cheiracanthus` | 37 cm | 38 cm |
| `cheirolepis` | 64 cm | 65 cm |
| `cherry-salmon` | 78 cm | 79 cm |
| `chevron-butterflyfish` | 19 cm | 20 cm |
| `chilhuil-sea-catfish` | (48–50 cm)? | 51 cm |
| `chinese-false-gudgeon` | 18 cm | 19 cm |
| `chinese-paddlefish` | 700 cm | 677 cm |
| `chinstrap-jawfish` | 10 cm | 11 cm |
| `cladoselache` | 171 cm | 170 cm |
| `clown-featherback` | 99 cm | 100 cm |
| `clown-loach` | 51 cm | 52 cm |
| `cobelodus` | 207 cm | 209 cm |
| `coccosteus` | 39 cm | 40 cm |
| `coelacanth` | 179 cm | 177 cm |
| `coho-salmon` | 98 cm | 99 cm |
| `common-bleak` | 24 cm | 25 cm |
| `common-carp` | 119 cm | 120 cm |
| `common-dace` | 39 cm | 40 cm |
| `common-dolphinfish` | 189 cm | 188 cm |
| `common-minnow` | 13 cm | 14 cm |
| `common-nase` | 49 cm | 50 cm |
| `common-ponyfish` | (26–27 cm)? | 28 cm |
| `common-roach` | 50 cm | 51 cm |
| `common-sawfish` | 750 cm | 747 cm |
| `cookiecutter-shark` | 55 cm | 56 cm |
| `coral-catshark` | 69 cm | 70 cm |
| `coral-hind` | 44 cm | 45 cm |
| `cornish-jack` | 149 cm | 148 cm |
| `cortez-rainbow-wrasse` | 15 cm | 16 cm |
| `corydoras-julii` | 5 cm | 6 cm |
| `crested-bullhead-shark` | 149 cm | 148 cm |
| `cretoxyrhina` | 602 cm | 696 cm |
| `crucian-carp` | 52 cm | 53 cm |
| `ctenurella` | 12 cm | 13 cm |
| `cyclops-shark` | (49–55 cm)? | 56 cm |
| `dab` | 39 cm | 40 cm |
| `dapedium` | 39 cm | 40 cm |
| `dartmuthia` | 23 cm | 24 cm |
| `deepwater-sculpin` | 22 cm | 23 cm |
| `deltoptychius` | 44 cm | 45 cm |
| `devils-hole-pupfish` | 2 cm | 3 cm |
| `discus` | 14 cm | 15 cm |
| `dolly-varden` | 60 cm | 61 cm |
| `doryaspis-arctica` | 14 cm | 15 cm |
| `doryaspis-nathorsti` | 14 cm | 15 cm |
| `dragon-wrasse` | 29 cm | 30 cm |
| `dusky-shark` | 419 cm | 415 cm |
| `dwarf-moray` | 28 cm | 29 cm |
| `eastern-mudminnow` | 14 cm | 15 cm |
| `elegant-firefish` | 8 cm | 9 cm |
| `elongate-tigerfish` | 77 cm | 78 cm |
| `emperor-angelfish` | 40 cm | 41 cm |
| `eurasian-ruffe` | 24 cm | 25 cm |
| `european-anchovy` | 19 cm | 20 cm |
| `european-chub` | 59 cm | 60 cm |
| `european-conger` | 299 cm | 294 cm |
| `european-perch` | 59 cm | 60 cm |
| `european-sea-sturgeon` | 599 cm | 597 cm |
| `evermannella-balbo` | 16 cm | 17 cm |
| `fantail-filefish` | 11 cm | 12 cm |
| `flame-angelfish` | 14 cm | 15 cm |
| `florida-gar` | (130–131 cm)? | 129 cm |
| `fourhorned-sculpin` | 29 cm | 30 cm |
| `french-angelfish` | 40 cm | 41 cm |
| `freshwater-butterflyfish` | 12 cm | 13 cm |
| `freshwater-goby` | 26 cm | 27 cm |
| `freshwater-hatchedfish` | 8 cm | 9 cm |
| `freshwater-lionfish` | 31 cm | 32 cm |
| `frontosa-chiclid` | 39 cm | 40 cm |
| `gar` | 199 cm | 197 cm |
| `giant-barb` | 294 cm | 293 cm |
| `giant-devil-ray` | 519 cm | 470 cm |
| `giant-freshwater-stingray` | (457–459 cm)? | 453 cm |
| `giant-grouper` | 304 cm | 303 cm |
| `giant-moray` | 299 cm | 291 cm |
| `giant-oceanic-manta-ray` | (908–909 cm)? | 901 cm |
| `giant-salmon-carp` | (112–129 cm)? | 130 cm |
| `giant-squid` | 1294 cm | 1268 cm |
| `glasseye-snapper` | 52 cm | 53 cm |
| `gloved-snailfish` | 41 cm | 42 cm |
| `goblin-shark` | (324–610 cm)? | 614 cm |
| `gold-nugget-pleco` | 30 cm | 31 cm |
| `gold-carp` | (118–119 cm)? | 114 cm |
| `golden-cave-catfish` | (15–16 cm)? | 17 cm |
| `golden-perch` | 75 cm | 76 cm |
| `golden-pike` | (137–139 cm)? | 135 cm |
| `goldentail-moray` | 69 cm | 70 cm |
| `goldfish` | 37 cm | 38 cm |
| `goldsilk-bream` | 89 cm | 86 cm |
| `goliath-tigerfish` | (149–197 cm)? | 147 cm |
| `gollumshark` | 109 cm | 110 cm |
| `grass-pickerel` | 37 cm | 38 cm |
| `grayling` | 59 cm | 60 cm |
| `great-white-shark` | (785–790 cm)? | 772 cm |
| `greater-blue-ringed-octopus` | 4 cm | 5 cm |
| `green-arowana` | 61 cm | 62 cm |
| `green-sawfish` | (726–729 cm)? | 724 cm |
| `greenland-shark` | 722 cm | 728 cm |
| `grideye-fish` | 15 cm | 16 cm |
| `guachanche-barracuda` | 198 cm | 194 cm |
| `guapote` | (69–71 cm)? | 68 cm |
| `gulf-signal-blenny` | 4 cm | 5 cm |
| `guppy` | 6 cm | 7 cm |
| `gyrodus` | 54 cm | 55 cm |
| `gyrosteus` | (514–515 cm)? | 506 cm |
| `hairy-pufferfish` | 11 cm | 12 cm |
| `halibut` | (364–365 cm)? | 356 cm |
| `hammerhead-shark` | 599 cm | 598 cm |
| `helicoprion` | 419 cm | 423 cm |
| `hellers-barracuda` | 78 cm | 79 cm |
| `honeycomb-cowfish` | 49 cm | 50 cm |
| `horn-shark` | 199 cm | 198 cm |
| `horse-mackerel` | 99 cm | 100 cm |
| `horseface-loach` | 29 cm | 30 cm |
| `hound-needlefish` | 149 cm | 150 cm |
| `hucho-taimen` | 209 cm | 208 cm |
| `humphead-parrotfish` | 150 cm | 149 cm |
| `hyneria` | 545 cm | 542 cm |
| `indian-glassfish` | 8 cm | 9 cm |
| `inlecypris-jayarami` | 9 cm | 10 cm |
| `isichthys-henryi` | 28 cm | 29 cm |
| `jack-dempsey` | 24 cm | 25 cm |
| `jardini-arowana` | 99 cm | 100 cm |
| `kaluga-sturgeon` | 559 cm | 556 cm |
| `kitefin-shark` | 179 cm | 177 cm |
| `kuhli-loach` | 10 cm | 11 cm |
| `lake-sturgeon` | 273 cm | 268 cm |
| `lake-trout` | 150 cm | 151 cm |
| `largemouth-bass` | 74 cm | 75 cm |
| `largetooth-sawfish` | (703–704 cm)? | 682 cm |
| `lavender-mbuna` | 10 cm | 11 cm |
| `leafscale-gulper-shark` | 157 cm | 156 cm |
| `leedsichthys` | (1208–1381 cm)? | 1636 cm |
| `lemon-shark` | 339 cm | 336 cm |
| `lemonpeel-angelfish` | 13 cm | 14 cm |
| `lesser-weever` | 14 cm | 15 cm |
| `livingstons-chichild` | 24 cm | 25 cm |
| `long-nosed-chimera` | 139 cm | 140 cm |
| `longfin-mako-shark` | 416 cm | 414 cm |
| `longhorn-cowfish` | 52 cm | 53 cm |
| `longnose-butterfly` | 22 cm | 23 cm |
| `longnose-hawkfish` | 12 cm | 13 cm |
| `longnose-sawshark` | 136 cm | 137 cm |
| `macropoma` | 60 cm | 61 cm |
| `malawi-eye-biter` | 22 cm | 23 cm |
| `marbled-headstander` | 13 cm | 14 cm |
| `marine-betta` | 19 cm | 20 cm |
| `materpiscis` | 27 cm | 28 cm |
| `megalodon` | 1799 cm | 1797 cm |
| `midas-cichlid` | 24 cm | 25 cm |
| `midwater-eelpout` | 16 cm | 17 cm |
| `milkfish` | 169 cm | 166 cm |
| `minute-leatherjacket` | 4 cm | 5 cm |
| `mirror-carp` | 151 cm | 152 cm |
| `moon-wrasse` | 44 cm | 45 cm |
| `moythomasia` | 10 cm | 11 cm |
| `muraena-augusti` | 130 cm | 129 cm |
| `neon-tetra` | 4 cm | 5 cm |
| `nile-tilapia` | 44 cm | 45 cm |
| `north-african-catfish` | 169 cm | 170 cm |
| `northern-lampfish` | 12 cm | 13 cm |
| `nurse-shark` | (428–429 cm)? | 424 cm |
| `ocean-sunfish` | 332 cm | 330 cm |
| `oceanic-whitetip-shark` | 401 cm | 400 cm |
| `ocellated-pufferfish` | 14 cm | 15 cm |
| `orange-banded-pipefish` | 18 cm | 19 cm |
| `orange-spotted-snakehead` | 39 cm | 40 cm |
| `orangespotted-soapfish` | 5 cm | 6 cm |
| `orangespotted-sunfish` | 39 cm | 40 cm |
| `orthacanthus` | 302 cm | 312 cm |
| `oscar` | 44 cm | 45 cm |
| `osteolepis` | 22 cm | 23 cm |
| `pacific-bluefin-tuna` | (300–303 cm)? | 287 cm |
| `pacuma-toadfish` | 56 cm | 57 cm |
| `paddlefish` | 275 cm | 276 cm |
| `paint-spotted-moray` | 140 cm | 141 cm |
| `painted-comber` | 34 cm | 35 cm |
| `painted-electric-ray` | 13 cm | 14 cm |
| `pale-chub` | 19 cm | 20 cm |
| `panther-grouper` | 69 cm | 70 cm |
| `paroon-shark` | 319 cm | 318 cm |
| `parrot-cichlid` | 31 cm | 32 cm |
| `payara` | 119 cm | 112 cm |
| `peacock-flounder` | 50 cm | 51 cm |
| `pearl-danio` | 6 cm | 7 cm |
| `pearly-razorfish` | 37 cm | 38 cm |
| `peled` | (48–49 cm)? | 50 cm |
| `pelican-barracuda` | 90 cm | 89 cm |
| `pelican-eel` | 87 cm | 88 cm |
| `pennant-coralfish` | 25 cm | 26 cm |
| `peppermint-angelfish` | 6 cm | 7 cm |
| `persian-sturgeon` | 234 cm | 231 cm |
| `phantom-bannerfish` | 16 cm | 17 cm |
| `picasso-triggerfish` | 24 cm | 25 cm |
| `pickhandle-barracuda` | 148 cm | 149 cm |
| `pictus-catfish` | 10 cm | 11 cm |
| `pikaia` | 6 cm | 7 cm |
| `pike` | 139 cm | 140 cm |
| `pike-cichlid` | 17 cm | 18 cm |
| `pineapplefish` | 21 cm | 22 cm |
| `pink-frogfish` | 37 cm | 38 cm |
| `pinktail-triggerfish` | 39 cm | 37 cm |
| `piraiba-catfish` | 359 cm | 356 cm |
| `piranha` | 39 cm | 40 cm |
| `piraya` | (48–49 cm)? | 50 cm |
| `platinum-golden-arowana` | (97–98 cm)? | 99 cm |
| `platysomus` | 21 cm | 22 cm |
| `pond-smelt` | 19 cm | 20 cm |
| `porkfish` | 40 cm | 39 cm |
| `potters-angelfish` | 10 cm | 11 cm |
| `pteraspis` | 28 cm | 29 cm |
| `puffer-fish` | 32 cm | 33 cm |
| `pumpkinseed-sunfish` | 24 cm | 25 cm |
| `queen-angelfish` | 44 cm | 45 cm |
| `queen-parrotfish` | 60 cm | 59 cm |
| `queen-triggerfish` | 60 cm | 61 cm |
| `rainbow-parrotfish` | 119 cm | 118 cm |
| `rainbow-runner` | 179 cm | 178 cm |
| `rainbow-trout` | 119 cm | 120 cm |
| `rainbowfish` | 18 cm | 19 cm |
| `red-bellied-pacu` | 91 cm | 92 cm |
| `red-indianfish` | 26 cm | 27 cm |
| `red-irish-lord` | 50 cm | 51 cm |
| `red-rainbowfish` | 11 cm | 12 cm |
| `red-scorpionfish` | 49 cm | 50 cm |
| `red-snapper` | 99 cm | 100 cm |
| `red-wolf-fish` | 19 cm | 20 cm |
| `redfin-pickerel` | 41 cm | 42 cm |
| `redhead-cichlid` | 34 cm | 35 cm |
| `ribbon-eel` | 129 cm | 130 cm |
| `rock-bass` | 42 cm | 43 cm |
| `rock-beauty` | 24 cm | 25 cm |
| `rusty-parrotfish` | 40 cm | 41 cm |
| `sailfish` | 314 cm | 312 cm |
| `sailray` | 122 cm | 123 cm |
| `salpa-maggiore` | (16–23 cm)? | 25 cm |
| `sand-tilefish` | 44 cm | 45 cm |
| `sarcastic-fringehead` | 31 cm | 32 cm |
| `sardinella` | 16 cm | 17 cm |
| `sargassum-triggerfish` | 24 cm | 25 cm |
| `satanoperca` | 14 cm | 15 cm |
| `saurychthis` | (127–128 cm)? | 130 cm |
| `sawback-angelshark` | 197 cm | 198 cm |
| `senegal-bichir` | 79 cm | 76 cm |
| `sergeant-major` | 22 cm | 23 cm |
| `shark` | 791 cm | 788 cm |
| `sharpfin-barracuda` | 79 cm | 80 cm |
| `sharpnose-sevengill-shark` | 139 cm | 140 cm |
| `siamese-fighting-fish` | 10 cm | 11 cm |
| `siamese-tigerfish` | 44 cm | 45 cm |
| `siberian-sturgeon` | (201–202 cm)? | 195 cm |
| `silver-carp` | (138–139 cm)? | 140 cm |
| `silver-scabbardfish` | 209 cm | 208 cm |
| `sleepy-cod` | 44 cm | 45 cm |
| `smallmouth-bass` | 52 cm | 53 cm |
| `smooth-trunkfish` | 49 cm | 50 cm |
| `snowflake-moray` | 101 cm | 102 cm |
| `south-american-lungfish` | 124 cm | 123 cm |
| `southern-bluefin-tuna` | 244 cm | 243 cm |
| `spanish-hogfish` | 40 cm | 41 cm |
| `spearfish-remora` | 49 cm | 50 cm |
| `spinner-shark` | 300 cm | 298 cm |
| `spotted-bass` | 63 cm | 64 cm |
| `spotted-gar` | (148–149 cm)? | 147 cm |
| `spotted-handfish` | 14 cm | 15 cm |
| `spotted-pike-characin` | 31 cm | 32 cm |
| `spotted-sicklefish` | 49 cm | 50 cm |
| `spotted-wobbegong` | 319 cm | 314 cm |
| `stareater` | 20 cm | 21 cm |
| `starry-sturgeon` | 219 cm | 217 cm |
| `stethacanthus` | (55–189 cm)? | 191 cm |
| `stone-loach` | 20 cm | 21 cm |
| `striped-headstander` | 21 cm | 22 cm |
| `striped-marlin` | (418–419 cm)? | 410 cm |
| `suckermouth-catfish` | 49 cm | 50 cm |
| `sulawesi-coelacanth` | 139 cm | 123 cm |
| `sunbleak` | 11 cm | 12 cm |
| `swordfish` | 449 cm | 443 cm |
| `tadpole-snailfish` | 5 cm | 6 cm |
| `tailspot-ctenopoma` | 24 cm | 25 cm |
| `tambaqui` | 99 cm | 100 cm |
| `taylors-inflator-filefish` | 4 cm | 5 cm |
| `texas-cichlid` | 29 cm | 30 cm |
| `three-spined-stickleback` | 10 cm | 11 cm |
| `tiger-grouper` | 104 cm | 105 cm |
| `tiger-muskellunge` | 149 cm | 148 cm |
| `tomato-clownfish` | 13 cm | 14 cm |
| `tope-shark` | 192 cm | 193 cm |
| `treefish` | 40 cm | 41 cm |
| `twin-spot-goby` | 9 cm | 10 cm |
| `unicorn-crestfish` | 148 cm | 149 cm |
| `vandellia` | 19 cm | 20 cm |
| `weedy-seadragon` | 44 cm | 45 cm |
| `weever-fish` | 34 cm | 35 cm |
| `wels-catfish` | 259 cm | 257 cm |
| `wenchman` | 55 cm | 56 cm |
| `white-marlin` | 300 cm | 301 cm |
| `white-eyed-moray` | 65 cm | 66 cm |
| `white-spotted-damsel` | 12 cm | 13 cm |
| `white-spotted-puffer` | 49 cm | 50 cm |
| `whitebarred-catfish` | 14 cm | 15 cm |
| `whitespotted-boxfish` | 24 cm | 25 cm |
| `winghead-shark` | 188 cm | 185 cm |
| `yangtze-sturgeon` | 251 cm | 238 cm |
| `yellow-boxfish` | 44 cm | 45 cm |
| `yellow-perch` | 53 cm | 54 cm |
| `yellow-tang` | 23 cm | 24 cm |
| `yellow-tail-arowana` | 102 cm | 103 cm |
| `yellowfin-tuna` | 239 cm | 238 cm |
| `yellowhead-moray` | 79 cm | 80 cm |
| `yellowhead-wrasse` | 18 cm | 19 cm |
| `zander` | 129 cm | 128 cm |
| `zingel-streber` | 26 cm | 23 cm |

</details>

<details><summary>rarity (2)</summary>

| ryba | naše | funwiki |
|---|---|---|
| `murray-cod` | 3 | 4 |
| `xenacanthus` | 4 | 2 |

</details>

<details><summary>season (5)</summary>

| ryba | naše | funwiki |
|---|---|---|
| `bull-shark` | Always | October 1-December 31, January 1-August 31 |
| `horn-shark` | Always | February 1-November 30 |
| `hucho-taimen` | April - October | April 1-June 30, August 1-September 30 |
| `spotted-gar` | Always | January 1-February 28, May 1-December 31 |
| `yellow-tail-arowana` | December - April | December 1-31, January 1-March 31 |

</details>

<details><summary>time (23)</summary>

| ryba | naše | funwiki |
|---|---|---|
| `amazon-leaf-fish` | Always | 11:00-17:00 |
| `apache-trout` | 18:00-09:00 | 05:00-09:00, 18:00-22:00 |
| `asian-green-arowana` | 20:00-04:00 | 20:00-02:00 |
| `banded-butterflyfish` | Always | 14:00-19:00 |
| `bigfin-reef-squid` | Always | 23:00-14:00 |
| `birdbeak-dogfish` | Always | 01:00-05:00 |
| `black-arowana` | 13:45-14:00 | 10:00-10:15, 13:45-14:00, 03:15-03:30 |
| `blackbar-soldierfish` | 22:00-05:00 | 22:00-04:30 |
| `blue-malayan-arowana` | Always | 23:00-05:00 |
| `bowfin` | Always | 08:00-18:00 |
| `fire-eel` | 23:00-04:00 | 22:00-04:00 |
| `goblin-shark` | 09:00-12:00 | 09:00-14:00 |
| `green-arowana` | Always | 01:00-06:00 |
| `hogfish` | Always | 07:00-20:00 |
| `hucho-taimen` | Always | 05:00-09:00, 18:00-22:00 |
| `jardini-arowana` | 06:00-08:00 | 05:00-09:00 |
| `mariana-snailfish` | 01:00-04:00 | 00:00-05:00 |
| `pumpkinseed-sunfish` | Always | 08:00-18:00 |
| `rainbow-darter` | Always | 10:00-22:00 |
| `red-striped-rasbora` | Always | 08:00-18:00 |
| `striped-headstander` | Always | 08:00-18:00 |
| `tadpole-snailfish` | 00:00-05:00 | 00:00-06:00 |
| `tiger-muskellunge` | Always | 08:00-22:00 |

</details>

## Co v archivu chybí

### Neúspěšná stahování (fetch selhal 3× nebo 404)

- `https://web.archive.org/web/20230718084642im_/http://fishaowiki.com/wp-content/uploads/2018/02/Kitefin_Shark.png class=` — HTTP 404
- `https://web.archive.org/web/20230718084642im_/http://fishaowiki.com/wp-content/uploads/2018/02/Kitefin_Shark.png` — HTTP 404

### Ryby, jejichž obrázek nejde stáhnout

- `kitefin-shark`: `https://web.archive.org/web/20230718084642im_/http://fishaowiki.com/wp-content/uploads/2018/02/Kitefin_Shark.png class=` → previously failed: HTTP 404; `https://web.archive.org/web/20230718084642im_/http://fishaowiki.com/wp-content/uploads/2018/02/Kitefin_Shark.png` → previously failed: HTTP 404

### Ryby bez obrázku ve zdroji (20)

Řádek tabulky obrázek ryby nemá (nebo je ryba jen v textové tabulce all-in-one).

- `african-mottled-eel` (5-star-fish, all-in-one, area-fish)
- `angler-snake-eel` (all-in-one, area-fish)
- `arrowhead-soapfish` (all-in-one)
- `barnards-lanterfish` (all-in-one)
- `birdbeak-dogfish` (all-in-one)
- `blue-panchax` (all-in-one, area-fish)
- `bluestripe-pipefish` (all-in-one, area-fish)
- `crocodile-tooth-pipefish` (all-in-one, area-fish)
- `dwarf-moray` (all-in-one, area-fish)
- `flourescing-goatfish` (5-star-fish, all-in-one, area-fish)
- `fresh-water-moray` (all-in-one, area-fish)
- `golden-gar` (all-in-one)
- `grammonus-yunokawai` (5-star-fish, all-in-one, area-fish)
- `green-birdmouth-wrasse` (all-in-one, area-fish)
- `mariana-snailfish` (5-star-fish, all-in-one, area-fish)
- `red-rainbowfish` (5-star-fish, all-in-one, breeder-fish)
- `shortdorsal-cutthroat-eel` (5-star-fish, all-in-one, area-fish)
- `smoothtail-mobula` (5-star-fish, all-in-one, tournament-fish)
- `sulawesi-coelacanth` (5-star-fish, all-in-one, area-fish)
- `taylors-inflator-filefish` (all-in-one, area-fish)

## Automatické řešení konfliktů (`scraper/resolve.py`)

Čas, sezóna a návnada, kde se tabulky wiki neshodují nebo je hodnota nejistá. Pořadí pravidel: **certain_consensus** (zahodit `?`/`???`/datum ve sloupci času; zbylé jisté hodnoty se shodují) → **fishao_cz_tiebreak** (jisté hodnoty se liší, vybrána ta, se kterou souhlasí fishao.cz) → **fishao_cz_fill** (wiki nemá jistou hodnotu, fishao.cz má jednoznačnou). Porovnává se rozparsovaný tvar, takže `Sept - March` = `Sep-Dec, Jan-March` = `01.09. - 31.03.`. Řádky s prohozeným Season/Time jsou opravené (`fix` v `extra.occurrences`). Rozhodnutí je u ryby v `extra.filled_from.<pole>` včetně kandidátů. Nakonec **newer_source**: kde se wiki a fishao.cz pořád neshodují, vyhrává novější fishao.cz a pole jde do `uncertain` (UI „?"); **uncertain_value**: použita hodnota s `?` ze zdroje (taky `uncertain`). Oblasti: když fishao.cz uvádí jinou sadu oblastí, použije se ta (`extra.areas_wiki` drží původní).

| pole | pravidlo | ryb |
|---|---|---|
| bait | fishao_cz_tiebreak | 24 |
| bait | newer_source | 12 |
| season | certain_consensus | 21 |
| season | fishao_cz_fill | 4 |
| season | fishao_cz_tiebreak | 2 |
| season | newer_source | 14 |
| season | uncertain_value | 2 |
| time | certain_consensus | 14 |
| time | fishao_cz_fill | 1 |
| time | fishao_cz_tiebreak | 13 |
| time | newer_source | 54 |

## Ruční doplnění — `scraper/resolutions.csv`

Zbylé konflikty a díry (návnada, sezóna, čas, rarita, český název), které žádný zdroj jednoznačně neřeší. CSV (`;`, UTF-8) jde otevřít v Excelu: sloupec `options` = hodnoty z wiki s tabulkami, odkud jsou, `fishao_cz` = co uvádí fishao.cz (česky, jako nápověda). Vyplněná `value` se při dalším buildu použije (`extra.filled_from.<pole>.source = "manual"`) a při přegenerování CSV se nikdy nepřepíše.

| pole | problém | celkem | otevřeno |
|---|---|---|---|
| name_cs | fallback_en | 5 | 5 |

Použito ručních hodnot: 0; otevřeno: 5.

## Chybějící pole

`null` = hodnota není ani na wiki, ani (u času a rarity) na fishao.cz, **nebo** se zdroje neshodují. Ceny a počasí nejsou součástí datasetu (rozhodnutí uživatele) — sloupec *Max Price* se při parsování zahazuje.

| pole | chybí u |
|---|---|
| `areas` | 0 |
| `time` | 0 |
| `season` | 0 |
| `rarity` | 0 |
| `bait` | 0 |
| `max_length_cm` | 0 |
| `image` | 0 |

### Raw hodnota existuje, ale nejde jednoznačně rozparsovat

Parsované pole je null, `*_raw` obsahuje text ze zdroje.

- **time** (0): —
- **season** (0): —

### Ryby s chybějícími poli

| ryba | chybí |
|---|---|

## Konflikty mezi tabulkami

Ryba je ve více tabulkách (každá oblast, 5-star, all-in-one) a hodnoty se liší (porovnáno po normalizaci formátu). Varianty jsou v `extra.conflicts`, celé řádky v `extra.occurrences`. Většinu řeší pravidla (sekce Automatické řešení) nebo ruční CSV; jinak zůstává hlavní pole null.

| pole | ryb s konfliktem | z toho nevyřešeno |
|---|---|---|
| Time | 33 | 0 |
| Season | 28 | 0 |
| Bait | 25 | 0 |
| rarity | 3 | 0 |

<details><summary>Všechny konflikty</summary>

- `banded-butterflyfish` **Time**: `Always` / `14:00-19:00`
- `barbel` **Bait**: `Dough, Fish, Insects, Vegetal` / `Dough, Insects, Lures, Vegetal`
- `barracuda` **Bait**: `Barracuda Lure, Fish, Lures` / `Fish, Lures`
- `basketfish` **Bait**: `Dough, Vegetal` / `Fish, Insects`
- `basking-shark` **Season**: `Always` / `May - ?`
- `bigeye-tuna` **Season**: `March-May, Aug-Dec` / `Always`
- `bigfin-reef-squid` **Time**: `Always` / `23:00-14:00`
- `bighead-carp` **Time**: `11:00-15:00` / `11:00-05:00`
- `blackbar-soldierfish` **Time**: `22:00-05:00` / `22:00-04:30`
- `blue-marlin` **Season**: `July-September` / `July-?`
- `blue-spotted-grouper` **Bait**: `Fish, Insects, Lures` / `Insects, Lures`
- `bull-shark` **Bait**: `Fish, Meat, Shark Lure` / `Fish, Meat`
- `bull-shark` **Season**: `Always` / `???`
- `coelacanth` **Time**: `16:00-02:00` / `23:00-?`
- `danube-salmon` **Bait**: `Fish, Insects, Lures` / `Fish, Insects`
- `danube-salmon` **Time**: `Always` / `???`
- `danube-salmon` **Season**: `Always` / `???`
- `emperor-red-snapper` **Bait**: `Fish, Lures` / `Fish, Insects`
- `evermannella-balbo` **Time**: `Always?` / `Always`
- `fairy-basslet` **Time**: `11:00-01:00` / `Always`
- `fangtooth-moray` **Bait**: `Insects, Meat` / `Meat`
- `fire-eel` **Time**: `23:00-04:00` / `???`
- `fire-eel` **Season**: `Always` / `???`
- `florida-gar` **Bait**: `Fish, Lures` / `Fish, Insects`
- `florida-gar` **Season**: `Jan-Feb, May-Dec` / `Always` / `Janurary-February, May - December`
- `french-grunt` **Bait**: `Lures` / `Fish, Lures`
- `french-grunt` **Time**: `21:00-05:00` / `21:00-06:00`
- `freshwater-lionfish` **Bait**: `Fish, Insects, Meat` / `Fish, Insects`
- `frilled-shark` **Time**: `05:00-06:00` / `???`
- `frilled-shark` **Season**: `April - December` / `???`
- `giant-salmon-carp` **Season**: `Always` / `October - ?`
- `goblin-shark` **Time**: `09:00-12:00` / `???`
- `goblin-shark` **Season**: `Always` / `May - ?`
- `golden-arowana` **rarity**: `4` / `4star.png` / `5star.png`
- `golden-cave-catfish` **Season**: `Always` / `Sept - ?`
- `golden-dorado` **Time**: `05:00-00:00` / `00:00-05:00`
- `golden-dorado` **Season**: `June-Sep` / `June-???`
- `goldfish` **Time**: `Always` / `23:00-04:00`
- `grammonus-yunokawai` **Time**: `02:00-06:00` / `23:00-06:00`
- `grammonus-yunokawai` **Season**: `Oct 1 - Oct 30` / `Always`
- `green-moray` **Bait**: `Insects, Lures` / `Fish, Insects, Lures`
- `green-red-arowana` **Time**: `Always` / `14:00-00:00`
- `guapote` **Season**: `Always` / `Aug - ??`
- `horn-shark` **Time**: `23:00-?` / `Always`
- `largetooth-sawfish` **Season**: `Always` / `March - ?`
- `lavender-mbuna` **Time**: `13:00-15:00` / `Always`
- `lionhead-goldfish` **Bait**: `Dough, Insects, Vegetal` / `Dough`
- `longnose-sawshark` **Bait**: `Shark Lure` / `Fish, Insects`
- `mandarinfish` **Season**: `July-September` / `July-???`
- `marine-betta` **Time**: `00:00-05:00` / `Always`
- `megamouth-shark` **Time**: `Always` / `???`
- `megamouth-shark` **Season**: `Always` / `May-?`
- `mexican-hogfish` **Time**: `08:00-19:00` / `07:00-19:00`
- `moon-wrasse` **Bait**: `Insects` / `Fish, Insects`
- `muraena-augusti` **Time**: `Always` / `23:00-00:00`
- `murray-cod` **rarity**: `4` / `3star.png`
- `northern-lampfish` **Bait**: `Dough, Insects, Vegetal` / `Fish, Insects`
- `northern-lampfish` **Time**: `00:00-08:00` / `Always`
- `paroon-shark` **Bait**: `Dough, Insects, Fish, Meat, Shark Lures, Vegetal` / `Fish, Insects, Shark Bait`
- `paroon-shark` **Season**: `Sept-March` / `Always`
- `peacock-flounder` **Bait**: `Insects, Lures` / `Lures`
- `pelican-barracuda` **Time**: `15:00-22:00` / `Always`
- `pineapplefish` **Bait**: `Insects` / `Fish, Insects`
- `platinum-golden-arowana` **Time**: `Always` / `00:00-?`
- `rainbow-darter` **Season**: `March-October` / `May-October`
- `rainbow-runner` **Season**: `March-?` / `March-August`
- `red-bellied-pacu` **Bait**: `Fish, Insects, Vegetal, Meat` / `Vegetal, Insects, Meat`
- `red-lipped-batfish` **Bait**: `Fish, Insects` / `Insects`
- `red-striped-goby` **Bait**: `Dough, Vegetal` / `Fish, Insects`
- `rock-bass` **Bait**: `Fish, Insects, Lures` / `Dough, Fish, Insects, Lures`
- `ruby-seadragon` **Time**: `03:00-08:00` / `03:00-07:00`
- `schoolmaster-snapper` **Time**: `Always` / `17:00-05:00`
- `silver-arowana` **Bait**: `Fish, Insects, Meat` / `Fish, Insects`
- `smoothtail-mobula` **Time**: `Always` / `?`
- `smoothtail-mobula` **Season**: `Always` / `Feb - ?`
- `spotted-handfish` **Season**: `Always` / `Sep - ?`
- `starry-sturgeon` **Time**: `23:00-05:00?` / `23:00-05:00`
- `thresher-shark` **Time**: `Always` / `???`
- `thresher-shark` **Season**: `Always` / `May-?`
- `tiger-shark` **Time**: `Always` / `???`
- `tiger-shark` **Season**: `Always` / `May-?`
- `treefish` **Season**: `March - ?` / `Always`
- `unicorn-crestfish` **Time**: `Always` / `???`
- `unicorn-crestfish` **Season**: `Always` / `October - ?`
- `white-sturgeon` **Time**: `12:00-17:00` / `Always`
- `whitemouth-moray` **Bait**: `Fish, Insects` / `Fish, Insects, Meat`
- `winghead-shark` **Season**: `?July-March?` / `July(?)-March(?)` / `? July - March ?`
- `xenacanthus` **rarity**: `2` / `4star.png`
- `yellow-tail-arowana` **Season**: `Dec - March` / `December - April` / `December - March`

</details>

## Duplicity a kolize id

ID = slug jména po odstranění kvalifikátorů v závorce a slova `Unlockable` (např. `Arctic Char (Raft only)` → `arctic-char`). Kvalifikátory jsou v `extra.qualifiers`, původní zápisy v `extra.name_variants`.

- Duplicitní id ve výstupu: žádné
- Ryb sloučených z různě zapsaných jmen: 36
- Ručně schválené aliasy (`scraper/aliases.json` → `fish`): 10
  - `white-spotted-damsell` → `white-spotted-damsel`
  - `bluespotted-grouper` → `blue-spotted-grouper`
  - `long-nosed-chimaera` → `long-nosed-chimera`
  - `carchacocles-chubutensis` → `carcharocles-chubutensis`
  - `bullshark` → `bull-shark`
  - `grammonus-yumokawai` → `grammonus-yunokawai`
  - `astrapis` → `astraspis`
  - `azul-pracock-bass` → `azul-peacock-bass`
  - `goldcarp` → `gold-carp`
  - `bullet-barracuda` → `bullet-tuna`

### Podezřelé duplicity — kandidáti na alias (14, z toho 9 komplementárních)

Podobná id (difflib ≥ 0.85). *Komplementární* = jedno id je jen v all-in-one a druhé jen v ostatních tabulkách → velmi pravděpodobně ta samá ryba s překlepem. Nesloučeno, dokud se nepřidá do `aliases.json` → `fish` (`"varianta": "cílové-id"`).

| A | B | podobnost | komplementární | zápisy A | zápisy B |
|---|---|---|---|---|---|
| `white-spotted-damsel` | `white-spotted-damsell` | 0.976 | ano | White-Spotted Damsel | White-Spotted Damsell |
| `blue-spotted-grouper` | `bluespotted-grouper` | 0.974 | ano | Blue-Spotted Grouper (U) | Bluespotted Grouper |
| `long-nosed-chimaera` | `long-nosed-chimera` | 0.973 | ano | Long-nosed Chimaera | Long-nosed Chimera |
| `carchacocles-chubutensis` | `carcharocles-chubutensis` | 0.958 | ano | Carchacocles Chubutensis | Carcharocles Chubutensis |
| `bull-shark` | `bullshark` | 0.947 | ano | Bull Shark | Bullshark |
| `grammonus-yumokawai` | `grammonus-yunokawai` | 0.947 | ano | Grammonus Yumokawai | Grammonus Yunokawai |
| `astrapis` | `astraspis` | 0.941 | ano | Astrapis | Astraspis |
| `azul-peacock-bass` | `azul-pracock-bass` | 0.941 | ano | Azul Peacock Bass | Azul Pracock Bass |
| `gold-carp` | `goldcarp` | 0.941 | ano | Gold Carp | Goldcarp |
| `orangespotted-soapfish` | `orangespotted-sunfish` | 0.884 |  | Orangespotted Soapfish | Orangespotted Sunfish |
| `beluga-sturgeon` | `kaluga-sturgeon` | 0.867 |  | Beluga Sturgeon | Kaluga Sturgeon |
| `green-arowana` | `green-red-arowana` | 0.867 |  | Green Arowana | Green Red Arowana |
| `african-arowana` | `asian-arowana` | 0.857 |  | African Arowana | Asian Arowana |
| `blackfin-dartfish` | `blackfin-pearlfish` | 0.857 |  | Blackfin Dartfish | Blackfin Pearlfish |

### Jen v all-in-one (4) / chybí v all-in-one (0)

Jen v all-in-one: `arrowhead-soapfish`, `barnards-lanterfish`, `birdbeak-dogfish`, `golden-gar`

Chybí v all-in-one: —

## Struktura a podezřelé věci

### Varianty hlaviček tabulek

- area-fish (17×): Fish | Bait | Season | Time | World record | Max Price
- area-fish (1×): Fish | Bait | Season | Time | World record | Max Price | Pool
- tournament-fish (4×): Fish | Bait | Season | Time | World record | Max Price
- breeder-fish (1×): Fish | Bait | Season | Time | World record | Max Price | Home points
- 5-star-fish (1×): Fish | Bait | Area | Season | Time | World record | Max Price
- all-in-one (1×): Fish | Area | Stars | Bait | Season | Time | World record | Max Price

### Oblasti

Oblast = sekce (`<h2>` + tabulka) na area-fish (`kind: area`), tournament-fish (`kind: tournament`) a breeder-fish (`kind: backyard`). Popis ani obrázek oblasti wiki nemá → `description`/`image` null.

Přesné místo uvnitř oblasti (molo, loď, pyramida, …) je u ryby v `area_spots` `{area_id: [spot]}` — filtruje se podle oblasti, místo se ukazuje jako poznámka. Furniture Factory je místo v Mystic Desert.

| id | název | kind | ryb | místa |
|---|---|---|---|---|
| `laketown` | Laketown | area | 23 | Trout Farm |
| `rio-tropical` | Rio Tropical | area | 19 |  |
| `little-rio` | Little Rio | area | 12 |  |
| `pinheira-beach` | Pinheira Beach | area | 44 | Pier, Pyramid |
| `cool-mountain` | Cool Mountain | area | 21 | Raft |
| `mystic-desert` | Mystic Desert | area | 20 | Furniture Factory, Pyramid |
| `sibiri-city` | Sibiri City | area | 16 |  |
| `aquayama` | Aquayama | area | 20 |  |
| `seagull-harbor` | Seagull Harbor | area | 40 | Boat |
| `thombani-town` | Thombani Town | area | 15 | Enclosure |
| `marshville` | Marshville | area | 18 |  |
| `lost-valley-1` | Lost Valley 1 | area | 9 |  |
| `lost-valley-2` | Lost Valley 2 | area | 45 |  |
| `palm-island` | Palm Island | area | 84 | Inside, Outside |
| `pirate-cave` | Pirate Cave | area | 7 |  |
| `club` | Club | area | 80 | Fresh Water Pond, Monster Pond, Salt Water Pond |
| `lucky-raft` | Lucky Raft | area | 21 |  |
| `boat-on-sea-tournament` | Boat on Sea Tournament | tournament | 29 |  |
| `lake-run-tournament` | Lake Run Tournament | tournament | 16 |  |
| `race-magic-15-tournament` | Race (Magic 15) Tournament | tournament | 14 |  |
| `moray-tournament` | Moray Tournament | tournament | 18 |  |
| `backyard` | Backyard | backyard | 83 |  |

### Hodnoty sloupce Area (all-in-one, 5-star), které neodpovídají žádné oblasti (0)

Překlepy nebo jiný název; do `areas[]` ryby se nepočítají. Lze schválit v `aliases.json` → `areas` (`"text": "area-id"`).

- (nic)

### Oblasti podle tabulek vs. podle sloupce Area

Ryba je v tabulce oblasti, ale text Area ji tam neuvádí (nebo naopak). `extra.area_sources` říká, odkud která oblast je.

Počet: 0

<details><summary>Seznam</summary>

- (nic)

</details>

### Slovník návnad (bez oprav překlepů)

`Barracuda Lure` (10), `Dough` (117), `Fish` (300), `Hook` (5), `Insects` (337), `Lures` (109), `Marlin Lure` (3), `Meat` (37), `Monkfish Lure` (1), `Monster Bait` (3), `Pelican Lure` (1), `Prehistoric Bait` (45), `Shark Bait` (46), `Star Lure` (1), `Tuna Lure` (8), `Vegetal` (134)

### Ostatní poznámky parseru

- angler-snake-eel: Season/Time swapped in all-in-one row ('02:00-02:15' / 'Always')
- fresh-water-moray: Season/Time swapped in all-in-one row ('01:00-06:00' / 'Always')
- grammonus-yunokawai: Season/Time swapped in all-in-one row ('02:00-06:00' / 'Oct 1 - Oct 30')

### Pole na wiki → JSON

| wiki | JSON |
|---|---|
| Fish | `name` (+ `extra.name_variants`, `extra.qualifiers`) |
| Bait | `bait[]` (kanonické: opravené překlepy, Shark Lure = Shark Bait), `bait_raw` (text ze zdroje) |
| Season | `season` (`"always"` nebo `[{from: "MM-DD", to}]`), `season_raw` |
| Time | `time` (`"always"` nebo `[{from,to}]`), `time_raw` |
| World record + fishao.cz Délka / maximální | `max_length_cm` `{min, max}`, `max_length_label` (`449 cm` / při neshodě `(448–449 cm)?`), `max_length_raw` (hodnoty + zdroje) |
| fishaofunwiki minLength / avgLength / maxLength | `length_cm` `{min, avg, max}` (rozsah délky úlovku) |
| Max Price, fishao.cz ceny | **zahozeno** (jen `has_glowing_variant` z existence zářivé ceny) |
| hvězdy (obrázek `Nstar.png`) / Stars | `rarity` 1–5, `rarity_raw` |
| Area (all-in-one, 5-star) | → `areas[]` při přesné shodě, raw v `extra.occurrences` |
| Pool (Club) | `extra.pool` |
| Home points (Backyard) | `extra.home_points` |

