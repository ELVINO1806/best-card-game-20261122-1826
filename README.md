# Kindleward — a duel of sigil cards

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/ELVINO1806/best-card-game-20261122-1826/rank.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/ELVINO1806/best-card-game-20261122-1826/reward.svg)](https://make.fun/c/best-card-game-20261122-1826)

**Kindleward** is an original card duel built for make.fun's
[best card game bounty](https://make.fun/c/best-card-game-20261122-1826).
You face the Warden across a table of sigil cards: four suits — Flame,
Tide, Stone, Gale — each told apart by colour *and* shape. Spend embers to
play up to two cards a round; play two of one suit and **Resonance**
ignites. The Warden declares its intent every round — attack, guard, or
scheme — so every hand is a decision you can read and counter. First to
0 life loses.

## Play

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome. Mouse and keyboard: click a card or press **1–5** to play it,
**Space** ends the round, **P** plays again, **M** mutes.

## Layout

- `game/` — the game itself, static files only, no network requests:
  `index.html`, `style.css`, and `src/` split by job (`cards.js` the deck,
  `ai.js` the Warden, `engine.js` the rules, `render.js` the table,
  `audio.js` the sounds, `main.js` the boot and input).
- `screenshots/` — four renders of the game running: title, table, win, loss.
- `main.ts` — the hand-in program: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json` with `vendor/makefun-game.ts`.
- `vendor/makefun-game.ts` — the kit's library, unchanged.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

MIT licensed. Built in a fresh agent session for the make.fun
best-card-game competition (opened 2026-11-22T18:26:00Z).
