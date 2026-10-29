# Fishdex — report scrapu

Vygenerováno 2026-10-29 skriptem `scraper/scrape.py`. Soubor se přepisuje při každém běhu — needitovat ručně.

## Souhrn

- **Ryb:** 616
- **Oblastí:** 23 (area: 18, backyard: 1, tournament: 4)
- **S obrázkem:** 616 / 616
- **Se zářivou variantou (podle fishao.cz):** 615 — fishaowiki zářivé varianty vůbec neuvádí, viz níže.
- **S českým názvem (fishao.cz):** 609 / 616
- **Zdroj obrázků:** fishaowiki: 594, fishao.cz: 22
- **S konfliktem hodnot mezi tabulkami:** 165

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
- ryb z wiki bez stránky na fishao.cz: 1
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

Jen report — hodnoty z wiki se nepřepisují. Délka *maximální* na fishao.cz nemusí být totéž co *World record* na wiki.

| porovnání | rozdílů |
|---|---|
| Max Price × Cena v obchodě / maximální | 198 |
| hvězdy × Výskyt | 0 |
| Time × čas | 48 |
| World record × Délka maximální | 30 |
| konfliktní názvy mezi více stránkami (nevyřešené) | 1 |

**Doplněno z fishao.cz** (na wiki null — chybí, `?` nebo konflikt mezi tabulkami; fishao.cz stránky se shodují a hodnota jde rozparsovat): max_price: 63, rarity: 3, time: 27. U ryby v `extra.filled_from.<pole>` = `{source, reason, wiki_raw}`; `*_raw` pak obsahuje text z fishao.cz. Ostatní pole z fishao.cz se nepřebírají.

<details><summary>Cena (198)</summary>

- `african-knifefish`: wiki `13` × fishao.cz `[12]`
- `african-mottled-eel`: wiki `1423` × fishao.cz `[1497]`
- `alpine-bullhead`: wiki `3` × fishao.cz `[2]`
- `aphyonidae`: wiki `295` × fishao.cz `[282]`
- `arandaspis`: wiki `22` × fishao.cz `[24]`
- `arctic-char`: wiki `18` × fishao.cz `[17]`
- `ariidae`: wiki `21` × fishao.cz `[20]`
- `arrowhead-soapfish`: wiki `17` × fishao.cz `[21]`
- `aspidorhynchus`: wiki `41` × fishao.cz `[47]`
- `astraspis`: wiki `9` × fishao.cz `[20]`
- `bagarius`: wiki `24` × fishao.cz `[23]`
- `bagrus-bajad`: wiki `4` × fishao.cz `[3]`
- `barbel`: wiki `13` × fishao.cz `[12]`
- `barnards-lanterfish`: wiki `24` × fishao.cz `[26]`
- `barracuda`: wiki `36` × fishao.cz `[35]`
- `barramundi`: wiki `207` × fishao.cz `[149]`
- `betta-brownorum`: wiki `3` × fishao.cz `[1]`
- `bigmouth-buffalo`: wiki `13` × fishao.cz `[12]`
- `birdbeak-dogfish`: wiki `100` × fishao.cz `[104]`
- `black-acara`: wiki `13` × fishao.cz `[12]`
- `black-crappy`: wiki `3` × fishao.cz `[2]`
- `blackfin-pearlfish`: wiki `4` × fishao.cz `[3]`
- `blacktip-reef-shark`: wiki `27` × fishao.cz `[30]`
- `blue-bellied-night-wanderer`: wiki `747` × fishao.cz `[749]`
- `blue-lyretail`: wiki `7` × fishao.cz `[6]`
- `bonnethead-shark`: wiki `27` × fishao.cz `[24, 26]`
- `boreaspis`: wiki `6` × fishao.cz `[14]`
- `bream`: wiki `4` × fishao.cz `[3]`
- `broad-barred-goby`: wiki `4` × fishao.cz `[5]`
- `catla`: wiki `13` × fishao.cz `[12]`
- `cherry-salmon`: wiki `13` × fishao.cz `[12]`
- `chilhuil-sea-catfish`: wiki `142` × fishao.cz `[130, 147]`
- `chinese-false-gudgeon`: wiki `3` × fishao.cz `[2]`
- `chinese-paddlefish`: wiki `183` × fishao.cz `[186]`
- `chinook-salmon`: wiki `40` × fishao.cz `[39]`
- `chinstrap-jawfish`: wiki `5` × fishao.cz `[6]`
- `cladoselache`: wiki `68` × fishao.cz `[108]`
- `clown-featherback`: wiki `40` × fishao.cz `[39]`
- `clownfish`: wiki `4` × fishao.cz `[3]`
- `coccosteus`: wiki `16` × fishao.cz `[20]`
- `common-dolphinfish`: wiki `36` × fishao.cz `[35]`
- `common-salmon`: wiki `13` × fishao.cz `[12]`
- `common-sawfish`: wiki `578` × fishao.cz `[804]`
- `coral-hind`: wiki `7` × fishao.cz `[6]`
- `crucian-carp`: wiki `4` × fishao.cz `[1]`
- `ctenurella`: wiki `14` × fishao.cz `[17]`
- `cyclops-shark`: wiki `2200` × fishao.cz `[1636]`
- `dab`: wiki `6` × fishao.cz `[5]`
- `dapedium`: wiki `20` × fishao.cz `[30]`
- `deepwater-sculpin`: wiki `18` × fishao.cz `[17]`
- `deltoptychius`: wiki `51` × fishao.cz `[66]`
- `devils-hole-pupfish`: wiki `4202` × fishao.cz `[3749]`
- `discus`: wiki `4` × fishao.cz `[3]`
- `dolly-varden`: wiki `13` × fishao.cz `[12]`
- `doryaspis-nathorsti`: wiki `10` × fishao.cz `[29]`
- `dragon-wrasse`: wiki `10` × fishao.cz `[6]`
- `drepanaspis`: wiki `38` × fishao.cz `[44]`
- `dunkleosteus`: wiki `1147` × fishao.cz `[1195]`
- `dwarf-moray`: wiki `58` × fishao.cz `[57, 59]`
- `eel`: wiki `22` × fishao.cz `[21]`
- `electric-catfish`: wiki `36` × fishao.cz `[35]`
- `elegant-firefish`: wiki `10` × fishao.cz `[6]`
- `elongate-tigerfish`: wiki `18` × fishao.cz `[17]`
- `enchodus`: wiki `38` × fishao.cz `[54]`
- `eurasian-ruffe`: wiki `29` × fishao.cz `[36]`
- `european-chub`: wiki `9` × fishao.cz `[8]`
- `european-flounder`: wiki `9` × fishao.cz `[6]`
- `fiddler-ray`: wiki `143` × fishao.cz `[111]`
- `flame-angelfish`: wiki `9` × fishao.cz `[8]`
- `florida-gar`: wiki `120` × fishao.cz `[89]`
- `flourescing-goatfish`: wiki `78` × fishao.cz `[81]`
- `french-angelfish`: wiki `24` × fishao.cz `[23]`
- `freshwater-butterflyfish`: wiki `13` × fishao.cz `[12]`
- `freshwater-drum`: wiki `18` × fishao.cz `[17]`
- `giant-barb`: wiki `30` × fishao.cz `[29]`
- `giant-gourami`: wiki `36` × fishao.cz `[35]`
- `giant-kokopu`: wiki `150` × fishao.cz `[111]`
- `giant-moray`: wiki `36` × fishao.cz `[35]`
- `giant-oarfish`: wiki `748` × fishao.cz `[749]`
- `giant-salmon-carp`: wiki `898` × fishao.cz `[881, 899]`
- `gloved-snailfish`: wiki `34` × fishao.cz `[36]`
- `gold-spotted-rabbitfish`: wiki `20` × fishao.cz `[11]`
- `golden-arowana`: wiki `48` × fishao.cz `[47]`
- `golden-perch`: wiki `27` × fishao.cz `[26]`
- `golden-trevally`: wiki `19` × fishao.cz `[18]`
- `goldentail-moray`: wiki `51` × fishao.cz `[53]`
- `goldsilk-bream`: wiki `7` × fishao.cz `[6]`
- `grass-carp`: wiki `30` × fishao.cz `[21]`
- `grayling`: wiki `7` × fishao.cz `[6]`
- `great-white-shark`: wiki `356` × fishao.cz `[357]`
- `green-arowana`: wiki `148` × fishao.cz `[59]`
- `gyrodus`: wiki `43` × fishao.cz `[44]`
- `haddock`: wiki `10` × fishao.cz `[9]`
- `halibut`: wiki `146` × fishao.cz `[147]`
- `honeycomb-cowfish`: wiki `9` × fishao.cz `[8]`
- `horse-mackerel`: wiki `6` × fishao.cz `[5]`
- `horseface-loach`: wiki `7` × fishao.cz `[6]`
- `hound-needlefish`: wiki `81` × fishao.cz `[63]`
- `humpback-batfish`: wiki `40` × fishao.cz `[30]`
- `indian-glassfish`: wiki `6` × fishao.cz `[3]`
- `indonesian-speckled-carpetshark`: wiki `23` × fishao.cz `[27]`
- `ischnacanthus`: wiki `75` × fishao.cz `[76]`
- `jack-dempsey`: wiki `30` × fishao.cz `[28, 35]`
- `jaguar-guapote`: wiki `28` × fishao.cz `[39]`
- `largemouth-bass`: wiki `3` × fishao.cz `[2]`
- `largemouth-yellowfish`: wiki `22` × fishao.cz `[21]`
- `largetooth-sawfish`: wiki `147` × fishao.cz `[149]`
- `lavender-mbuna`: wiki `45` × fishao.cz `[34, 36]`
- `leafscale-gulper-shark`: wiki `61` × fishao.cz `[62]`
- `leedsichthys`: wiki `1715` × fishao.cz `[1739]`
- `leerfish`: wiki `22` × fishao.cz `[21]`
- `lemonpeel-angelfish`: wiki `3` × fishao.cz `[2]`
- `lesser-weever`: wiki `4` × fishao.cz `[3]`
- `livingstons-chichild`: wiki `10` × fishao.cz `[9]`
- `longhorn-cowfish`: wiki `43` × fishao.cz `[33]`
- `mad-barb`: wiki `22` × fishao.cz `[21]`
- `malawi-eye-biter`: wiki `12` × fishao.cz `[8]`
- `marcusenius-furcidens`: wiki `69` × fishao.cz `[58, 72]`
- `materpiscis`: wiki `85` × fishao.cz `[87]`
- `megalodon`: wiki `7464` × fishao.cz `[7489]`
- `midas-cichlid`: wiki `18` × fishao.cz `[17]`
- `milkfish`: wiki `20` × fishao.cz `[14]`
- `mrigal-carp`: wiki `24` × fishao.cz `[20]`
- `murray-cod`: wiki `49` × fishao.cz `[48]`
- `nassau-grouper`: wiki `22` × fishao.cz `[21]`
- `nile-perch`: wiki `48` × fishao.cz `[47]`
- `nile-tilapia`: wiki `4` × fishao.cz `[3]`
- `north-african-catfish`: wiki `18` × fishao.cz `[17]`
- `occelate-river-stingray`: wiki `36` × fishao.cz `[35]`
- `ocellated-pufferfish`: wiki `12` × fishao.cz `[8]`
- `olive-flounder`: wiki `13` × fishao.cz `[12]`
- `opah`: wiki `48` × fishao.cz `[47]`
- `orange-spotted-snakehead`: wiki `40` × fishao.cz `[29]`
- `orangespotted-soapfish`: wiki `147` × fishao.cz `[146]`
- `orangespotted-sunfish`: wiki `24` × fishao.cz `[23]`
- `oriental-sweetlips`: wiki `12` × fishao.cz `[8]`
- `pacuma-toadfish`: wiki `24` × fishao.cz `[23]`
- `painted-comber`: wiki `7` × fishao.cz `[6]`
- `pale-chub`: wiki `3` × fishao.cz `[2]`
- `panther-grouper`: wiki `138` × fishao.cz `[56]`
- `pearly-razorfish`: wiki `4` × fishao.cz `[3]`
- `peled`: wiki `35` × fishao.cz `[33, 36]`
- `peppermint-angelfish`: wiki `147` × fishao.cz `[148]`
- `pike`: wiki `36` × fishao.cz `[35]`
- `pike-cichlid`: wiki `3` × fishao.cz `[2]`
- `pink-salmon`: wiki `36` × fishao.cz `[35]`
- `piraiba-catfish`: wiki `258` × fishao.cz `[192]`
- `piranha`: wiki `24` × fishao.cz `[23]`
- `potters-angelfish`: wiki `22` × fishao.cz `[20]`
- `queen-angelfish`: wiki `13` × fishao.cz `[12]`
- `rainbow-parrotfish`: wiki `24` × fishao.cz `[23]`
- `rainbow-trout`: wiki `7` × fishao.cz `[6]`
- `razorback-sucker`: wiki `386` × fishao.cz `[385, 387]`
- `red-indianfish`: wiki `50` × fishao.cz `[32]`
- `red-phantom-tetra`: wiki `15` × fishao.cz `[11]`
- `red-snapper`: wiki `13` × fishao.cz `[12]`
- `redfin-pickerel`: wiki `84` × fishao.cz `[41]`
- `ripsaw-catfish`: wiki `9` × fishao.cz `[8]`
- `sarcastic-fringehead`: wiki `44` × fishao.cz `[32]`
- `sargassum-triggerfish`: wiki `9` × fishao.cz `[8]`
- `satanoperca`: wiki `8` × fishao.cz `[5]`
- `sea-bass`: wiki `6` × fishao.cz `[5]`
- `semionotus`: wiki `66` × fishao.cz `[121]`
- `senegal-bichir`: wiki `250` × fishao.cz `[183]`
- `sergeant-major`: wiki `7` × fishao.cz `[6]`
- `siamese-tigerfish`: wiki `18` × fishao.cz `[17]`
- `silver-scabbardfish`: wiki `48` × fishao.cz `[47]`
- `sleepy-cod`: wiki `16` × fishao.cz `[15]`
- `smallmouth-bass`: wiki `7` × fishao.cz `[6]`
- `smalltooth-sawfish`: wiki `900` × fishao.cz `[859]`
- `southern-bluefin-tuna`: wiki `368` × fishao.cz `[372]`
- `spinner-shark`: wiki `62` × fishao.cz `[65]`
- `spotted-bass`: wiki `7` × fishao.cz `[6]`
- `spotted-eagle-ray`: wiki `87` × fishao.cz `[89]`
- `sulawesi-coelacanth`: wiki `996` × fishao.cz `[997]`
- `tailspot-ctenopoma`: wiki `16` × fishao.cz `[15]`
- `tench`: wiki `7` × fishao.cz `[6]`
- `thelodus`: wiki `21` × fishao.cz `[20]`
- `thicklip-grey-mullet`: wiki `6` × fishao.cz `[5]`
- `tope-shark`: wiki `31` × fishao.cz `[30]`
- `twin-spot-goby`: wiki `14` × fishao.cz `[17]`
- `vandellia`: wiki `24` × fishao.cz `[23]`
- `vimba-bream`: wiki `13` × fishao.cz `[15]`
- `walleye`: wiki `19` × fishao.cz `[18]`
- `weedy-seadragon`: wiki `196` × fishao.cz `[147]`
- `weever-fish`: wiki `9` × fishao.cz `[8]`
- `wels-catfish`: wiki `30` × fishao.cz `[29]`
- `wenchman`: wiki `13` × fishao.cz `[12]`
- `whale-shark`: wiki `662` × fishao.cz `[672]`
- `white-spotted-puffer`: wiki `20` × fishao.cz `[15]`
- `white-sturgeon`: wiki `87` × fishao.cz `[88]`
- `whitebarred-catfish`: wiki `13` × fishao.cz `[12]`
- `xenacanthus`: wiki `78` × fishao.cz `[79]`
- `xiphactinus`: wiki `95` × fishao.cz `[104]`
- `yellow-mouth-moray`: wiki `8` × fishao.cz `[5]`
- `yellow-perch`: wiki `3` × fishao.cz `[2]`
- `yellow-tail-arowana`: wiki `238` × fishao.cz `[239]`
- `zingel-streber`: wiki `7` × fishao.cz `[6]`

</details>

<details><summary>Hvězdy (0)</summary>


</details>

<details><summary>Čas (48)</summary>

- `african-mottled-eel`: wiki `22:00-04:00` × fishao.cz `['kdykoliv']`
- `albino-alligator-gar`: wiki `22:00-05:00` × fishao.cz `['22:00+ - 11:00+']`
- `albino-catfish`: wiki `22:00-06:00` × fishao.cz `['23:00 - 06:00?']`
- `amur-sturgeon`: wiki `Always` × fishao.cz `['22:00? - 14:00?']`
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
- `dwarf-moray`: wiki `23:00-06:00` × fishao.cz `['kdykoliv']`
- `fiddler-ray`: wiki `21:00-08:00` × fishao.cz `['kdykoliv']`
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

<details><summary>WR × délka (30)</summary>

- `african-mottled-eel`: wiki `191` × fishao.cz `[196]`
- `angler-monkfish`: wiki `209` × fishao.cz `[206]`
- `aphyonidae`: wiki `21` × fishao.cz `[22]`
- `arapaima`: wiki `448` × fishao.cz `[449]`
- `bigeye-barracuda`: wiki `74` × fishao.cz `[73]`
- `black-marlin`: wiki `459` × fishao.cz `[464]`
- `chilhuil-sea-catfish`: wiki `50` × fishao.cz `[48]`
- `common-ponyfish`: wiki `27` × fishao.cz `[26]`
- `dragon-moray`: wiki `89` × fishao.cz `[91]`
- `dunkleosteus`: wiki `182` × fishao.cz `[794]`
- `emperor-red-snapper`: wiki `115` × fishao.cz `[116]`
- `fiddler-ray`: wiki `89` × fishao.cz `[88]`
- `fresh-water-moray`: wiki `149` × fishao.cz `[148]`
- `giant-kokopu`: wiki `57` × fishao.cz `[54]`
- `golden-pike`: wiki `139` × fishao.cz `[137]`
- `guapote`: wiki `70` × fishao.cz `[69, 71]`
- `ischnacanthus`: wiki `201` × fishao.cz `[202]`
- `lionhead-goldfish`: wiki `21` × fishao.cz `[20]`
- `narrowhead-catshark`: wiki `299` × fishao.cz `[297]`
- `nurse-shark`: wiki `429` × fishao.cz `[428]`
- `pacific-bluefin-tuna`: wiki `300` × fishao.cz `[303]`
- `piraya`: wiki `49` × fishao.cz `[48]`
- `platinum-golden-arowana`: wiki `98` × fishao.cz `[97]`
- `red-tail-golden-arowana`: wiki `93` × fishao.cz `[92]`
- `ruby-seadragon`: wiki `29` × fishao.cz `[23]`
- `smalltooth-sawfish`: wiki `708` × fishao.cz `[749]`
- `spotted-gar`: wiki `149` × fishao.cz `[148]`
- `striped-marlin`: wiki `418` × fishao.cz `[419]`
- `titanichthys`: wiki `670` × fishao.cz `[698]`
- `yellow-mouth-moray`: wiki `181` × fishao.cz `[180]`

</details>

Názvy ze dvou stránek, kde jedna má jen nepřeložené anglické jméno → vzat přeložený (27):

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

Neřešitelné konflikty názvů (název = null):

- název cs `guapote`: Kančík Doviúv / Kančík Doviův

### Názvy oblastí na fishao.cz

`Aquayama`, `Cool Mountain`, `Cool Mountain (z voru)`, `Klub (vlevo, slaná voda)`, `Klub (vpravo, sladká voda)`, `Laketown`, `Laketown (farma)`, `Little Rio`, `Lost Valley I`, `Lost Valley II`, `Lucky Raft`, `Marshville`, `Mystic Desert`, `Mystic Desert (v pyramidě)`, `Palm Island (uvnitř)`, `Palm Island (vně)`, `Pinheira Beach`, `Pinheira Beach (z mola)`, `Pirátská jeskyně`, `Rio Tropical`, `Seagull Harbor`, `Seagull Harbor (z člunu)`, `Sibiri City`, `Thombani Town`, `Thombani Town (za plotem)`, `Továrna na nábytek`, `Turnaj Boat on Sea`, `Turnaj Lake Run`, `Turnaj Magic 15`, `Turnaj Moray`, `Za domem`

## Co v archivu chybí

### Neúspěšná stahování (fetch selhal 3× nebo 404)

- `https://web.archive.org/web/20230718084642im_/http://fishaowiki.com/wp-content/uploads/2018/02/Kitefin_Shark.png class=` — HTTP 404
- `https://web.archive.org/web/20230718084642im_/http://fishaowiki.com/wp-content/uploads/2018/02/Kitefin_Shark.png` — HTTP 404

### Ryby, jejichž obrázek nejde stáhnout

- `kitefin-shark`: `https://web.archive.org/web/20230718084642im_/http://fishaowiki.com/wp-content/uploads/2018/02/Kitefin_Shark.png class=` → previously failed: HTTP 404; `https://web.archive.org/web/20230718084642im_/http://fishaowiki.com/wp-content/uploads/2018/02/Kitefin_Shark.png` → previously failed: HTTP 404

### Ryby bez obrázku ve zdroji (21)

Řádek tabulky obrázek ryby nemá (nebo je ryba jen v textové tabulce all-in-one).

- `african-mottled-eel` (5-star-fish, all-in-one, area-fish)
- `angler-snake-eel` (all-in-one, area-fish)
- `arrowhead-soapfish` (all-in-one)
- `barnards-lanterfish` (all-in-one)
- `birdbeak-dogfish` (all-in-one)
- `blue-panchax` (all-in-one, area-fish)
- `bluestripe-pipefish` (all-in-one, area-fish)
- `bullet-tuna` (all-in-one)
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

## Chybějící pole

`null` = hodnota není ani na wiki, ani (u ceny, času, rarity) na fishao.cz, **nebo** se zdroje neshodují. Pole `weather` ve zdroji neexistuje vůbec → null u všech ryb.

| pole | chybí u |
|---|---|
| `areas` | 0 |
| `time_raw` | 9 |
| `season` | 34 |
| `rarity` | 0 |
| `bait_raw` | 45 |
| `max_price_raw` | 2 |
| `world_record_raw` | 61 |
| `image` | 0 |

### Raw hodnota existuje, ale nejde jednoznačně rozparsovat

Parsované pole je null, `*_raw` obsahuje text ze zdroje.

- **time** (3): `flathead-catfish`=`22:00-?`, `pangio-mariarum`=`17:00-?`, `shortdorsal-cutthroat-eel`=`02:00-?`
- **max_price** (0): —
- **world_record_cm** (3): `golden-gar`=`?`, `grammonus-yunokawai`=`?`, `shortdorsal-cutthroat-eel`=`?`

### Ryby s chybějícími poli

| ryba | chybí |
|---|---|
| `angel-shark` | bait_raw |
| `angler-snake-eel` | time_raw, season |
| `australian-barracuda` | world_record_raw |
| `barbel` | bait_raw |
| `barracuda` | bait_raw |
| `barramundi` | world_record_raw |
| `basketfish` | bait_raw |
| `basking-shark` | season, world_record_raw |
| `beluga-sturgeon` | world_record_raw |
| `bigeye-tuna` | season |
| `bighead-carp` | time_raw |
| `black-alligator-gar` | world_record_raw |
| `blackbar-soldierfish` | world_record_raw |
| `blackfin-dartfish` | world_record_raw |
| `blind-cave-eel` | max_price_raw |
| `blue-marlin` | season, world_record_raw |
| `blue-spotted-grouper` | bait_raw |
| `bramble-shark` | bait_raw |
| `bull-shark` | season, bait_raw, world_record_raw |
| `carcharocles-chubutensis` | world_record_raw |
| `cobelodus` | world_record_raw |
| `cookiecutter-shark` | bait_raw |
| `cornish-jack` | bait_raw |
| `cretoxyrhina` | bait_raw, world_record_raw |
| `cyclops-shark` | world_record_raw |
| `cylindrical-lanternshark` | bait_raw |
| `danube-salmon` | season, bait_raw, world_record_raw |
| `deepsea-lizardfish` | bait_raw |
| `doryaspis-arctica` | bait_raw |
| `emperor-red-snapper` | bait_raw |
| `fangtooth-moray` | bait_raw, world_record_raw |
| `fire-eel` | time_raw, season, world_record_raw |
| `florida-gar` | season, bait_raw, world_record_raw |
| `french-grunt` | bait_raw |
| `fresh-water-moray` | season |
| `freshwater-lionfish` | bait_raw |
| `frilled-shark` | season, world_record_raw |
| `giant-freshwater-stingray` | world_record_raw |
| `giant-grouper` | season |
| `giant-oarfish` | world_record_raw |
| `giant-oceanic-manta-ray` | world_record_raw |
| `giant-salmon-carp` | season, world_record_raw |
| `goblin-shark` | season, world_record_raw |
| `gold-carp` | world_record_raw |
| `golden-cave-catfish` | season, world_record_raw |
| `golden-dorado` | season |
| `golden-trevally` | world_record_raw |
| `goliath-tigerfish` | world_record_raw |
| `grammonus-yunokawai` | time_raw, season |
| `great-white-shark` | world_record_raw |
| `green-moray` | bait_raw |
| `green-red-arowana` | world_record_raw |
| `green-sawfish` | world_record_raw |
| `guapote` | season, max_price_raw |
| `gyrosteus` | world_record_raw |
| `halibut` | world_record_raw |
| `hammerhead-shark` | bait_raw |
| `hellers-barracuda` | bait_raw |
| `humpback-anglerfish` | season |
| `largetooth-sawfish` | season, world_record_raw |
| `leedsichthys` | world_record_raw |
| `lemon-shark` | bait_raw |
| `lionhead-goldfish` | bait_raw |
| `long-finned-eel` | world_record_raw |
| `longnose-sawshark` | bait_raw |
| `mandarinfish` | season |
| `marine-betta` | time_raw |
| `meadia-roseni` | world_record_raw |
| `megamouth-shark` | season, world_record_raw |
| `moon-wrasse` | bait_raw |
| `northern-lampfish` | bait_raw |
| `oceanic-whitetip-shark` | bait_raw |
| `orangespotted-soapfish` | bait_raw |
| `orthacanthus` | world_record_raw |
| `pacific-barracuda` | world_record_raw |
| `pacific-bluefin-tuna` | season |
| `parachaenichthys-charcoti` | season |
| `paroon-shark` | season, bait_raw |
| `payara` | world_record_raw |
| `peacock-flounder` | bait_raw |
| `peled` | world_record_raw |
| `pelican-barracuda` | time_raw |
| `pineapplefish` | bait_raw |
| `pinktail-triggerfish` | bait_raw |
| `rainbow-darter` | season |
| `rainbow-runner` | season |
| `razorback-sucker` | world_record_raw |
| `red-bellied-pacu` | bait_raw |
| `red-lipped-batfish` | bait_raw |
| `red-striped-goby` | bait_raw |
| `rock-bass` | bait_raw |
| `ruby-seadragon` | bait_raw |
| `salpa-maggiore` | world_record_raw |
| `sandbar-shark` | bait_raw |
| `saurychthis` | world_record_raw |
| `schoolmaster-snapper` | world_record_raw |
| `siberian-sturgeon` | world_record_raw |
| `silver-arowana` | bait_raw |
| `silver-carp` | world_record_raw |
| `smalltooth-sawfish` | bait_raw |
| `smoothtail-mobula` | season, world_record_raw |
| `spot-tail-shark` | bait_raw, world_record_raw |
| `spotted-eagle-ray` | world_record_raw |
| `spotted-handfish` | season |
| `starry-sturgeon` | time_raw |
| `stethacanthus` | world_record_raw |
| `thresher-shark` | time_raw, season, world_record_raw |
| `tiger-shark` | season, world_record_raw |
| `treefish` | season |
| `unicorn-crestfish` | season, world_record_raw |
| `viper-moray` | world_record_raw |
| `whale-shark` | bait_raw, world_record_raw |
| `white-bass` | world_record_raw |
| `white-crappie` | world_record_raw |
| `white-sturgeon` | time_raw, world_record_raw |
| `whitebar-eelpout` | world_record_raw |
| `whitemouth-moray` | bait_raw |
| `winghead-shark` | season, bait_raw |
| `xiphactinus` | world_record_raw |
| `yellow-tail-arowana` | season |

## Konflikty mezi tabulkami

Ryba je ve více tabulkách (každá oblast, 5-star, all-in-one) a hodnoty se liší. Hlavní pole je pak null; všechny varianty jsou v `extra.conflicts`, celé řádky v `extra.occurrences`. Často jde o reálně odlišné hodnoty podle oblasti (např. cena), jindy o zastaralou tabulku — nerozhodováno.

| pole | ryb s konfliktem |
|---|---|
| Max Price | 62 |
| World record | 61 |
| Bait | 45 |
| Time | 36 |
| Season | 34 |
| rarity | 3 |

<details><summary>Všechny konflikty</summary>

- `african-butter-catfish` **Max Price**: `6` / `5`
- `angel-shark` **Bait**: `Shark Bait` / `Shark Lure`
- `angler-snake-eel` **Time**: `Always` / `02:00-02:15`
- `angler-snake-eel` **Season**: `02:00-02:15` / `Always`
- `australian-barracuda` **World record**: `102 cm` / `101 cm`
- `banded-butterflyfish` **Time**: `Always` / `14:00-19:00`
- `barbel` **Bait**: `Dough, Fish, Insects, Vegetal` / `Dough, Insects, Lures, Vegetal`
- `barracuda` **Bait**: `Barracuda Lure, Fish, Lures` / `Fish, Lures`
- `barramundi` **World record**: `194 cm` / `184 cm`
- `basketfish` **Bait**: `Dough, Vegetal` / `Fish, Insects`
- `basking-shark` **Season**: `Always` / `May - ?`
- `basking-shark` **World record**: `1223 cm` / `1181 cm`
- `beluga-sturgeon` **World record**: `850 cm` / `846 cm`
- `bigeye-tuna` **Season**: `March-May, Aug-Dec` / `Always`
- `bigeye-tuna` **Max Price**: `72` / `70`
- `bigfin-reef-squid` **Time**: `Always` / `23:00-14:00`
- `bighead-carp` **Time**: `11:00-15:00` / `11:00-05:00`
- `black-alligator-gar` **Max Price**: `1558` / `1509`
- `black-alligator-gar` **World record**: `298 cm` / `297 cm`
- `black-dragonfish` **Max Price**: `954` / `901`
- `blackbar-soldierfish` **Time**: `22:00-05:00` / `22:00-04:30`
- `blackbar-soldierfish` **World record**: `26 cm` / `34 cm`
- `blackfin-dartfish` **World record**: `13 cm` / `9 cm`
- `blind-cave-eel` **Max Price**: `111` / `110`
- `blobfish` **Max Price**: `9870` / `9978`
- `blue-marlin` **Season**: `July-September` / `July-?`
- `blue-marlin` **Max Price**: `134` / `131`
- `blue-marlin` **World record**: `429 cm` / `428 cm`
- `blue-spotted-grouper` **Bait**: `Fish, Insects, Lures` / `Insects, Lures`
- `blue-tang` **Max Price**: `6` / `3`
- `bramble-shark` **Bait**: `Shark Bait` / `Shark Lure`
- `brook-trout` **Max Price**: `4` / `1`
- `bull-shark` **Bait**: `Fish, Meat, Shark Lure` / `Fish, Meat`
- `bull-shark` **Season**: `Always` / `???`
- `bull-shark` **World record**: `401 cm` / `400 cm`
- `carcharocles-chubutensis` **Max Price**: `130` / `???`
- `carcharocles-chubutensis` **World record**: `1158 cm` / `???`
- `cobelodus` **Max Price**: `65` / `265` / `???`
- `cobelodus` **World record**: `207 cm` / `???`
- `coelacanth` **Time**: `16:00-02:00` / `23:00-?`
- `coelacanth` **Max Price**: `135` / `125`
- `common-carp` **Max Price**: `6` / `7`
- `cookiecutter-shark` **Bait**: `Shark Bait` / `Shark Lure`
- `cornish-jack` **Bait**: `Fish, Insects` / `Fish, Insect`
- `cretoxyrhina` **Bait**: `Prehistoric Bait` / `Prehistoirc Bait`
- `cretoxyrhina` **Max Price**: `166` / `???`
- `cretoxyrhina` **World record**: `602 cm` / `???`
- `cyclops-shark` **World record**: `55 cm` / `49 cm`
- `cylindrical-lanternshark` **Bait**: `Shark Bait` / `Shark Lure`
- `cylindrical-lanternshark` **Time**: `02:00-02:30, 04:00-04:30, 06:00-06:15` / `02:00-02:30, 04:00-04:30, 06:00-06:15,`
- `danube-salmon` **Bait**: `Fish, Insects, Lures` / `Fish, Insects`
- `danube-salmon` **Time**: `Always` / `???`
- `danube-salmon` **Season**: `Always` / `???`
- `danube-salmon` **World record**: `164 cm` / `163 cm`
- `dartmuthia` **Max Price**: `?` / `???`
- `deepsea-lizardfish` **Bait**: `Fish, Lures` / `Fish. Lures`
- `doryaspis-arctica` **Bait**: `Prehistoric Bait` / `Prehisoric Bait`
- `doryaspis-arctica` **Max Price**: `?` / `???`
- `dragon-moray` **Max Price**: `86` / `87`
- `emperor-red-snapper` **Bait**: `Fish, Lures` / `Fish, Insects`
- `evermannella-balbo` **Time**: `Always?` / `Always`
- `fairy-basslet` **Time**: `11:00-01:00` / `Always`
- `fangtooth-moray` **Bait**: `Insects, Meat` / `Meat`
- `fangtooth-moray` **World record**: `118 cm` / `119 cm`
- `fire-eel` **Time**: `23:00-04:00` / `???`
- `fire-eel` **Season**: `Always` / `???`
- `fire-eel` **World record**: `119 cm` / `118 cm`
- `florida-gar` **Bait**: `Fish, Lures` / `Fish, Insects`
- `florida-gar` **Season**: `Jan-Feb, May-Dec` / `Always` / `Janurary-February, May - December`
- `florida-gar` **World record**: `131 cm` / `130 cm`
- `flying-fish` **Max Price**: `6` / `7`
- `french-grunt` **Bait**: `Lures` / `Fish, Lures`
- `french-grunt` **Time**: `21:00-05:00` / `21:00-06:00`
- `french-grunt` **Max Price**: `11` / `8`
- `fresh-water-moray` **Time**: `Always` / `01:00-06:00`
- `fresh-water-moray` **Season**: `01:00-06:00` / `Always`
- `freshwater-goby` **Max Price**: `5` / `6`
- `freshwater-lionfish` **Bait**: `Fish, Insects, Meat` / `Fish, Insects`
- `frilled-shark` **Time**: `05:00-06:00` / `???`
- `frilled-shark` **Season**: `April - December` / `???`
- `frilled-shark` **Max Price**: `442` / `42`
- `frilled-shark` **World record**: `213 cm` / `194 cm`
- `garish-hind` **Max Price**: `148` / `147`
- `giant-devil-ray` **Max Price**: `398` / `61-?`
- `giant-freshwater-stingray` **World record**: `459 cm` / `457 cm`
- `giant-grouper` **Season**: `Sept - March` / `September - March`
- `giant-oarfish` **World record**: `1754 cm` / `1409 cm`
- `giant-oceanic-manta-ray` **World record**: `909 cm` / `908 cm`
- `giant-salmon-carp` **Season**: `Always` / `October - ?`
- `giant-salmon-carp` **World record**: `128cm` / `???`
- `giant-snakehead` **Max Price**: `22` / `21`
- `goblin-shark` **Time**: `09:00-12:00` / `???`
- `goblin-shark` **Season**: `Always` / `May - ?`
- `goblin-shark` **Max Price**: `748` / `531`
- `goblin-shark` **World record**: `610 cm` / `324 cm`
- `gold-carp` **World record**: `119 cm` / `118 cm`
- `golden-arowana` **rarity**: `4` / `4star.png` / `5star.png`
- `golden-cave-catfish` **Season**: `Always` / `Sept - ?`
- `golden-cave-catfish` **World record**: `16cm` / `???`
- `golden-dorado` **Time**: `05:00-00:00` / `00:00-05:00`
- `golden-dorado` **Season**: `June-Sep` / `June-???`
- `golden-trevally` **World record**: `118 cm` / `119 cm`
- `golden-trout` **Max Price**: `52` / `51`
- `goldfish` **Time**: `Always` / `23:00-04:00`
- `goldfish` **Max Price**: `13` / `12`
- `goliath-tigerfish` **World record**: `149 cm` / `197 cm`
- `grammonus-yunokawai` **Time**: `Oct 1 - Oct 30` / `23:00-06:00`
- `grammonus-yunokawai` **Season**: `02:00-06:00` / `Always`
- `grass-pickerel` **Max Price**: `54` / `45`
- `great-white-shark` **World record**: `790 cm` / `785 cm`
- `green-moray` **Bait**: `Insects, Lures` / `Fish, Insects, Lures`
- `green-moray` **Max Price**: `45` / `44`
- `green-red-arowana` **Time**: `Always` / `14:00-00:00`
- `green-red-arowana` **World record**: `124 cm` / `123 cm`
- `green-sawfish` **World record**: `729 cm` / `728 cm`
- `guapote` **Season**: `Always` / `Aug - ??`
- `guapote` **Max Price**: `80` / `80-?`
- `gyrosteus` **Max Price**: `429` / `???`
- `gyrosteus` **World record**: `514 cm` / `???`
- `halibut` **World record**: `365 cm` / `364 cm`
- `hammerhead-shark` **Bait**: `Fish, Meat, Shark Lure` / `Fish, Meat, Shark Bait`
- `hellers-barracuda` **Bait**: `Barracuda Lure` / `Barrauda Lure`
- `hellers-barracuda` **Max Price**: `9` / `8`
- `horn-shark` **Time**: `23:00-?` / `Always`
- `humpback-anglerfish` **Season**: `28 Oct - 3 Nov` / `Halloween; 28 October - 3 November`
- `lake-sturgeon` **Max Price**: `74` / `42`
- `largetooth-sawfish` **Season**: `Always` / `March - ?`
- `largetooth-sawfish` **World record**: `704 cm` / `703 cm`
- `lavender-mbuna` **Time**: `13:00-15:00` / `Always`
- `leedsichthys` **World record**: `1381 cm` / `1208 cm`
- `lemon-shark` **Bait**: `Shark Bait` / `Shark Lure`
- `lionhead-goldfish` **Bait**: `Dough, Insects, Vegetal` / `Dough`
- `long-finned-eel` **World record**: `119 cm` / `120 cm`
- `long-snouted-lancetfish` **Max Price**: `236` / `160` / `260`
- `longnose-sawshark` **Bait**: `Shark Lure` / `Fish, Insects`
- `macropoma` **Max Price**: `110` / `109`
- `mandarinfish` **Season**: `July-September` / `July-???`
- `marine-betta` **Time**: `00:00-05:00` / `Always`
- `masked-angelfish` **Max Price**: `145` / `136`
- `meadia-roseni` **Max Price**: `1131` / `1200`
- `meadia-roseni` **World record**: `75 cm` / `74 cm`
- `megamouth-shark` **Time**: `Always` / `???`
- `megamouth-shark` **Season**: `Always` / `May-?`
- `megamouth-shark` **Max Price**: `298` / `299`
- `megamouth-shark` **World record**: `705 cm` / `599 cm`
- `mexican-hogfish` **Time**: `08:00-19:00` / `07:00-19:00`
- `moon-wrasse` **Bait**: `Insects` / `Fish, Insects`
- `muraena-augusti` **Time**: `Always` / `23:00-00:00`
- `murray-cod` **rarity**: `4` / `3star.png`
- `northern-lampfish` **Bait**: `Dough, Insects, Vegetal` / `Fish, Insects`
- `northern-lampfish` **Time**: `00:00-08:00` / `Always`
- `oceanic-whitetip-shark` **Bait**: `Shark Bait` / `Shark Lure`
- `orangespotted-soapfish` **Bait**: `Dough, Insects, Vegetables` / `Dough, Insects, Vegetal`
- `orthacanthus` **Max Price**: `178` / `???`
- `orthacanthus` **World record**: `302 cm` / `???`
- `osteolepis` **Max Price**: `76` / `26`
- `pacific-barracuda` **World record**: `144 cm` / `143 cm`
- `pacific-bluefin-tuna` **Season**: `Sep-Dec, Jan-March` / `Sept-Dec, Jan-March` / `September - December, January - March`
- `parachaenichthys-charcoti` **Season**: `Oct 20 - Dec 10` / `October 20 - December 10`
- `parachaenichthys-charcoti` **Max Price**: `85` / `89`
- `paroon-shark` **Bait**: `Dough, Insects, Fish, Meat, Shark Lures, Vegetal` / `Fish, Insects, Shark Bait`
- `paroon-shark` **Season**: `Sept-March` / `Always`
- `payara` **World record**: `119 cm` / `? cm`
- `peacock-flounder` **Bait**: `Insects, Lures` / `Lures`
- `peled` **World record**: `49 cm` / `48 cm`
- `pelican-barracuda` **Time**: `15:00-22:00` / `Always`
- `pelican-eel` **Max Price**: `336` / `450`
- `phantom-bannerfish` **Max Price**: `1` / `3`
- `pickhandle-barracuda` **Max Price**: `24` / `22`
- `pineapplefish` **Bait**: `Insects` / `Fish, Insects`
- `pinktail-triggerfish` **Bait**: `Fishm, Insects, Vegetal` / `Fish, Insects, Vegetal`
- `platinum-golden-arowana` **Time**: `Always` / `00:00-?`
- `platysomus` **Max Price**: `36` / `49`
- `rainbow-darter` **Season**: `March-October` / `May-October`
- `rainbow-runner` **Season**: `March-?` / `March-August`
- `razorback-sucker` **World record**: `90 cm` / `89 cm`
- `red-bellied-pacu` **Bait**: `Fish, Insects, Vegetal, Meat` / `Vegetal, Insects, Meat`
- `red-lipped-batfish` **Bait**: `Fish, Insects` / `Insects`
- `red-striped-goby` **Bait**: `Dough, Vegetal` / `Fish, Insects`
- `rock-bass` **Bait**: `Fish, Insects, Lures` / `Dough, Fish, Insects, Lures`
- `rock-bass` **Max Price**: `7` / `6`
- `ruby-seadragon` **Bait**: `Isnects` / `Insects`
- `ruby-seadragon` **Time**: `03:00-08:00` / `03:00-07:00`
- `ruby-seadragon` **Max Price**: `748` / `457`
- `salpa-maggiore` **World record**: `23 cm` / `16 cm`
- `sandbar-shark` **Bait**: `Shark bait` / `Shark Lure`
- `saurychthis` **Max Price**: `99` / `???`
- `saurychthis` **World record**: `127 cm` / `???`
- `schoolmaster-snapper` **Time**: `Always` / `17:00-05:00`
- `schoolmaster-snapper` **World record**: `44 cm` / `45 cm`
- `siberian-sturgeon` **World record**: `202 cm` / `201 cm`
- `silver-arowana` **Bait**: `Fish, Insects, Meat` / `Fish, Insects`
- `silver-carp` **Max Price**: `224` / `222`
- `silver-carp` **World record**: `139 cm` / `138 cm`
- `smalltooth-sawfish` **Bait**: `Monster Bait` / `Monster bait` / `Moster Bait`
- `smoothtail-mobula` **Time**: `Always` / `?`
- `smoothtail-mobula` **Season**: `Always` / `Feb - ?`
- `smoothtail-mobula` **Max Price**: `238` / `?`
- `smoothtail-mobula` **World record**: `219 cm` / `188 cm`
- `sockeye-salmon` **Max Price**: `30` / `34`
- `spot-tail-shark` **Bait**: `Shark bait` / `Shark Lure`
- `spot-tail-shark` **Max Price**: `57` / `165`
- `spot-tail-shark` **World record**: `164 cm` / `163 cm`
- `spotted-eagle-ray` **World record**: `499 cm` / `485 cm`
- `spotted-handfish` **Season**: `Always` / `Sep - ?`
- `spotted-handfish` **Max Price**: `137` / `122`
- `starry-sturgeon` **Time**: `23:00-05:00?` / `23:00-05:00`
- `stethacanthus` **Max Price**: `270` / `???`
- `stethacanthus` **World record**: `188 cm` / `55 cm`
- `tadpole-snailfish` **Max Price**: `1193` / `543`
- `thresher-shark` **Time**: `Always` / `???`
- `thresher-shark` **Season**: `Always` / `May-?`
- `thresher-shark` **World record**: `759 cm` / `602 cm`
- `tiger-shark` **Time**: `Always` / `???`
- `tiger-shark` **Season**: `Always` / `May-?`
- `tiger-shark` **World record**: `747 cm` / `703 cm`
- `titanichthys` **Max Price**: `510` / `491`
- `treefish` **Season**: `March - ?` / `Always`
- `unicorn-crestfish` **Time**: `Always` / `???`
- `unicorn-crestfish` **Season**: `Always` / `October - ?`
- `unicorn-crestfish` **World record**: `148cm` / `?` / `???`
- `viper-moray` **World record**: `285 cm` / `117 cm`
- `whale-shark` **Bait**: `Shark Bait` / `Shark Lure`
- `whale-shark` **World record**: `1859 cm` / `856 cm`
- `white-bass` **World record**: `48 cm` / `24 cm` / `49 cm`
- `white-crappie` **Max Price**: `3` / `2`
- `white-crappie` **World record**: `48 cm` / `49 cm`
- `white-marlin` **Max Price**: `44` / `42`
- `white-sturgeon` **Time**: `12:00-17:00` / `Always`
- `white-sturgeon` **World record**: `609 cm` / `405 cm`
- `whitebar-eelpout` **World record**: `76cm` / `75 cm`
- `whitemouth-moray` **Bait**: `Fish, Insects` / `Fish, Insects, Meat`
- `winghead-shark` **Bait**: `Shark` / `Shark Lure`
- `winghead-shark` **Season**: `?July-March?` / `July(?)-March(?)` / `? July - March ?`
- `winghead-shark` **Max Price**: `111` / `106`
- `xenacanthus` **rarity**: `2` / `4star.png`
- `xiphactinus` **World record**: `620 cm` / `62 cm`
- `yangtze-sturgeon` **Max Price**: `497` / `493`
- `yellow-tail-arowana` **Season**: `Dec - March` / `December - April` / `December - March`
- `yellowfin-tuna` **Max Price**: `15` / `14`
- `yellowtail-wrasse` **Max Price**: `5` / `3`

</details>

## Duplicity a kolize id

ID = slug jména po odstranění kvalifikátorů v závorce a slova `Unlockable` (např. `Arctic Char (Raft only)` → `arctic-char`). Kvalifikátory jsou v `extra.qualifiers`, původní zápisy v `extra.name_variants`.

- Duplicitní id ve výstupu: žádné
- Ryb sloučených z různě zapsaných jmen: 35
- Ručně schválené aliasy (`scraper/aliases.json` → `fish`): 9
  - `white-spotted-damsell` → `white-spotted-damsel`
  - `bluespotted-grouper` → `blue-spotted-grouper`
  - `long-nosed-chimaera` → `long-nosed-chimera`
  - `carchacocles-chubutensis` → `carcharocles-chubutensis`
  - `bullshark` → `bull-shark`
  - `grammonus-yumokawai` → `grammonus-yunokawai`
  - `astrapis` → `astraspis`
  - `azul-pracock-bass` → `azul-peacock-bass`
  - `goldcarp` → `gold-carp`

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

### Jen v all-in-one (5) / chybí v all-in-one (1)

Jen v all-in-one: `arrowhead-soapfish`, `barnards-lanterfish`, `birdbeak-dogfish`, `bullet-tuna`, `golden-gar`

Chybí v all-in-one: `bullet-barracuda`

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

| id | název | kind | ryb |
|---|---|---|---|
| `laketown` | Laketown | area | 23 |
| `rio-tropical` | Rio Tropical | area | 19 |
| `little-rio` | Little Rio | area | 12 |
| `pinheira-beach` | Pinheira Beach | area | 44 |
| `cool-mountain` | Cool Mountain | area | 21 |
| `mystic-desert` | Mystic Desert | area | 20 |
| `sibiri-city` | Sibiri City | area | 16 |
| `aquayama` | Aquayama | area | 20 |
| `seagull-harbor` | Seagull Harbor | area | 40 |
| `thombani-town` | Thombani Town | area | 15 |
| `marshville` | Marshville | area | 18 |
| `lost-valley-1` | Lost Valley 1 | area | 9 |
| `lost-valley-2` | Lost Valley 2 | area | 45 |
| `palm-island` | Palm Island | area | 84 |
| `pirate-cave` | Pirate Cave | area | 7 |
| `club` | Club | area | 80 |
| `lucky-raft` | Lucky Raft | area | 22 |
| `furniture-factory` | Furniture Factory | area | 5 |
| `boat-on-sea-tournament` | Boat on Sea Tournament | tournament | 29 |
| `lake-run-tournament` | Lake Run Tournament | tournament | 16 |
| `race-magic-15-tournament` | Race (Magic 15) Tournament | tournament | 14 |
| `moray-tournament` | Moray Tournament | tournament | 18 |
| `backyard` | Backyard | backyard | 83 |

### Hodnoty sloupce Area (all-in-one, 5-star), které neodpovídají žádné oblasti (3)

Překlepy nebo jiný název; do `areas[]` ryby se nepočítají. Lze schválit v `aliases.json` → `areas` (`"text": "area-id"`).

- `Race` (1×)
- `Beach` (1×)
- `Lake Run` (1×)

### Oblasti podle tabulek vs. podle sloupce Area

Ryba je v tabulce oblasti, ale text Area ji tam neuvádí (nebo naopak). `extra.area_sources` říká, odkud která oblast je.

Počet: 17

<details><summary>Seznam</summary>

- `arrowhead-soapfish` — `club` jen podle sloupce Area
- `barnards-lanterfish` — `club` jen podle sloupce Area
- `birdbeak-dogfish` — `club` jen podle sloupce Area
- `bullet-tuna` — `lucky-raft` jen podle sloupce Area
- `candy-basslet` — `furniture-factory` jen podle tabulky
- `candy-basslet` — `mystic-desert` jen podle sloupce Area
- `common-dace` — `race-magic-15-tournament` jen podle tabulky
- `dwarf-moray` — `pinheira-beach` jen podle tabulky
- `garish-hind` — `furniture-factory` jen podle tabulky
- `garish-hind` — `mystic-desert` jen podle sloupce Area
- `golden-gar` — `club` jen podle sloupce Area
- `masked-angelfish` — `furniture-factory` jen podle tabulky
- `masked-angelfish` — `mystic-desert` jen podle sloupce Area
- `orangespotted-soapfish` — `furniture-factory` jen podle tabulky
- `orangespotted-soapfish` — `mystic-desert` jen podle sloupce Area
- `peppermint-angelfish` — `furniture-factory` jen podle tabulky
- `peppermint-angelfish` — `mystic-desert` jen podle sloupce Area

</details>

### Slovník návnad (bez oprav překlepů)

`Barracuda Lure` (8), `Dough` (110), `Fish` (281), `Hook` (5), `Insect` (1), `Insects` (314), `Insects Vegetal` (1), `Lures` (99), `Marlin Lure` (3), `Meat` (29), `Monkfish lure` (1), `Monster Bait` (2), `Pelican lure` (1), `Prehistoric Bait` (26), `Prehistoric bait` (17), `Shark Bait` (19), `Shark Lure` (11), `Shark bait` (1), `Shark lure` (1), `Star lure` (1), `Tuna Lure` (9), `Vegeal` (1), `Vegetal` (123)

### Ostatní poznámky parseru

- (nic)

### Pole na wiki → JSON

| wiki | JSON |
|---|---|
| Fish | `name` (+ `extra.name_variants`, `extra.qualifiers`) |
| Bait | `bait[]`, `bait_raw` |
| Season | `season` (raw text, neparsováno) |
| Time | `time` (`"always"` nebo `[{from,to}]`), `time_raw` |
| World record | `world_record_cm`, `world_record_raw` |
| Max Price (fishbucks) | `max_price`, `max_price_raw` |
| hvězdy (obrázek `Nstar.png`) / Stars | `rarity` 1–5, `rarity_raw` |
| Area (all-in-one, 5-star) | → `areas[]` při přesné shodě, raw v `extra.occurrences` |
| Pool (Club) | `extra.pool` |
| Home points (Backyard) | `extra.home_points` |

