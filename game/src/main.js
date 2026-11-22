// main.js — Ember Pact game loop, phases and round resolution.
// One job: own the game state and move it from title to table to win or loss.

import { buildDeck, shuffleDeck, drawCards, resolveTrick, trickPower, SPECIALS, ELEMENTS } from './deck.js';
import { chooseWardenCard, wardenMood } from './ai.js';
import { buildCardElement, renderHand, renderWardenHand, renderArena, renderHud, renderDiscard, renderBanner, renderMood } from './render.js';
import { bindControls, bindScreenButtons } from './input.js';
import { ensureAudio, toggleMute, isMuted, playClick, playFlip, playWinTrick, playLoseTrick, playClash, playVictory, playDefeat } from './audio.js';

const START_LIFE = 20;
const HAND_SIZE = 5;
const CHAIN_BONUS = 2;
const CHAIN_LENGTH = 3;

const state = {
  phase: 'title',
  deck: [],
  discard: [],
  playerHand: [],
  wardenHand: [],
  playerLife: START_LIFE,
  wardenLife: START_LIFE,
  round: 1,
  playerTricks: 0,
  wardenTricks: 0,
  chain: 0,
  wardenChain: 0,
  playerWard: false,
  wardenWard: false,
  selectedIndex: -1,
  wardenPick: null,
  playerPick: null,
  roundsPlayed: 0,
};

function showScreen(name) {
  for (const screen of ['title', 'table', 'win', 'loss']) {
    const node = document.getElementById('screen-' + screen);
    if (node) node.classList.toggle('hidden', screen !== name);
  }
  state.phase = name;
}

/** Start a fresh duel: shuffle, deal, round one. */
export function startGame() {
  ensureAudio();
  state.deck = shuffleDeck(buildDeck());
  state.discard = [];
  state.playerHand = drawCards(state.deck, HAND_SIZE);
  state.wardenHand = drawCards(state.deck, HAND_SIZE);
  state.playerLife = START_LIFE;
  state.wardenLife = START_LIFE;
  state.round = 1;
  state.playerTricks = 0;
  state.wardenTricks = 0;
  state.chain = 0;
  state.wardenChain = 0;
  state.playerWard = false;
  state.wardenWard = false;
  state.selectedIndex = -1;
  state.wardenPick = null;
  state.playerPick = null;
  state.roundsPlayed = 0;
  showScreen('table');
  prepareRound();
  playClick();
}

/** Set up a round: the Warden picks, its tell is shown, the player chooses. */
export function prepareRound() {
  state.wardenPick = chooseWardenCard({
    wardenLife: state.wardenLife,
    playerLife: state.playerLife,
    wardenHand: state.wardenHand,
    playerHandSize: state.playerHand.length,
    round: state.round,
  });
  renderMood(wardenMood(state.wardenPick.card));
  renderBanner('Round ' + state.round + ' — play a card. Keys 1–5, or click.');
  renderTable();
}

/** Draw every part of the table from current state. */
export function renderTable() {
  renderHud(state);
  renderHand(document.getElementById('player-hand'), state.playerHand, playCard, state.selectedIndex);
  renderWardenHand(document.getElementById('warden-hand'), state.wardenHand.length);
  renderDiscard(document.getElementById('discard-pile'), state.discard);
  const arenaPlayer = document.getElementById('arena-player');
  const arenaWarden = document.getElementById('arena-warden');
  if (state.playerPick && state.wardenPick) {
    const playerPower = playedPower(state.playerPick.card, state.wardenPick.card, 'player');
    const wardenPower = playedPower(state.wardenPick.card, state.playerPick.card, 'warden');
    renderArena(arenaPlayer, arenaWarden, state.playerPick.card, state.wardenPick.card, playerPower, wardenPower);
  } else {
    arenaPlayer.innerHTML = '';
    arenaWarden.innerHTML = '';
  }
}

/** Trick power of a played card, including Surge channelling the hand. */
function playedPower(card, foeCard, side) {
  if (card.kind === 'special' && card.special === 'surge') return card.surgePower || 0;
  return trickPower(card, foeCard, false);
}

/** The player commits a card from hand. */
export function playCard(index) {
  if (state.phase !== 'table' || state.playerPick) return;
  if (index < 0 || index >= state.playerHand.length) return;
  ensureAudio();
  const card = state.playerHand[index];
  state.selectedIndex = index;
  state.playerPick = { card };
  if (card.kind === 'special' && card.special === 'surge') {
    // Surge channels the strongest ember left in hand: double its power.
    const best = state.playerHand
      .filter((c) => c.kind === 'element')
      .reduce((top, c) => Math.max(top, c.power), 0);
    card.surgePower = best * 2;
  }
  playClick();
  resolveRound();
}

/** Resolve one round: specials first, then the trick, then damage and draws. */
export function resolveRound() {
  const playerCard = state.playerPick.card;
  const wardenCard = state.wardenPick.card;
  state.playerHand = state.playerHand.filter((c) => c !== playerCard);
  state.wardenHand = state.wardenHand.filter((c) => c !== wardenCard);
  playFlip();

  let log = [];

  // Quake strikes first and skips the trick.
  const quakeDamage = applyQuake(playerCard, wardenCard, log);
  const trickDone = !quakeDamage;
  if (trickDone) {
    applySpecial(playerCard, 'player', log);
    applySpecial(wardenCard, 'warden', log);
    resolveTrickDamage(playerCard, wardenCard, log);
  }

  state.discard.push(playerCard, wardenCard);
  state.roundsPlayed++;
  renderTable();
  renderBanner(log.join(' '));

  if (state.playerLife <= 0 && state.wardenLife <= 0) return endGame('win');
  if (state.wardenLife <= 0) return endGame('win');
  if (state.playerLife <= 0) return endGame('loss');

  state.round++;
  state.playerPick = null;
  state.wardenPick = null;
  state.selectedIndex = -1;
  drawCards(state.deck, 0);
  state.playerHand.push(...drawCards(state.deck, 1));
  state.wardenHand.push(...drawCards(state.deck, 1));
  setTimeout(() => {
    if (state.phase === 'table') prepareRound();
  }, 1400);
}

/** Quake deals 3 direct damage and cancels the trick. Returns true if any Quake fired. */
function applyQuake(playerCard, wardenCard, log) {
  let fired = false;
  if (playerCard.kind === 'special' && playerCard.special === 'quake') {
    dealDamage('warden', 3, log, 'Your Quake slams the Warden for 3.');
    fired = true;
  }
  if (wardenCard.kind === 'special' && wardenCard.special === 'quake') {
    dealDamage('player', 3, log, 'The Warden’s Quake slams you for 3.');
    fired = true;
  }
  return fired;
}

/** Apply a Mend or Ward special. Surge and Quake are handled where they act. */
function applySpecial(card, side, log) {
  if (card.kind !== 'special') return;
  if (card.special === 'mend') {
    heal(side, 5);
    log.push(side === 'player' ? 'You Mend for 5 life.' : 'The Warden Mends for 5 life.');
  }
  if (card.special === 'ward') {
    if (side === 'player') state.playerWard = true;
    else state.wardenWard = true;
    log.push(side === 'player' ? 'Your Ward rises — no damage next round.' : 'The Warden’s Ward rises — no damage next round.');
  }
}

function heal(side, amount) {
  if (side === 'player') state.playerLife = Math.min(START_LIFE, state.playerLife + amount);
  else state.wardenLife = Math.min(START_LIFE, state.wardenLife + amount);
}

/** Deal damage, honouring an active Ward (which then breaks). */
function dealDamage(side, amount, log, text) {
  if (amount <= 0) return;
  if (side === 'player' && state.playerWard) {
    state.playerWard = false;
    log.push('Your Ward absorbs the blow!');
    return;
  }
  if (side === 'warden' && state.wardenWard) {
    state.wardenWard = false;
    log.push('The Warden’s Ward absorbs the blow!');
    return;
  }
  if (side === 'player') state.playerLife -= amount;
  else state.wardenLife -= amount;
  if (text) log.push(text);
}

/** Compare the two played cards and deal trick damage, with the Ember Chain bonus. */
function resolveTrickDamage(playerCard, wardenCard, log) {
  const playerSpecial = playerCard.kind === 'special' && playerCard.special !== 'surge';
  const wardenSpecial = wardenCard.kind === 'special' && wardenCard.special !== 'surge';
  if (playerSpecial && wardenSpecial) {
    log.push('Both sides play tricks of their own — no clash, no damage.');
    playClash();
    return;
  }
  if (playerSpecial || wardenSpecial) {
    // An element against a non-Surge special wins the trick outright.
    const winner = playerSpecial ? 'warden' : 'player';
    const power = playerSpecial ? playedPower(wardenCard, playerCard, 'warden') : playedPower(playerCard, wardenCard, 'player');
    awardTrick(winner, power, log);
    return;
  }
  const result = resolveTrick(playerCard, wardenCard, false, false);
  if (result === 'clash') {
    state.chain = 0;
    state.wardenChain = 0;
    log.push('Clash! Equal power — no damage.');
    playClash();
    return;
  }
  const winner = result;
  const power = winner === 'player'
    ? playedPower(playerCard, wardenCard, 'player')
    : playedPower(wardenCard, playerCard, 'warden');
  const loserPower = winner === 'player'
    ? playedPower(wardenCard, playerCard, 'warden')
    : playedPower(playerCard, wardenCard, 'player');
  awardTrick(winner, Math.max(1, power - loserPower), log);
}

function awardTrick(winner, damage, log) {
  let finalDamage = damage;
  if (winner === 'player') {
    state.playerTricks++;
    state.chain++;
    state.wardenChain = 0;
    if (state.chain >= CHAIN_LENGTH) {
      finalDamage += CHAIN_BONUS;
      log.push('Ember Chain x3! +' + CHAIN_BONUS + ' bonus damage.');
      state.chain = 0;
    }
    dealDamage('warden', finalDamage, log, 'You win the trick for ' + finalDamage + ' damage.');
    playWinTrick();
  } else {
    state.wardenTricks++;
    state.wardenChain++;
    state.chain = 0;
    if (state.wardenChain >= CHAIN_LENGTH) {
      finalDamage += CHAIN_BONUS;
      log.push('The Warden’s Ember Chain x3! +' + CHAIN_BONUS + ' bonus damage.');
      state.wardenChain = 0;
    }
    dealDamage('player', finalDamage, log, 'The Warden wins the trick for ' + finalDamage + ' damage.');
    playLoseTrick();
  }
}

/** End the duel and show the win or loss screen with stats. */
export function endGame(result) {
  showScreen(result);
  const stats = 'Rounds: ' + state.roundsPlayed +
    ' · Tricks ' + state.playerTricks + '–' + state.wardenTricks +
    ' · Life ' + Math.max(0, state.playerLife) + '–' + Math.max(0, state.wardenLife);
  const node = document.getElementById(result === 'win' ? 'win-stats' : 'loss-stats');
  if (node) node.textContent = stats;
  if (result === 'win') playVictory();
  else playDefeat();
}

/** Deterministic demo states for screenshots, driven by ?demo=. */
export function applyDemo(kind) {
  if (kind === 'title') {
    showScreen('title');
    return;
  }
  if (kind === 'win') {
    state.roundsPlayed = 12;
    state.playerTricks = 8;
    state.wardenTricks = 5;
    state.playerLife = 9;
    state.wardenLife = 0;
    endGame('win');
    return;
  }
  if (kind === 'loss') {
    state.roundsPlayed = 11;
    state.playerTricks = 4;
    state.wardenTricks = 7;
    state.playerLife = 0;
    state.wardenLife = 12;
    endGame('loss');
    return;
  }
  if (kind === 'table') {
    state.deck = shuffleDeck(buildDeck()).slice(20);
    state.discard = [
      { id: 'flame-7', kind: 'element', element: 'flame', power: 7, name: 'Flame' },
      { id: 'tide-4', kind: 'element', element: 'tide', power: 4, name: 'Tide' },
      { id: 'thorn-9', kind: 'element', element: 'thorn', power: 9, name: 'Thorn' },
      { id: 'stone-5', kind: 'element', element: 'stone', power: 5, name: 'Stone' },
      { id: 'flame-3', kind: 'element', element: 'flame', power: 3, name: 'Flame' },
      { id: 'tide-8', kind: 'element', element: 'tide', power: 8, name: 'Tide' },
      { id: 'special-mend', kind: 'special', special: 'mend', element: null, power: 0, name: 'Mend' },
      { id: 'thorn-2', kind: 'element', element: 'thorn', power: 2, name: 'Thorn' },
    ];
    state.playerHand = [
      { id: 'flame-8', kind: 'element', element: 'flame', power: 8, name: 'Flame' },
      { id: 'tide-5', kind: 'element', element: 'tide', power: 5, name: 'Tide' },
      { id: 'thorn-3', kind: 'element', element: 'thorn', power: 3, name: 'Thorn' },
      { id: 'stone-7', kind: 'element', element: 'stone', power: 7, name: 'Stone' },
      { id: 'special-mend', kind: 'special', special: 'mend', element: null, power: 0, name: 'Mend' },
    ];
    state.wardenHand = [
      { id: 'w1', kind: 'element', element: 'flame', power: 4, name: 'Flame' },
      { id: 'w2', kind: 'element', element: 'tide', power: 6, name: 'Tide' },
      { id: 'w3', kind: 'element', element: 'thorn', power: 8, name: 'Thorn' },
      { id: 'w4', kind: 'element', element: 'stone', power: 2, name: 'Stone' },
    ];
    state.playerLife = 14;
    state.wardenLife = 11;
    state.round = 7;
    state.playerTricks = 4;
    state.wardenTricks = 2;
    state.chain = 2;
    state.wardenChain = 0;
    state.playerPick = null;
    state.wardenPick = chooseWardenCard({
      wardenLife: state.wardenLife,
      playerLife: state.playerLife,
      wardenHand: state.wardenHand,
      playerHandSize: state.playerHand.length,
      round: state.round,
    });
    showScreen('table');
    renderMood(wardenMood(state.wardenPick.card));
    renderBanner('Round 7 — the Warden is one trick from a chain. Choose your card.');
    renderTable();
  }
}

/** Boot: wire controls, then show the title or a demo state. */
export function boot() {
  bindControls({
    onPlayCard: (index) => playCard(index),
    onStart: () => {
      if (state.phase === 'title') startGame();
    },
    onNext: () => {},
    onRestart: () => {
      if (state.phase === 'win' || state.phase === 'loss') startGame();
    },
    onToggleMute: () => {
      const nowMuted = toggleMute();
      const button = document.getElementById('mute-button');
      if (button) button.textContent = nowMuted ? '🔇 Sound: Off (M)' : '🔊 Sound: On (M)';
    },
  });
  bindScreenButtons({
    onStart: () => startGame(),
    onRestart: () => startGame(),
    onToggleMute: () => {
      const nowMuted = toggleMute();
      const button = document.getElementById('mute-button');
      if (button) button.textContent = nowMuted ? '🔇 Sound: Off (M)' : '🔊 Sound: On (M)';
    },
  });
  const demo = new URLSearchParams(window.location.search).get('demo');
  if (demo) applyDemo(demo);
  else showScreen('title');
}

// Playtest hook: automation and debugging read the live state here.
window.__ember = { state, startGame, playCard, endGame, applyDemo };

boot();
