// Kindleward — the Warden: an opponent whose choices you can read and
// counter. Each round it declares one intent; its plays follow that intent.
import { cardById } from './cards.js';

export const INTENTS = {
  attack: { label: '⚔ ATTACK', cls: 'attack', hint: 'The Warden bares its fangs — a shield now is worth two strikes later.' },
  guard: { label: '🛡 GUARD', cls: 'guard', hint: 'The Warden raises its guard — strike through it, or strip it away.' },
  scheme: { label: '✦ SCHEME', cls: 'scheme', hint: 'The Warden is plotting — it draws and kindles. Hit it while it is busy.' },
};

/** Pick the round's intent from the board state. Readable, not random chaos. */
export function chooseIntent(state, rng) {
  const foe = state.foe;
  const you = state.you;
  const hasDamage = foe.hand.some((id) => cardById(id).kind === 'damage');
  const hasGuard = foe.hand.some((id) => cardById(id).kind === 'shield');
  const roll = rng();
  // Hurt and holding a shield: turtle up.
  if (foe.life <= 8 && hasGuard) return 'guard';
  // Your shield is down and it holds fire: it will hit you.
  if (you.shield <= 2 && hasDamage && roll < 0.55) return 'attack';
  // Behind on life: press the attack.
  if (foe.life < you.life - 4 && hasDamage && roll < 0.5) return 'attack';
  // Otherwise a spread: mostly attack, sometimes guard or scheme.
  if (roll < 0.55) return 'attack';
  if (roll < 0.8) return 'guard';
  return 'scheme';
}

/** Choose up to two cards the Warden plays for its intent, spending its embers. */
export function choosePlays(state, rng) {
  const foe = state.foe;
  const intent = state.foeIntent;
  let ember = foe.ember;
  const plays = [];
  const pool = [...foe.hand];

  const affordable = (kind) => pool.filter((id) => {
    const c = cardById(id);
    return c.kind === kind && c.cost <= ember;
  });
  const takeBest = (kind, byValue) => {
    const list = affordable(kind).sort((a, b) => byValue(cardById(b)) - byValue(cardById(a)));
    if (list.length === 0) return null;
    const id = list[0];
    ember -= cardById(id).cost;
    pool.splice(pool.indexOf(id), 1);
    plays.push(id);
    return id;
  };

  if (intent === 'attack') {
    takeBest('damage', (c) => c.value);
    // A second blow if it can afford one, else a cheap trickle of embers.
    if (!takeBest('damage', (c) => c.value)) {
      takeBest('ember', (c) => c.value) || takeBest('strip', (c) => c.value);
    }
  } else if (intent === 'guard') {
    takeBest('shield', (c) => c.value);
    if (foe.life <= 12) takeBest('heal', (c) => c.value);
    else takeBest('damage', (c) => c.value);
  } else {
    // Scheme: kindle and draw first, then whatever damage is left.
    takeBest('ember', (c) => c.value) || takeBest('draw', (c) => c.value);
    takeBest('draw', (c) => c.value) || takeBest('damage', (c) => c.value);
  }
  // If it still holds a playable card, spend it: the Warden never sits on
  // a playable hand — a heal at full life still cycles the hand.
  if (plays.length < 2) {
    takeBest('damage', (c) => c.value) || takeBest('shield', (c) => c.value)
      || takeBest('ember', (c) => c.value) || takeBest('draw', (c) => c.value)
      || takeBest('heal', (c) => c.value) || takeBest('strip', (c) => c.value);
  }
  if (plays.length === 0) {
    // Dead hand (all heals at full life, say): play the cheapest card
    // anyway so the hand cycles and the duel keeps moving.
    const any = pool
      .filter((id) => cardById(id).cost <= ember)
      .sort((a, b) => cardById(a).cost - cardById(b).cost)[0];
    if (any) {
      ember -= cardById(any).cost;
      plays.push(any);
    }
  }
  return { plays, emberLeft: ember };
}
