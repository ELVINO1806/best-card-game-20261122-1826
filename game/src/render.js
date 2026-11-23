// Kindleward — the renderer: turns engine state into a table you can read
// at a glance, with cards that slide, flip and snap into place.
import { cardById, SUITS } from './cards.js';
import { INTENTS } from './ai.js';
import { MAX_LIFE, PLAYS_PER_ROUND } from './engine.js';

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/** One face-up card element. `mini` is the small played-card version. */
export function cardElement(cardId, { mini = false, keyHint = '' } = {}) {
  const card = cardById(cardId);
  const suit = SUITS[card.suit];
  const node = el('div', `card suit-${card.suit}${mini ? ' mini' : ''}`);
  node.dataset.cardId = cardId;
  node.appendChild(el('span', 'cost', String(card.cost)));
  node.appendChild(el('span', 'glyph', suit.glyph));
  node.appendChild(el('span', 'cname', card.name));
  node.appendChild(el('span', 'cvalue', card.kind === 'damage' ? `−${card.value}` : `+${card.value}`));
  node.appendChild(el('span', 'ceffect', card.text));
  if (keyHint) node.appendChild(el('span', 'key-hint', keyHint));
  return node;
}

function emberPips(ember, maxEmber) {
  let out = '';
  for (let i = 0; i < maxEmber; i++) out += i < ember ? '●' : '○';
  return out;
}

/** Floating combat number over a life plate. */
export function floatNumber(target, text, kind) {
  const plate = target === 'you' ? document.querySelector('.you-plate') : document.querySelector('.foe-plate');
  if (!plate) return;
  const r = plate.getBoundingClientRect();
  const n = el('span', `float-num ${kind}`, text);
  n.style.left = `${r.left + r.width / 2 - 20}px`;
  n.style.top = `${r.top + 6}px`;
  $('float-layer').appendChild(n);
  setTimeout(() => n.remove(), 1150);
  plate.classList.remove('shake');
  void plate.offsetWidth;
  plate.classList.add('shake');
}

export function render(state, ui) {
  // Life plates.
  $('you-life').textContent = state.you.life;
  $('foe-life').textContent = state.foe.life;
  $('you-shield').textContent = `🛡 ${state.you.shield}`;
  $('foe-shield').textContent = `🛡 ${state.foe.shield}`;
  $('you-life-bar').style.width = `${(state.you.life / MAX_LIFE) * 100}%`;
  $('foe-life-bar').style.width = `${(state.foe.life / MAX_LIFE) * 100}%`;
  $('round-num').textContent = state.round;
  $('foe-hand-count').textContent = state.foe.hand.length;
  const pips = $('ember-pips');
  pips.innerHTML = '';
  for (let i = 0; i < state.you.maxEmber; i++) {
    const s = el('span', i < state.you.ember ? '' : 'spent', i < state.you.ember ? '●' : '○');
    pips.appendChild(s);
  }

  // Warden intent badge.
  const intent = INTENTS[state.foeIntent];
  const badge = $('foe-intent');
  badge.textContent = intent.label;
  badge.className = `intent-badge ${intent.cls}`;

  // Phase + hint.
  if (state.phase === 'play') {
    const left = PLAYS_PER_ROUND - state.playsThisRound;
    $('phase-label').textContent = left > 0 ? 'Your turn' : 'End the round';
    $('hint-line').textContent = left > 0
      ? `${intent.hint} — ${left} play${left > 1 ? 's' : ''} left this round.`
      : 'No plays left — end the round and see what the Warden does.';
  } else if (state.phase === 'foe') {
    $('phase-label').textContent = 'Warden answers…';
  }
  $('end-round-button').disabled = state.phase !== 'play';

  // Resonance note: which suit would resonate if played again.
  const counts = {};
  for (const s of state.suitsThisRound) counts[s] = (counts[s] ?? 0) + 1;
  const resonating = Object.keys(counts).find((s) => counts[s] >= 1);
  $('resonance-note').textContent = resonating && state.playsThisRound < PLAYS_PER_ROUND
    ? `✦ ${SUITS[resonating].name} played — match it for Resonance!`
    : '';

  // Foe hand: face-down backs.
  const foeHand = $('foe-hand');
  foeHand.innerHTML = '';
  for (let i = 0; i < state.foe.hand.length; i++) {
    const back = el('div', 'card-back', '◈');
    back.style.animationDelay = `${i * 0.05}s`;
    foeHand.appendChild(back);
  }

  // Your hand: face-up, clickable, unaffordable dimmed.
  const youHand = $('you-hand');
  youHand.innerHTML = '';
  state.you.hand.forEach((id, i) => {
    const card = cardById(id);
    const node = cardElement(id, { keyHint: String(i + 1) });
    node.style.animationDelay = `${i * 0.06}s`;
    if (state.you.ember < card.cost || state.playsThisRound >= PLAYS_PER_ROUND || state.phase !== 'play') {
      node.classList.add('unaffordable');
    }
    node.addEventListener('click', () => ui.onPlayCard(id, node));
    youHand.appendChild(node);
  });

  // Played cards this round (miniatures, newest last).
  renderPlayed($('played-you'), ui.playedYou);
  renderPlayed($('played-foe'), ui.playedFoe);

  // Battle log: last line big and readable.
  const log = $('battle-log');
  log.textContent = state.log[state.log.length - 1] ?? '';
}

function renderPlayed(container, ids) {
  container.innerHTML = '';
  for (const id of ids.slice(-3)) container.appendChild(cardElement(id, { mini: true }));
}

export function showScreen(name) {
  for (const id of ['title-screen', 'table-screen', 'end-screen']) $(id).classList.add('hidden');
  $(`${name}-screen`).classList.remove('hidden');
}

export function renderEnd(state) {
  const win = state.foe.life <= 0 && state.you.life > 0;
  const title = $('end-title');
  title.textContent = win ? 'VICTORY' : state.you.life <= 0 && state.foe.life <= 0 ? 'DRAW' : 'DEFEAT';
  title.className = `end-title ${win ? 'win' : 'lose'}`;
  $('end-emblem').textContent = win ? '👑' : '🥀';
  $('end-sub').textContent = state.endReason || '';
  $('end-rounds').textContent = state.stats.roundsPlayed || state.round;
  $('end-damage').textContent = state.stats.damageDealt;
  $('end-resonance').textContent = state.stats.resonance;
  $('end-life').textContent = state.you.life;
}
