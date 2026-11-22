import * as inst from './instruments';
import { midiToFreq } from './theory';

export const SFX = ['chime', 'munch', 'chirp', 'splash', 'sneeze', 'crash', 'scratch', 'trot', 'quack', 'ribbit', 'plop', 'whoosh', 'thud'] as const;
export type Sfx = (typeof SFX)[number];
export const STINGS = ['surprise', 'theEnd'] as const;
export type Sting = (typeof STINGS)[number];

const PENTATONIC = [72, 74, 76, 79, 81, 84, 86, 88];

export function playSfx(kit: inst.Kit, dest: AudioNode, name: Sfx | Sting, t: number) {
  switch (name) {
    case 'chime': {
      const start = Math.floor(Math.random() * 4);
      [0, 1, 2].forEach((i) => inst.musicBox(kit, dest, midiToFreq(PENTATONIC[start + i * 2 - (i === 2 ? 1 : 0)]), t + i * 0.09, 0.45));
      break;
    }
    case 'munch':
      for (let i = 0; i < 6; i++) {
        inst.noiseBurst(kit, dest, t + i * 0.1 + Math.random() * 0.02, { type: 'bandpass', freq: 1500 + Math.random() * 800, q: 1.5, peak: 0.7, decay: 0.05 });
      }
      break;
    case 'chirp':
      [0, 0.13, 0.5, 0.63, 0.76].forEach((o) => {
        const base = 2600 + Math.random() * 400;
        inst.sweep(kit, dest, t + o, base, base * 1.6, 0.08, 0.25);
      });
      break;
    case 'splash':
      inst.noiseBurst(kit, dest, t, { type: 'lowpass', freq: 3500, endFreq: 300, peak: 0.6, decay: 0.7 });
      [0.12, 0.25, 0.4].forEach((o) => inst.sweep(kit, dest, t + o, 500 + Math.random() * 200, 1200, 0.07, 0.25));
      break;
    case 'sneeze':
      // "Ah..." building up, then a sharp "choo!"
      inst.noiseBurst(kit, dest, t, { type: 'bandpass', freq: 900, endFreq: 1400, q: 5, peak: 0.35, attack: 0.5, decay: 0.08 });
      inst.noiseBurst(kit, dest, t + 0.62, { type: 'bandpass', freq: 3000, endFreq: 700, q: 1.2, peak: 0.9, decay: 0.3 });
      inst.sweep(kit, dest, t + 0.62, 520, 260, 0.2, 0.15, 'triangle');
      break;
    case 'crash':
      inst.softDrum(kit, dest, t, 0.9);
      inst.noiseBurst(kit, dest, t, { type: 'bandpass', freq: 1800, q: 0.8, peak: 0.5, decay: 0.35 });
      [0.08, 0.17, 0.3].forEach((o) => inst.bell(kit, dest, 1400 + Math.random() * 900, t + o, 0.15));
      break;
    case 'scratch':
      // scr-r-ritch, scratch, scratch, scritch
      [
        [0, 0.35],
        [0.5, 0.14],
        [0.72, 0.14],
        [0.95, 0.2],
      ].forEach(([o, d]) => inst.noiseBurst(kit, dest, t + o, { type: 'bandpass', freq: 2200, endFreq: 4200, q: 2, peak: 0.5, attack: 0.02, decay: d }));
      break;
    case 'trot':
      // trit-trot, trit-trot: hooves on a road
      [0, 0.13, 0.42, 0.55, 0.84, 0.97].forEach((o, i) => {
        inst.noiseBurst(kit, dest, t + o, { type: 'bandpass', freq: i % 2 ? 1300 : 1800, q: 4, peak: 0.6, decay: 0.05 });
        inst.sweep(kit, dest, t + o, i % 2 ? 520 : 680, 300, 0.05, 0.25);
      });
      break;
    case 'quack':
      [0, 0.3].forEach((o) => quack(kit, dest, t + o));
      break;
    case 'ribbit':
      [0, 0.16, 0.6, 0.76].forEach((o, i) => croak(kit, dest, t + o, i % 2 ? 0.11 : 0.07));
      break;
    case 'plop':
      inst.sweep(kit, dest, t, 1100, 240, 0.09, 0.5);
      inst.noiseBurst(kit, dest, t + 0.02, { type: 'lowpass', freq: 1200, peak: 0.12, decay: 0.15 });
      break;
    case 'whoosh':
      inst.noiseBurst(kit, dest, t, { type: 'bandpass', freq: 300, endFreq: 2400, q: 0.9, peak: 0.6, attack: 0.25, decay: 0.45 });
      break;
    case 'thud':
      inst.softDrum(kit, dest, t, 1);
      inst.noiseBurst(kit, dest, t, { type: 'lowpass', freq: 400, peak: 0.5, decay: 0.2 });
      inst.sweep(kit, dest, t + 0.25, 900, 1400, 0.08, 0.15);
      break;
    case 'surprise':
      inst.softDrum(kit, dest, t, 1);
      inst.pluck(kit, dest, midiToFreq(62), t, 0.4, 0.4);
      inst.pluck(kit, dest, midiToFreq(63), t, 0.4, 0.4);
      inst.bell(kit, dest, midiToFreq(87), t + 0.02, 0.25);
      break;
    case 'theEnd':
      [65, 69, 72, 77, 81].forEach((m, i) => inst.musicBox(kit, dest, midiToFreq(m + 12), t + i * 0.16, 0.45));
      break;
  }
}

/** A nasal duck call: a buzzy tone through a narrow, falling filter. */
function quack(kit: inst.Kit, dest: AudioNode, t: number) {
  const { ctx } = kit;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(260, t);
  o.frequency.exponentialRampToValueAtTime(190, t + 0.18);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 3;
  f.frequency.setValueAtTime(1500, t);
  f.frequency.exponentialRampToValueAtTime(800, t + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.9, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(f);
  f.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + 0.22);
}

/** A low frog croak: a pulsing square wave, filtered. */
function croak(kit: inst.Kit, dest: AudioNode, t: number, dur: number) {
  const { ctx } = kit;
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.setValueAtTime(95, t);
  o.frequency.linearRampToValueAtTime(120, t + dur);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 700;
  f.Q.value = 2;
  // Fast tremolo gives the "rrr" of a croak.
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.7, t + 0.01);
  g.gain.setValueAtTime(0.7, t + dur - 0.02);
  g.gain.linearRampToValueAtTime(0, t + dur);
  const trem = ctx.createOscillator();
  trem.frequency.value = 38;
  const depth = ctx.createGain();
  depth.gain.value = 0.35;
  trem.connect(depth);
  depth.connect(g.gain);
  o.connect(f);
  f.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
  trem.start(t);
  trem.stop(t + dur + 0.02);
}
