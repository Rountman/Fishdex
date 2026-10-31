# Fishdex — report nábytku

Vygenerováno 2026-10-31 skriptem `scraper/furniture.py`. Přepisuje se při každém běhu — needitovat ručně.

## Souhrn

- **Kusů:** 231 (v setech: 168, mimo sety: 63)
- **Setů:** 14 — s odznakem: 9; bez odznaku: Balloon Set, Candy Set, Gorgeous Set, Soccer Set, Space Set
- **Skupiny mimo sety** (jako na funwiki): Rostliny (15), Obrazy (13), Ostatní (35)
- **S obrázkem:** 231 / 231
- **S českým názvem (fishao.cz):** 169 / 231 — kusy mimo sety fishao.cz nepopisuje, mají jen anglický název.
- **Bez rarity (zdroj „Unknown“ nebo chybí, UI ukáže „neznámé“):** 21

## Zdroje

- **fishaofunwiki.com** — hlavní zdroj, chunk `decorations-Bi4jdZSp.js`. Všechny hodnoty i obrázky (webp).
- **fishaowiki.com/furniture/** — snapshot `20230718084743`, jen křížová kontrola a párování starých názvů obrázků.
- **fishao.cz** — stránky setů (české názvy, náhled celého setu):
  - [jednoduchy-set](https://www.fishao.cz/jednoduchy-set/) `20160722094710` — 14 kusů, spárováno 14
  - [princeznovsky-set](https://www.fishao.cz/princeznovsky-set/) `20160722094618` — 12 kusů, spárováno 12
  - [klasicky-set](https://www.fishao.cz/klasicky-set/) `20160722101329` — 13 kusů, spárováno 13
  - [designovy-set](https://www.fishao.cz/designovy-set/) `20160722094659` — 12 kusů, spárováno 12
  - [zlaty-set](https://www.fishao.cz/zlaty-set/) `20160531084245` — 13 kusů, spárováno 13
  - [ledovy-set](https://www.fishao.cz/ledovy-set/) `20160722100845` — 9 kusů, spárováno 9
  - [vanocni-set](https://www.fishao.cz/vanocni-set/) `20160722101008` — 12 kusů, spárováno 12
  - [strasidelny-set](https://www.fishao.cz/strasidelny-set/) `20160722100355` — 12 kusů, spárováno 12
  - [piratsky-set](https://www.fishao.cz/piratsky-set/) `20160722101334` — 12 kusů, spárováno 12
  - [balonovy-set](https://www.fishao.cz/balonovy-set/) `20160720103349` — 12 kusů, spárováno 12
  - [bonbonovy-set](https://www.fishao.cz/bonbonovy-set/) `20160720104753` — 12 kusů, spárováno 12
  - [puvabny-set](https://www.fishao.cz/puvabny-set/) `20160721221110` — 12 kusů, spárováno 12
  - [fotbalovy-set](https://www.fishao.cz/fotbalovy-set/) `20160720101112` — 12 kusů, spárováno 12
  - [vesmirny-set](https://www.fishao.cz/vesmirny-set/) `20160721221342` — 12 kusů, spárováno 12

Párování fishao.cz → funwiki: ruční alias (`aliases.json` → `furniture_cz`), anglický konec názvu obrázku, stejný herní obrázek `graphics_128x128_N` na fishaowiki, české slovo typu (stěna → Wall).

## Kusy jen na fishao.cz (0)

Funwiki je nemá; přidány s údaji ze stránky setu (typ a rarita neznámé).

- (nic)

## Rozdíly mezi zdroji (4)

funwiki × fishaowiki (typ, rarita, sezóna, cena, dostupnost) a funwiki × fishao.cz (`rarity_cz`, `set`). Platí hodnota z funwiki (novější). Jen report.

| pole | rozdílů |
|---|---|
| type | 1 |
| rarity | 1 |
| set | 1 |
| rarity_cz | 1 |

<details><summary>Seznam</summary>

- `christmas-tree`: type: funwiki `plant` × fishaowiki `furniture`
- `classic-night-painting`: set: funwiki `Other` × fishao.cz `Classic Set`
- `gorgeous-plant`: rarity_cz: funwiki `Rare` × fishao.cz `epická`
- `spooky-floor`: rarity: funwiki `Very common` × fishaowiki `Very commom`

</details>

## Chybějící obrázky (0)

- (nic)
