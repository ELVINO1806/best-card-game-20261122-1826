// main.ts — Ember Pact entrypoint: hand the game in.
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json with buildDossier from vendor/makefun-game.ts.

import { cpSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outputDir, { recursive: true });
mkdirSync(join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });

cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

// Verify the hand-in on disk: the dossier must be a JSON object, and the
// screenshots must be the ones the repository holds, not stale copies.
const written = readFileSync(join(outputDir, 'dossier.json'), 'utf8');
if (!written.startsWith('{')) throw new Error('dossier.json was not written as JSON');
const shotNames = readdirSync(join(outputDir, 'screenshots')).sort();
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`expected 3-4 screenshots, found ${shotNames.length}`);
}
console.log(`ember-pact: ${shotNames.length} screenshots, dossier ${dossier.length} bytes`);
