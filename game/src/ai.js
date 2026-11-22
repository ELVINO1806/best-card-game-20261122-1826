// ai.js — the Ember Warden's brain: readable, counterable choices plus a tell.
// One job: pick the Warden's card and hint at it before the player commits.

import { ELEMENTS, SPECIALS, elementBeats, trickPower } from './deck.js';

/** The Warden's named tactics, in priority order. */
export const WARDEN_TACTICS = {
  finishWithQuake: 'Finish with Quake',
  saveWardWhenHurt: 'Save Ward when hurt',
  winCheap: 'Win the trick cheap',
  spendSurgeOnHigh: 'Spend Surge on a high card',
  healWhenBleeding: 'Heal when bleeding',
  playSafe: 'Play safe',
};

/**
 * Pick the Warden's card for this round.
 * state: { wardenLife, playerLife, wardenHand, playerHandSize, round }
 * Returns { card, tactic }.
 */
export function chooseWardenCard(state) {
  const hand = state.wardenHand;
  const byId = (id) => hand.find((c) => c.id === id);
  const quake = byId('special-quake');
  const ward = byId('special-ward');
  const mend = byId('special-mend');
  const surge = byId('special-surge');
  const elements = hand.filter((c) => c.kind === 'element');

  // 1. Finish the player with Quake when it is lethal.
  if (quake && state.playerLife <= 3) {
    return { card: quake, tactic: WARDEN_TACTICS.finishWithQuake };
  }
  // 2. Save Ward for the next round when badly hurt — play it now only if it
  //    would block a killing blow: the Warden holds it and plays its weakest card.
  if (ward && state.wardenLife <= 8 && state.playerLife > 3) {
    const weakest = weakestElement(elements);
    if (weakest) return { card: weakest, tactic: WARDEN_TACTICS.saveWardWhenHurt };
  }
  // 3. Heal when bleeding and no better trick is on offer.
  if (mend && state.wardenLife <= 6) {
    return { card: mend, tactic: WARDEN_TACTICS.healWhenBleeding };
  }
  // 4. Spend Surge on a high card to steal a trick the Warden would lose.
  if (surge && elements.length > 0) {
    const best = strongestElement(elements);
    if (best && best.power >= 7) {
      return { card: surge, tactic: WARDEN_TACTICS.spendSurgeOnHigh };
    }
  }
  // 5. Win the trick as cheaply as possible: the lowest card that still wins
  //    against the player's most likely card (their hand's median power).
  if (elements.length > 0) {
    const cheapestWinner = cheapestWinningCard(elements, state.playerHandSize);
    if (cheapestWinner) return { card: cheapestWinner, tactic: WARDEN_TACTICS.winCheap };
    return { card: weakestElement(elements), tactic: WARDEN_TACTICS.playSafe };
  }
  // 6. Only specials left: play the first one.
  return { card: hand[0], tactic: WARDEN_TACTICS.playSafe };
}

function weakestElement(elements) {
  if (elements.length === 0) return null;
  return elements.reduce((a, b) => (a.power <= b.power ? a : b));
}

function strongestElement(elements) {
  if (elements.length === 0) return null;
  return elements.reduce((a, b) => (a.power >= b.power ? a : b));
}

/**
 * The cheapest element card that beats a typical player card (power 5, no
 * advantage assumed). A card that beats it on element wins even at low power.
 */
function cheapestWinningCard(elements, playerHandSize) {
  const typical = 5;
  const winners = elements.filter((c) => c.power > typical || c.power + 3 > typical);
  if (winners.length === 0) return null;
  winners.sort((a, b) => a.power - b.power);
  return winners[0];
}

/**
 * The Warden's tell: a mood line shown before the player commits, hinting at
 * the element the Warden is about to play. Element cards hint truly; a special
 * card shows a restless, unreadable mood instead.
 */
export function wardenMood(card) {
  if (!card) return 'The Warden waits in the dark.';
  if (card.kind === 'special') {
    if (card.special === 'quake') return 'The ground trembles under the Warden. Something heavy is coming.';
    if (card.special === 'ward') return 'The Warden folds its arms. It is guarding, not striking.';
    if (card.special === 'mend') return 'Embers gather around the Warden, knitting its wounds shut.';
    return 'The Warden hums. Power is building, but you cannot see where.';
  }
  const el = ELEMENTS[card.element];
  const lines = {
    flame: 'The Warden’s eyes flare orange. Flame is coming — Thorn would burn.',
    tide: 'A cold mist curls from the Warden’s cloak. Tide is coming — Flame would drown.',
    thorn: 'Vines stir at the Warden’s feet. Thorn is coming — Tide would be drunk dry.',
    stone: 'The Warden stands still as a mountain. Stone is coming — no element beats it, none loses to it.',
  };
  return lines[card.element] || `The Warden favours ${el.name}.`;
}

/** Short label for the tell's element, used by the HUD. */
export function moodElement(card) {
  if (!card || card.kind !== 'element') return null;
  return card.element;
}
