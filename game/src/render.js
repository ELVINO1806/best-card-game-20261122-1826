// render.js — draw the cards, the table and the HUD into the DOM.
// One job: turn game state into visible, readable elements.

import { ELEMENTS, SPECIALS, countElements } from './deck.js';

/** Build one card element. faceUp false shows the Ember card back. */
export function buildCardElement(card, options) {
  const opts = options || {};
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.cardId = card.id;
  if (opts.small) el.classList.add('card-small');
  if (opts.selected) el.classList.add('card-selected');
  if (opts.playable === false) el.classList.add('card-dim');
  if (opts.faceUp === false) {
    el.classList.add('card-back');
    el.innerHTML = '<div class="card-back-mark">✦<span>EMBER<br>PACT</span></div>';
    return el;
  }
  if (card.kind === 'special') {
    const spec = SPECIALS[card.special];
    el.classList.add('card-special');
    el.innerHTML =
      '<div class="card-corner"><span class="card-glyph">' + spec.glyph + '</span></div>' +
      '<div class="card-center"><div class="card-big-glyph">' + spec.glyph + '</div>' +
      '<div class="card-name">' + spec.name.toUpperCase() + '</div>' +
      '<div class="card-text">' + spec.text + '</div></div>' +
      '<div class="card-corner card-corner-bottom"><span class="card-glyph">' + spec.glyph + '</span></div>';
    return el;
  }
  const info = ELEMENTS[card.element];
  el.classList.add('card-' + card.element);
  el.innerHTML =
    '<div class="card-corner"><span class="card-power">' + card.power + '</span>' +
    '<span class="card-glyph">' + info.glyph + '</span></div>' +
    '<div class="card-center"><div class="card-big-glyph">' + info.glyph + '</div>' +
    '<div class="card-name">' + info.name.toUpperCase() + '</div>' +
    '<div class="card-text">' + info.hint + '</div></div>' +
    '<div class="card-corner card-corner-bottom"><span class="card-power">' + card.power + '</span>' +
    '<span class="card-glyph">' + info.glyph + '</span></div>';
  return el;
}

/** Render a hand of cards into a container. onPick(index) fires on click. */
export function renderHand(container, hand, onPick, selectedIndex) {
  container.innerHTML = '';
  hand.forEach((card, index) => {
    const node = buildCardElement(card, { selected: index === selectedIndex });
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    node.setAttribute('aria-label', describeCard(card));
    node.addEventListener('click', () => onPick(index));
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') onPick(index);
    });
    const key = document.createElement('div');
    key.className = 'card-key';
    key.textContent = String(index + 1);
    node.appendChild(key);
    container.appendChild(node);
  });
}

/** Render the Warden's face-down hand (count only, cards hidden). */
export function renderWardenHand(container, count) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const back = buildCardElement({ id: 'back-' + i }, { faceUp: false, small: true });
    container.appendChild(back);
  }
}

/** Render the two played cards in the arena, face up, with power totals. */
export function renderArena(playerSlot, wardenSlot, playerCard, wardenCard, playerPower, wardenPower) {
  playerSlot.innerHTML = '';
  wardenSlot.innerHTML = '';
  if (playerCard) {
    playerSlot.appendChild(buildCardElement(playerCard));
    playerSlot.appendChild(powerBadge(playerPower));
  }
  if (wardenCard) {
    wardenSlot.appendChild(buildCardElement(wardenCard));
    wardenSlot.appendChild(powerBadge(wardenPower));
  }
}

function powerBadge(power) {
  const badge = document.createElement('div');
  badge.className = 'power-badge';
  badge.textContent = 'Power ' + power;
  return badge;
}

/** Update the life totals, round, tricks, deck and chain displays. */
export function renderHud(state) {
  setText('player-life', String(state.playerLife));
  setText('warden-life', String(state.wardenLife));
  setText('round-number', String(state.round));
  setText('player-tricks', String(state.playerTricks));
  setText('warden-tricks', String(state.wardenTricks));
  setText('deck-count', String(state.deck.length));
  setText('discard-count', String(state.discard.length));
  const chain = document.getElementById('chain-indicator');
  if (chain) {
    chain.textContent = state.chain >= 2 ? '🔥 Ember Chain x' + state.chain : 'Ember Chain: —';
    chain.classList.toggle('chain-hot', state.chain >= 2);
  }
  const playerBar = document.getElementById('player-life-bar');
  const wardenBar = document.getElementById('warden-life-bar');
  if (playerBar) playerBar.style.width = Math.max(0, state.playerLife / 20 * 100) + '%';
  if (wardenBar) wardenBar.style.width = Math.max(0, state.wardenLife / 20 * 100) + '%';
}

/** Render the discard pile: top card face up plus per-element counts. */
export function renderDiscard(container, discard) {
  container.innerHTML = '';
  if (discard.length === 0) {
    container.textContent = 'Discard pile is empty.';
    return;
  }
  const top = discard[discard.length - 1];
  container.appendChild(buildCardElement(top, { small: true }));
  const counts = countElements(discard);
  const list = document.createElement('div');
  list.className = 'discard-counts';
  list.textContent =
    'Flame ' + counts.flame + ' · Tide ' + counts.tide +
    ' · Thorn ' + counts.thorn + ' · Stone ' + counts.stone +
    ' · Special ' + counts.special;
  container.appendChild(list);
}

/** Show a one-line round result banner. */
export function renderBanner(text) {
  const banner = document.getElementById('round-banner');
  if (banner) banner.textContent = text;
}

/** Show the Warden's mood line (the tell). */
export function renderMood(text) {
  const mood = document.getElementById('warden-mood');
  if (mood) mood.textContent = text;
}

/** One-line spoken description of a card, for accessibility labels. */
export function describeCard(card) {
  if (card.kind === 'special') return SPECIALS[card.special].name + ': ' + SPECIALS[card.special].text;
  return ELEMENTS[card.element].name + ' ' + card.power;
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}
