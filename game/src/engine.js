// Kindleward — the engine: state, rules, rounds, resonance, win and loss.
// Pure game logic; it knows nothing about the DOM.
import { buildDeck, cardById, makeRng, RESONANCE, shuffle } from './cards.js';
import { chooseIntent, choosePlays } from './ai.js';

export const MAX_LIFE = 20;
export const HAND_SIZE = 5;
export const PLAYS_PER_ROUND = 2;

export function newGame(seed = (Date.now() % 2147483647) || 7) {
  const rng = makeRng(seed);
  const state = {
    seed,
    rng,
    phase: 'title', // title | play | foe | end
    round: 1,
    you: freshSide(rng),
    foe: freshSide(rng),
    foeIntent: 'attack',
    playsThisRound: 0,
    suitsThisRound: [],
    log: [],
    stats: { damageDealt: 0, resonance: 0, roundsPlayed: 0 },
    endReason: '',
  };
  return state;
}

function freshSide(rng) {
  const deck = buildDeck(rng);
  const side = { life: MAX_LIFE, shield: 0, ember: 3, maxEmber: 3, deck, discard: [], hand: [] };
  drawUpTo(side, HAND_SIZE);
  return side;
}

export function drawUpTo(side, n) {
  while (side.hand.length < n) {
    if (side.deck.length === 0) {
      if (side.discard.length === 0) return;
      side.deck = shuffle([...side.discard], Math.random);
      side.discard = [];
    }
    side.hand.push(side.deck.pop());
  }
}

function drawCards(side, n) {
  for (let i = 0; i < n; i++) {
    if (side.deck.length === 0) {
      if (side.discard.length === 0) return;
      side.deck = shuffle([...side.discard], Math.random);
      side.discard = [];
    }
    side.hand.push(side.deck.pop());
  }
}

export function startGame(state) {
  state.phase = 'play';
  state.foeIntent = chooseIntent(state, state.rng);
  state.log = [`Round 1 — the Warden declares ${state.foeIntent.toUpperCase()}. Your move.`];
}

function say(state, line) {
  state.log.push(line);
  if (state.log.length > 40) state.log.shift();
}

/** Deal `amount` damage to a side, soaked by shield first. Returns life lost. */
function dealDamage(state, target, amount, sourceName) {
  const side = target === 'you' ? state.you : state.foe;
  const soaked = Math.min(side.shield, amount);
  side.shield -= soaked;
  const through = amount - soaked;
  side.life = Math.max(0, side.life - through);
  if (target === 'foe') state.stats.damageDealt += through;
  return { soaked, through };
}

/** Apply one card's effect. `actor` is 'you' or 'foe'. Returns a log line. */
export function applyCard(state, actor, cardId, resonanceBonus) {
  const card = cardById(cardId);
  const me = actor === 'you' ? state.you : state.foe;
  const them = actor === 'you' ? state.foe : state.you;
  const who = actor === 'you' ? 'You' : 'The Warden';
  const bonusDmg = resonanceBonus?.bonusDamage ?? 0;
  const bonusShield = resonanceBonus?.bonusShield ?? 0;
  let line = '';
  switch (card.kind) {
    case 'damage': {
      const amount = card.value + bonusDmg;
      const { soaked, through } = dealDamage(state, actor === 'you' ? 'foe' : 'you', amount, card.name);
      line = `${who} cast ${card.name} — ${amount} damage${soaked ? ` (${soaked} soaked by shield)` : ''}.`;
      if (card.ember) { me.ember += card.ember; line += ` +${card.ember} ember.`; }
      break;
    }
    case 'heal': {
      const healed = Math.min(MAX_LIFE - me.life, card.value);
      me.life += healed;
      line = `${who} cast ${card.name} — restored ${healed} life.`;
      if (card.draw) { drawCards(me, card.draw); line += ` Drew ${card.draw}.`; }
      break;
    }
    case 'shield': {
      const amount = card.value + bonusShield;
      me.shield += amount;
      line = `${who} raised ${card.name} — +${amount} shield.`;
      if (card.heal) {
        const healed = Math.min(MAX_LIFE - me.life, card.heal);
        me.life += healed;
        line += ` Healed ${healed}.`;
      }
      break;
    }
    case 'draw': {
      drawCards(me, card.value);
      line = `${who} cast ${card.name} — drew ${card.value} card${card.value > 1 ? 's' : ''}.`;
      break;
    }
    case 'ember': {
      me.ember += card.value;
      line = `${who} kindled ${card.name} — +${card.value} embers.`;
      if (card.draw) { drawCards(me, card.draw); line += ` Drew ${card.draw}.`; }
      break;
    }
    case 'strip': {
      const stripped = Math.min(them.shield, card.value);
      them.shield -= stripped;
      line = `${who} cast ${card.name} — stripped ${stripped} of the foe's shield.`;
      break;
    }
    default:
      line = `${who} cast ${card.name}.`;
  }
  return line;
}

/** Resonance check: two cards of one suit in the same round. */
function resonanceFor(state, suit) {
  if (state.suitsThisRound.includes(suit)) return RESONANCE[suit];
  return null;
}

export function canPlay(state, cardId) {
  if (state.phase !== 'play') return false;
  if (state.playsThisRound >= PLAYS_PER_ROUND) return false;
  const card = cardById(cardId);
  return state.you.ember >= card.cost && state.you.hand.includes(cardId);
}

/** Play one of your cards. Returns {ok, reason}. */
export function playCard(state, cardId) {
  if (!canPlay(state, cardId)) return { ok: false, reason: 'cannot play that card now' };
  const card = cardById(cardId);
  const res = resonanceFor(state, card.suit);
  state.you.ember -= card.cost;
  state.you.hand.splice(state.you.hand.indexOf(cardId), 1);
  state.you.discard.push(cardId);
  state.playsThisRound += 1;
  state.suitsThisRound.push(card.suit);
  let line = applyCard(state, 'you', cardId, res);
  if (res) {
    state.stats.resonance += 1;
    if (res.bonusDraw) { drawCards(state.you, res.bonusDraw); line += ` ${res.label}!`; }
    if (res.bonusEmber) { state.you.ember += res.bonusEmber; line += ` ${res.label}!`; }
    if (res.bonusShield) { state.you.shield += res.bonusShield; line += ` ${res.label}!`; }
    if (res.bonusDamage) line += ` ${res.label}!`;
  }
  say(state, line);
  checkEnd(state);
  return { ok: true, line };
}

/** End your round: the Warden answers, then upkeep starts a new round. */
export function endRound(state) {
  if (state.phase !== 'play') return;
  state.phase = 'foe';
  say(state, `— Round ${state.round}: the Warden answers (${state.foeIntent}) —`);
  const { plays, emberLeft } = choosePlays(state, state.rng);
  state.foe.ember = emberLeft;
  const foeSuits = [];
  for (const id of plays) {
    const card = cardById(id);
    const res = foeSuits.includes(card.suit) ? RESONANCE[card.suit] : null;
    foeSuits.push(card.suit);
    state.foe.hand.splice(state.foe.hand.indexOf(id), 1);
    state.foe.discard.push(id);
    const line = applyCard(state, 'foe', id, res);
    if (res) {
      if (res.bonusDraw) drawCards(state.foe, res.bonusDraw);
      if (res.bonusEmber) state.foe.ember += res.bonusEmber;
      if (res.bonusShield) state.foe.shield += res.bonusShield;
    }
    say(state, line);
    if (checkEnd(state)) return;
  }
  if (plays.length === 0) say(state, 'The Warden holds its cards, watching.');
  // Upkeep: a new round kindles one more ember, hands refill.
  state.stats.roundsPlayed = state.round;
  state.round += 1;
  for (const side of [state.you, state.foe]) {
    side.maxEmber = Math.min(10, side.maxEmber + 1);
    side.ember = side.maxEmber;
    drawUpTo(side, HAND_SIZE);
  }
  // The kindling burns: from round 15 on, both duelists lose life at the
  // start of the round, and the burn grows slowly, so no duel can stall
  // forever however much both sides heal — but combat still decides most
  // games long before the fire matters.
  if (state.round >= 15) {
    const burn = Math.min(3, 1 + Math.floor((state.round - 15) / 4));
    state.you.life = Math.max(0, state.you.life - burn);
    state.foe.life = Math.max(0, state.foe.life - burn);
    say(state, `Round ${state.round} — the kindling burns: both duelists lose ${burn} life.`);
    if (checkEnd(state)) return;
  }
  state.playsThisRound = 0;
  state.suitsThisRound = [];
  state.foeIntent = chooseIntent(state, state.rng);
  state.phase = 'play';
  say(state, `Round ${state.round} — the Warden declares ${state.foeIntent.toUpperCase()}. Your move.`);
}

/** True when the duel is over; sets phase and the end reason. */
export function checkEnd(state) {
  if (state.you.life <= 0 && state.foe.life <= 0) {
    state.phase = 'end';
    state.endReason = 'Both lights went out at once — a draw the bards will argue about forever.';
    return true;
  }
  if (state.foe.life <= 0) {
    state.phase = 'end';
    state.endReason = 'The Warden’s last sigil shatters. The table is yours.';
    return true;
  }
  if (state.you.life <= 0) {
    state.phase = 'end';
    state.endReason = 'Your last ember gutters out. The Warden keeps the table… this time.';
    return true;
  }
  return false;
}

export function isWin(state) {
  return state.phase === 'end' && state.foe.life <= 0 && state.you.life > 0;
}

export function isLoss(state) {
  return state.phase === 'end' && state.you.life <= 0;
}
