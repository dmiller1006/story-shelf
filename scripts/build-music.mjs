// Trims, fades, loudness-normalizes and encodes the recordings listed in
// src/audio/tracks.json into public/music/<id>.m4a (AAC, plays everywhere incl. Safari).
//
// Originals are read from music-src/ (not committed). Get them with
// scripts/fetch-music-sources.sh, or by checking out the music-src branch into that folder.
//
// Usage: node scripts/build-music.mjs [--only id,id]
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const root = join(import.meta.dirname, '..');
const tracks = JSON.parse(readFileSync(join(root, 'src/audio/tracks.json'), 'utf8'));
const srcDir = join(root, 'music-src');
const outDir = join(root, 'public/music');
mkdirSync(outDir, { recursive: true });
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > 0 ? new Set(process.argv[onlyArg + 1].split(',')) : null;

const DEFAULT_LUFS = -21;
const FADE_IN = 1.5;
const FADE_OUT = 3;

function ffmpeg(args) {
  return execFileSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

function duration(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
}

let missing = 0;
for (const t of tracks) {
  if (only && !only.has(t.id)) continue;
  const name = decodeURIComponent(basename(t.url));
  const src = join(srcDir, name);
  if (!existsSync(src)) {
    console.log(`skip ${t.id}: missing music-src/${name}`);
    missing += 1;
    continue;
  }
  const start = t.start ?? 0;
  const end = t.end ?? duration(src);
  const len = end - start;
  const target = t.loudness ?? DEFAULT_LUFS;
  const fades = `afade=t=in:d=${start > 0 ? FADE_IN : 0.05},afade=t=out:st=${(len - FADE_OUT).toFixed(2)}:d=${FADE_OUT}`;
  const cut = ['-ss', String(start), '-t', String(len), '-i', src];

  // Two-pass loudness normalization: measure, then apply a single linear gain (no pumping).
  const measure = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...cut, '-af', `${fades},loudnorm=I=${target}:TP=-2:LRA=20:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' });
  if (measure.status !== 0) throw new Error(`measure failed for ${t.id}: ${measure.stderr}`);
  const m = JSON.parse(measure.stderr.slice(measure.stderr.lastIndexOf('{')));
  const norm = `loudnorm=I=${target}:TP=-2:LRA=20:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;

  const out = join(outDir, `${t.id}.m4a`);
  ffmpeg([...cut, '-map', '0:a:0', '-vn', '-af', `${fades},${norm}`, '-ac', '2', '-ar', '44100', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-map_metadata', '-1', out]);
  console.log(`ok   ${t.id}  ${len.toFixed(0)}s  ${m.input_i} -> ${target} LUFS`);
}
if (missing) console.log(`\n${missing} track(s) skipped because their originals are not in music-src/.`);
