// deck.js — cards, elements and the Ember Pact deck.
// One job: know every card in the game and how elements beat each other.

export const ELEMENTS = {
  flame: { name: 'Flame', glyph: '▲', color: '#e2483d', beat: 'thorn', hint: 'burns Thorn' },
  tide: { name: 'Tide', glyph: '●', color: '#2f7fd0', beat: 'flame', hint: 'douses Flame' },
  thorn: { name: 'Thorn', glyph: '✦', color: '#3d9e57', beat: 'tide', hint: 'drinks Tide' },
  stone: { name: 'Stone', glyph: '◆', color: '#c9a227', beat: null, hint: 'neutral, no advantage' },
};

export const ELEMENT_KEYS = ['flame', 'tide', 'thorn', 'stone'];

export const SPECIALS = {
  mend: { name: 'Mend', text: 'Heal 5 life', glyph: '+', power: 0 },
  ward: { name: 'Ward', text: 'Block all damage next round', glyph: '⛨', power: 0 },
  surge: { name: 'Surge', text: 'Your power doubles this round', glyph: '✚', power: 0 },
  quake: { name: 'Quake', text: 'Deal 3 damage, no trick', glyph: '✷', power: 0 },
};

/** Build one fresh 40-card deck: 4 elements x powers 1-9, plus 4 special cards. */
export function buildDeck() {
  const deck = [];
  for (const element of ELEMENT_KEYS) {
    for (let power = 1; power <= 9; power++) {
      deck.push({ id: `${element}-${power}`, kind: 'element', element, power, name: ELEMENTS[element].name });
    }
  }
  for (const key of Object.keys(SPECIALS)) {
    deck.push({ id: `special-${key}`, kind: 'special', special: key, element: null, power: 0, name: SPECIALS[key].name });
  }
  return deck;
}

/** Fisher-Yates shuffle. Returns a new array, the input untouched. */
export function shuffleDeck(cards) {
  const deck = cards.slice();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

/** Draw n cards from the front of a deck array. Mutates the deck. */
export function drawCards(deck, n) {
  const drawn = [];
  for (let i = 0; i < n && deck.length > 0; i++) drawn.push(deck.shift());
  return drawn;
}

/** Does attacker's element beat defender's? Stone never has an advantage. */
export function elementBeats(attacker, defender) {
  if (!attacker || !defender) return false;
  return ELEMENTS[attacker].beat === defender;
}

/** Advantage bonus: +3 power when the element wheel favours the card. */
export function advantageBonus(card, foeCard) {
  if (card.kind !== 'element' || foeCard.kind !== 'element') return 0;
  return elementBeats(card.element, foeCard.element) ? 3 : 0;
}

/** Effective trick power of a card against a foe card (Surge doubles it). */
export function trickPower(card, foeCard, surged) {
  if (card.kind !== 'element') return 0;
  let power = card.power + advantageBonus(card, foeCard);
  if (surged) power *= 2;
  return power;
}

/** Compare two played cards. Returns 'player', 'warden' or 'clash'. */
export function resolveTrick(playerCard, wardenCard, playerSurged, wardenSurged) {
  const playerPower = trickPower(playerCard, wardenCard, playerSurged);
  const wardenPower = trickPower(wardenCard, playerCard, wardenSurged);
  if (playerPower > wardenPower) return 'player';
  if (wardenPower > playerPower) return 'warden';
  return 'clash';
}

/** Count how many cards of each element sit in a pile (for the counting display). */
export function countElements(pile) {
  const counts = { flame: 0, tide: 0, thorn: 0, stone: 0, special: 0 };
  for (const card of pile) {
    if (card.kind === 'special') counts.special++;
    else counts[card.element]++;
  }
  return counts;
}
