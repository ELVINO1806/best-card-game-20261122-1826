// Kindleward — boot, input and the demo states screenshots are taken from.
// The game is fully playable with mouse (click) and keyboard (1–5, Space, P, M).
import { cardById } from './cards.js';
import { checkEnd, endRound, isLoss, isWin, newGame, playCard, startGame } from './engine.js';
import { floatNumber, render, renderEnd, showScreen } from './render.js';
import { isMuted, setMuted, sfx, unlockAudio } from './audio.js';

const ui = { playedYou: [], playedFoe: [] };
let state = newGame();

function snapshot() {
  return { youLife: state.you.life, foeLife: state.foe.life, youShield: state.you.shield, foeShield: state.foe.shield };
}

function announceDiff(before, actor) {
  if (actor === 'you') {
    if (state.foe.life < before.foeLife) floatNumber('foe', `−${before.foeLife - state.foe.life}`, 'dmg');
    if (state.foe.shield < before.foeShield) floatNumber('foe', `−${before.foeShield - state.foe.shield} 🛡`, 'shield');
    if (state.you.life > before.youLife) floatNumber('you', `+${state.you.life - before.youLife}`, 'heal');
    if (state.you.shield > before.youShield) floatNumber('you', `+${state.you.shield - before.youShield} 🛡`, 'shield');
  } else {
    if (state.you.life < before.youLife) floatNumber('you', `−${before.youLife - state.you.life}`, 'dmg');
    if (state.you.shield < before.youShield) floatNumber('you', `−${before.youShield - state.you.shield} 🛡`, 'shield');
    if (state.foe.life > before.foeLife) floatNumber('foe', `+${state.foe.life - before.foeLife}`, 'heal');
    if (state.foe.shield > before.foeShield) floatNumber('foe', `+${state.foe.shield - before.foeShield} 🛡`, 'shield');
  }
}

function soundFor(cardId) {
  const kind = cardById(cardId).kind;
  if (kind === 'damage') sfx.hit();
  else if (kind === 'heal') sfx.heal();
  else if (kind === 'shield') sfx.shield();
  else sfx.play();
}

ui.onPlayCard = (cardId, node) => {
  unlockAudio();
  if (state.phase !== 'play') return;
  const before = snapshot();
  const res = playCard(state, cardId);
  if (!res.ok) return;
  node.classList.add('played');
  ui.playedYou.push(cardId);
  soundFor(cardId);
  if (state.stats.resonance > (ui.lastResonance ?? 0)) sfx.resonance();
  ui.lastResonance = state.stats.resonance;
  announceDiff(before, 'you');
  render(state, ui);
  maybeEnd();
};

function maybeEnd() {
  if (state.phase !== 'end') return;
  setTimeout(() => {
    renderEnd(state);
    showScreen('end');
    if (isWin(state)) sfx.win();
    if (isLoss(state)) sfx.lose();
  }, 650);
}

function doEndRound() {
  unlockAudio();
  if (state.phase !== 'play') return;
  const before = snapshot();
  ui.playedFoe = [];
  const discBefore = state.foe.discard.length;
  endRound(state);
  // The Warden's played cards are the discards it added this round.
  ui.playedFoe = state.foe.discard.slice(discBefore);
  ui.playedYou = [];
  ui.lastResonance = state.stats.resonance;
  announceDiff(before, 'foe');
  render(state, ui);
  maybeEnd();
}

function beginMatch() {
  unlockAudio();
  state = newGame();
  ui.playedYou = [];
  ui.playedFoe = [];
  ui.lastResonance = 0;
  startGame(state);
  showScreen('table');
  render(state, ui);
  sfx.draw();
}

function wire() {
  document.getElementById('play-button').addEventListener('click', beginMatch);
  document.getElementById('again-button').addEventListener('click', beginMatch);
  document.getElementById('end-round-button').addEventListener('click', doEndRound);
  document.getElementById('mute-button').addEventListener('click', (e) => {
    unlockAudio();
    setMuted(!isMuted());
    e.currentTarget.textContent = isMuted() ? '♪ Sound: off' : '♪ Sound: on';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '5') {
      unlockAudio();
      const cardId = state.you.hand[Number(e.key) - 1];
      if (cardId) {
        const node = document.querySelector(`#you-hand .card[data-card-id="${cardId}"]`);
        ui.onPlayCard(cardId, node ?? document.createElement('div'));
      }
    } else if (e.key === ' ' || e.key === 'Enter') {
      if (state.phase === 'play') { e.preventDefault(); doEndRound(); }
      else if (document.getElementById('title-screen') && !document.getElementById('title-screen').classList.contains('hidden')) beginMatch();
    } else if (e.key === 'p' || e.key === 'P') {
      if (state.phase === 'end') beginMatch();
    } else if (e.key === 'm' || e.key === 'M') {
      setMuted(!isMuted());
      document.getElementById('mute-button').textContent = isMuted() ? '♪ Sound: off' : '♪ Sound: on';
    }
  });
  // For playtesting and screenshots: the live game state, nothing more.
  window.__kindleward = { get state() { return state; }, ui };
}

/** Demo states for screenshots: the game's own renderers, fixed seeds. */
function applyShot(shot) {
  if (shot === 'title') {
    showScreen('title');
    return;
  }
  if (shot === 'table') {
    state = newGame(20261123);
    startGame(state);
    // A rich mid-game table: shields up, embers spent, a resonance waiting.
    state.round = 4;
    state.you.life = 14; state.foe.life = 16;
    state.you.shield = 4; state.foe.shield = 3;
    state.you.ember = 4; state.you.maxEmber = 5;
    state.you.hand = ['blaze', 'spark', 'mend', 'bulwark', 'gust'];
    state.foe.hand = ['a', 'b', 'c', 'd', 'e'].map((_, i) => ['spark', 'pebble', 'gust', 'mend', 'blaze'][i]);
    state.suitsThisRound = ['flame'];
    state.playsThisRound = 1;
    ui.playedYou = ['cinder'];
    ui.playedFoe = ['pebble'];
    state.log = ['You cast Cinder — 2 damage. Flame played — match it for Resonance!'];
    showScreen('table');
    render(state, ui);
    return;
  }
  if (shot === 'win' || shot === 'loss') {
    state = newGame(20261123);
    startGame(state);
    state.stats = { damageDealt: shot === 'win' ? 23 : 11, resonance: shot === 'win' ? 4 : 1, roundsPlayed: shot === 'win' ? 7 : 6 };
    if (shot === 'win') {
      state.you.life = 6; state.foe.life = 0;
      state.endReason = 'The Warden’s last sigil shatters. The table is yours.';
    } else {
      state.you.life = 0; state.foe.life = 9;
      state.endReason = 'Your last ember gutters out. The Warden keeps the table… this time.';
    }
    state.phase = 'end';
    checkEnd(state);
    renderEnd(state);
    showScreen('end');
  }
}

wire();
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) applyShot(shot);
else showScreen('title');
