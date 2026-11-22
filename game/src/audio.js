// audio.js — synthesized sound effects with plain WebAudio, no audio files.
// One job: make every game beat audible without loading anything.

let audioContext = null;
let muted = false;
let gestureSeen = false;

// Sounds only start after a real user gesture: creating an AudioContext
// before one makes Chrome log an autoplay warning on every call.
window.addEventListener('pointerdown', () => { gestureSeen = true; }, { once: true });
window.addEventListener('keydown', () => { gestureSeen = true; }, { once: true });

/** Lazily create the audio context (browsers require a user gesture first). */
export function ensureAudio() {
  if (!gestureSeen) return null;
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

/** Toggle mute. Returns the new muted state. */
export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(frequency, duration, type, volume, when) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime + (when || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume || 0.12, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Short click when a card is picked. */
export function playClick() {
  tone(620, 0.07, 'triangle', 0.1);
}

/** Card flip whoosh: two quick notes. */
export function playFlip() {
  tone(340, 0.09, 'sine', 0.1);
  tone(520, 0.1, 'sine', 0.09, 0.07);
}

/** Winning a trick: rising major arpeggio. */
export function playWinTrick() {
  tone(523, 0.12, 'triangle', 0.12);
  tone(659, 0.12, 'triangle', 0.12, 0.1);
  tone(784, 0.2, 'triangle', 0.12, 0.2);
}

/** Losing a trick: falling minor pair. */
export function playLoseTrick() {
  tone(392, 0.14, 'sawtooth', 0.06);
  tone(311, 0.22, 'sawtooth', 0.06, 0.12);
}

/** A clash (tie): one dull thud. */
export function playClash() {
  tone(180, 0.18, 'square', 0.07);
}

/** Full victory fanfare. */
export function playVictory() {
  const notes = [523, 659, 784, 1047, 784, 1047];
  notes.forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.12, i * 0.14));
}

/** Defeat: slow descending line. */
export function playDefeat() {
  const notes = [392, 349, 311, 262];
  notes.forEach((freq, i) => tone(freq, 0.3, 'sawtooth', 0.06, i * 0.2));
}
