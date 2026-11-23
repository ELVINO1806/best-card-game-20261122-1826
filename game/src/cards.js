// Kindleward — the cards: four suits, each told apart by colour AND shape,
// each with its own job. No card is a copy of a commercial game's card.
export const SUITS = {
  flame: { name: 'Flame', glyph: '▲', verb: 'Strike', color: '#d94f1e' },
  tide: { name: 'Tide', glyph: '●', verb: 'Flow', color: '#1e7ad9' },
  stone: { name: 'Stone', glyph: '■', verb: 'Guard', color: '#8a6a2f' },
  gale: { name: 'Gale', glyph: '◆', verb: 'Weave', color: '#2f9e57' },
};

/** One card definition. kind: damage | heal | shield | draw | ember | strip. */
export const CARD_DEFS = [
  // Flame — damage. The suit of finishing fights.
  { id: 'cinder', suit: 'flame', name: 'Cinder', cost: 1, kind: 'damage', value: 2, text: 'Deal 2. Gain 1 ember.', ember: 1 },
  { id: 'spark', suit: 'flame', name: 'Spark', cost: 1, kind: 'damage', value: 3, text: 'Deal 3 damage.' },
  { id: 'blaze', suit: 'flame', name: 'Blaze', cost: 2, kind: 'damage', value: 5, text: 'Deal 5 damage.' },
  { id: 'inferno', suit: 'flame', name: 'Inferno', cost: 3, kind: 'damage', value: 7, text: 'Deal 7 damage.' },
  // Tide — healing and card flow.
  { id: 'trickle', suit: 'tide', name: 'Trickle', cost: 1, kind: 'draw', value: 1, text: 'Draw 1 card.' },
  { id: 'mend', suit: 'tide', name: 'Mend', cost: 2, kind: 'heal', value: 4, text: 'Restore 4 life.' },
  { id: 'current', suit: 'tide', name: 'Current', cost: 2, kind: 'heal', value: 2, text: 'Restore 2 life. Draw 1.', draw: 1 },
  { id: 'deluge', suit: 'tide', name: 'Deluge', cost: 3, kind: 'heal', value: 6, text: 'Restore 6 life.' },
  // Stone — shields that soak damage.
  { id: 'pebble', suit: 'stone', name: 'Pebble', cost: 1, kind: 'shield', value: 4, text: 'Gain 4 shield.' },
  { id: 'bulwark', suit: 'stone', name: 'Bulwark', cost: 2, kind: 'shield', value: 7, text: 'Gain 7 shield.' },
  { id: 'aegis', suit: 'stone', name: 'Aegis', cost: 3, kind: 'shield', value: 5, text: 'Gain 5 shield. Heal 2.', heal: 2 },
  // Gale — embers and stripping the foe's shield.
  { id: 'gust', suit: 'gale', name: 'Gust', cost: 1, kind: 'ember', value: 2, text: 'Gain 2 embers.' },
  { id: 'sunder', suit: 'gale', name: 'Sunder', cost: 2, kind: 'strip', value: 3, text: 'Foe loses 3 shield.' },
  { id: 'zephyr', suit: 'gale', name: 'Zephyr', cost: 3, kind: 'ember', value: 3, text: 'Gain 3 embers. Draw 1.', draw: 1 },
];

// How many copies of each card go into one 36-card deck.
const COPIES = {
  cinder: 3, spark: 3, blaze: 3, inferno: 2,
  trickle: 3, mend: 3, current: 2, deluge: 2,
  pebble: 3, bulwark: 3, aegis: 2,
  gust: 3, sunder: 2, zephyr: 2,
};

export function cardById(id) {
  return CARD_DEFS.find((c) => c.id === id);
}

/** A small deterministic PRNG (mulberry32) so a seeded game replays exactly. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(deck, rng) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Build a fresh 36-card deck of card ids, shuffled with the given rng. */
export function buildDeck(rng) {
  const deck = [];
  for (const def of CARD_DEFS) {
    for (let i = 0; i < (COPIES[def.id] ?? 0); i++) deck.push(def.id);
  }
  return shuffle(deck, rng);
}

/** Resonance bonus when two cards of one suit are played in the same round. */
export const RESONANCE = {
  flame: { label: 'Flame Resonance: +3 damage', bonusDamage: 3 },
  tide: { label: 'Tide Resonance: draw 1 card', bonusDraw: 1 },
  stone: { label: 'Stone Resonance: +3 shield', bonusShield: 3 },
  gale: { label: 'Gale Resonance: +1 ember', bonusEmber: 1 },
};
