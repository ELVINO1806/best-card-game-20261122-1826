// Kindleward — the submission runner for make.fun, built on Node 22 with no dependencies.
// It copies this repository's game/ and screenshots/ beside this file into
// the output directory and writes output/dossier.json with the vendored
// make.fun library, so the scorer can rebuild the same dossier byte for
// byte. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program never deletes the output directory: on the grader /output is
// a mount point, and removing it fails the run. It only creates the two
// subdirectories it needs and overwrites their contents.

import { cpSync } from 'node:fs';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (the competition's gate.json): only text_max_bytes
// shapes the dossier's bytes; the rest refuse an entry the scorer would
// refuse — more than 4 screenshots or one over 256 KiB, more than 993
// files in game/ or 48 MiB of game files in all, or a game path over
// 1000 bytes. game/ counts beside /output's own 1000-entry cap, together
// with screenshots/ and dossier.json.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function shotSizes(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith('.'))
    .sort()
    .map((name) => ({ name, bytes: statSync(join(dir, name)).size }));
}

mkdirSync(outDir, { recursive: true });
copyTree(join(repoRoot, 'game'), join(outDir, 'game'));
copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));

const dossier = buildDossier(outDir, DOSSIER_CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Verify the hand-in before reporting it: the written dossier must be
// exactly what the library builds from the output directory, and every
// screenshot must fit the gate's byte cap.
const written = readFileSync(join(outDir, 'dossier.json'));
const rebuilt = buildDossier(outDir, DOSSIER_CAPS);
if (!written.equals(rebuilt)) throw new Error('kindleward: dossier.json does not match a fresh buildDossier');
const shots = shotSizes(join(outDir, 'screenshots'));
if (shots.length < 3 || shots.length > 4) throw new Error(`kindleward: ${shots.length} screenshots, need 3 or 4`);
for (const s of shots) {
  if (s.bytes > DOSSIER_CAPS.screenshots.max_bytes) throw new Error(`kindleward: ${s.name} is ${s.bytes} bytes, over the 256 KiB cap`);
}

console.log(
  `kindleward: ${shots.length} screenshots (${shots.map((s) => `${s.name} ${s.bytes}B`).join(', ')}), ` +
    `dossier ${dossier.length} bytes`,
);
