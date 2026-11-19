# fishao-tracker.cz — report

Vygenerováno 2026-11-19 skriptem `scraper/fishao_tracker.mjs`. Soubor se přepisuje při každém běhu — needitovat ručně.

Fanouškovský tracker (https://fishao-tracker.cz/). Bereme z něj **zóny Moray turnaje** — fishao.net je nemá. Turnaj se chytá
na mapě Palm Islandu se stejnými zónami A–H; tracker je značí `EFPT_PALM_ISLAND_ZONE_*` jako fishao.net.
České názvy z trackeru jsou poslední záloha (po archivu a fishao.net).

Data jsou objektové literály v `dist/app.2cda1c5ad9.min.js`; čtou se jako text, nespouštějí se.

## Zóny (popisky trackeru)

| zóna | tracker |
|---|---|
| A | Vnější oblast |
| B | Vlevo nahoře |
| C | Vpravo nahoře |
| D | Pod lodí |
| E | Vnitřní oblast |
| F | Vpravo od mostu |
| G | Dolní rohy |
| H | Malé ostrovy |

## Moray turnaj (18 ryb)

| id | ryba | zóny |
|---|---|---|
| 500 | Zebra Moray | D |
| 501 | Snowflake Moray | H |
| 502 | Green Moray | A, B, D |
| 503 | Spotted Moray | B, C |
| 504 | Yellowmargin Moray | E |
| 505 | Leopard Moray | B, C, G |
| 506 | Goldentail Moray | E, F |
| 507 | Yellow-mouth Moray | E, F |
| 508 | Fangtooth Moray | H |
| 509 | Paint-Spotted Moray | A, B, C, D, F, H |
| 510 | Whitemouth Moray | A, B, C, D, G, H |
| 511 | Dragon Moray | A, D, H |
| 512 | Chain Moray | E, F |
| 513 | Blackcheek Moray | E, F |
| 514 | Viper Moray | G |
| 515 | Yellowhead Moray | A, D, F |
| 516 | White-Eyed Moray | C, D |
| 517 | Salpa Maggiore | E |

- ryby turnaje na fishao.net, které tracker nemá (0): —

## Odhad výkupní ceny ve Fish Marketu (615 ryb)

`FISHAO_ESTIMATED_PRICES` z bundlu: rozpětí min–max ve FB. Je to **výpočet trackeru** (hvězdy, nejnižší úroveň
lokace, 10% snížení), ne oficiální ani nahlášená cena, proto ho web ukazuje s „~“. Ceny, které zapisují hráči,
jsou ve Firestore trackeru a nebereme je.

- ryby z fishao.net bez odhadu (1): Greenland Shark
- rozpětí: nejlevnější 3 FB, nejdražší 2160 FB

## Kontrola: zóny Palm Islandu proti fishao.net

Shodné u všech ryb.
