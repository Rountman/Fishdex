# fishao.net — report

Vygenerováno 2026-11-17 skriptem `scraper/fishao_net.mjs`. Soubor se přepisuje při každém běhu — needitovat ručně.

Oficiální wiki (https://www.fishao.net/wiki) je **hlavní zdroj** pro výskyt (oblasti, místa, zóny Palm Islandu), raritu,
vzácnost v rámci hvězd, návnady, čas, sezónu, délky, chov a odemykání. České názvy a světové rekordy
zůstávají z fishao.cz / fishaowiki (`data/report.md`).

Data jsou objektový literál v `/_app/immutable/chunks/DwFZ_zyP.js`; čte se jako text, nespouští se.

## Souhrn

- ryb: 615, spárováno s `data/fish.json`: 615
- nespárované z fishao.net (0): —
- ryby z `data/fish.json` bez protějšku (0): —
- s místem uvnitř oblasti (`places`): 287
- „× vzácnější“ (`factor` < 1): 47
- chov u Rexe (`breed`): 83
- odemknutí kolekcí: 50, ovocným kombem: 18, klubovými body: 56, předčasně za fishcoiny: 21

## Lokace

| id | název | ryb |
|---|---|---|
| 1 | Laketown | 17 |
| 2 | Rio Tropical | 19 |
| 3 | Pinheira Beach | 44 |
| 4 | Cool Mountain | 21 |
| 5 | Mystic Desert | 11 |
| 6 | Sibiri City | 16 |
| 7 | Aquayama | 20 |
| 8 | Seagull Harbor | 40 |
| 9 | Thombani Town | 15 |
| 10 | Marshville | 18 |
| 11 | Palm island | 84 |
| 12 | Lucky Raft | 21 |
| 101 | Trout Farm | 6 |
| 104 | Pyramid | 4 |
| 108 | Lost Valley | 54 |
| 110 | Little Rio | 12 |
| 111 | Pirate Cave | 7 |
| 112 | Club area | 80 |
| 113 | Furniture Factory | 5 |
| 201 | Boat On Sea tournament | 29 |
| 202 | Lake Run tournament | 16 |
| 203 | Race tournament | 14 |
| 204 | Moray tournament | 18 |
| 300 | Home backyard | 83 |

## Palm Island — zóny (13 × 13, „.“ = pevnina)

```
B B B A A A A A A C C C C
B B A A A A A A D D D A C
B A A A A A . . D D A A A
A A A . . . . . . . A A A
A A . . . E E . . . A A A
A A . . E E E E E F F A A
A A . . E E E E E F F A A
A A . . . E E . . . . A A
A A . . . . . . . . A A A
A A A . . . A H . A A A A
G A A A A A A A A A A A G
G G A A A A A A A A A G G
G G G A A A A A A A G G G
```
