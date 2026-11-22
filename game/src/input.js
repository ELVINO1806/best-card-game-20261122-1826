// input.js — keyboard and mouse controls for Ember Pact.
// One job: translate keys and clicks into game actions.

/**
 * Bind the game's controls.
 * handlers: { onPlayCard(index), onStart(), onNext(), onRestart(), onToggleMute() }
 * Returns an unbind function.
 */
export function bindControls(handlers) {
  function onKeyDown(event) {
    if (event.repeat) return;
    const key = event.key;
    if (key >= '1' && key <= '5') {
      handlers.onPlayCard(Number(key) - 1);
      return;
    }
    if (key === 'Enter') {
      handlers.onStart();
      handlers.onNext();
      return;
    }
    if (key === 'r' || key === 'R') {
      handlers.onRestart();
      return;
    }
    if (key === 'm' || key === 'M') {
      handlers.onToggleMute();
    }
  }

  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
}

/** Bind the title screen's Play button and the end screens' again buttons. */
export function bindScreenButtons(handlers) {
  const play = document.getElementById('play-button');
  if (play) play.addEventListener('click', handlers.onStart);
  const again = document.getElementById('again-button');
  if (again) again.addEventListener('click', handlers.onRestart);
  const retry = document.getElementById('retry-button');
  if (retry) retry.addEventListener('click', handlers.onRestart);
  const mute = document.getElementById('mute-button');
  if (mute) mute.addEventListener('click', handlers.onToggleMute);
}
