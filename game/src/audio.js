// Kindleward — sound: tiny WebAudio blips, created only after a user
// gesture, so the console stays silent until the player touches the game.
let ctx = null;
let muted = false;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

/** Call from any real user gesture (click / keypress) before playing. */
export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') void c.resume();
}

export function setMuted(m) {
  muted = m;
}

export function isMuted() {
  return muted;
}

function blip(freq, dur, type = 'sine', gain = 0.08) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export const sfx = {
  play: () => blip(520, 0.12, 'triangle', 0.07),
  draw: () => blip(660, 0.08, 'sine', 0.05),
  hit: () => { blip(180, 0.18, 'sawtooth', 0.08); blip(120, 0.22, 'square', 0.05); },
  heal: () => { blip(440, 0.12, 'sine', 0.06); setTimeout(() => blip(660, 0.14, 'sine', 0.06), 90); },
  shield: () => blip(300, 0.15, 'triangle', 0.07),
  resonance: () => { blip(523, 0.1, 'sine', 0.07); setTimeout(() => blip(784, 0.16, 'sine', 0.07), 80); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.08), i * 120)); },
  lose: () => { [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.25, 'sine', 0.07), i * 150)); },
};
