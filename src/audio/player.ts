import { MOOD_DEFS, type Mood, type MoodDef } from './moods';
import { chordTone, degreeToMidi, midiToFreq, parseHits, parsePattern, type PatternNote } from './theory';
import * as inst from './instruments';

const STEPS_PER_BAR = 16;
type Layer = 'pad' | 'bass' | 'arp' | 'melody' | 'perc';
const THIN_LAYERS: Layer[] = ['melody', 'arp', 'perc'];

function notesByStep(pattern: string): Map<number, PatternNote[]> {
  const { steps, notes } = parsePattern(pattern);
  if (steps !== STEPS_PER_BAR) throw new Error(`Pattern needs ${STEPS_PER_BAR} steps: "${pattern}"`);
  const map = new Map<number, PatternNote[]>();
  for (const n of notes) map.set(n.step, [...(map.get(n.step) ?? []), n]);
  return map;
}

function hitSet(pattern: string | undefined): Set<number> {
  if (!pattern) return new Set();
  const { steps, hits } = parseHits(pattern);
  if (steps !== STEPS_PER_BAR) throw new Error(`Pattern needs ${STEPS_PER_BAR} steps: "${pattern}"`);
  return new Set(hits);
}

/**
 * Plays one mood as a loop. A player owns its own gain bus so two players
 * can overlap while one fades out and the next fades in.
 */
export class MoodPlayer {
  readonly mood: Mood;
  readonly def: MoodDef;
  readonly bus: GainNode;
  private readonly layers: Record<Layer, GainNode>;
  private readonly melody: Map<number, PatternNote[]>[];
  private readonly bass: Map<number, PatternNote[]>;
  private readonly arp: Map<number, PatternNote[]> | null;
  private readonly hats: Set<number>;
  private readonly drums: Set<number>;
  private readonly stepDur: number;
  private step = 0;
  private nextTime: number;
  private stopTime = Infinity;
  thin = false;
  readonly failed = false;

  constructor(private readonly kit: inst.Kit, out: AudioNode, mood: Mood, startTime: number, fadeIn?: number) {
    const ctx = kit.ctx;
    this.mood = mood;
    this.def = MOOD_DEFS[mood];
    this.stepDur = 60 / this.def.bpm / 4;
    this.nextTime = startTime;
    this.bus = ctx.createGain();
    this.bus.connect(out);
    const fade = fadeIn ?? this.def.fadeIn;
    this.bus.gain.setValueAtTime(0, ctx.currentTime);
    this.bus.gain.setValueAtTime(0, startTime);
    this.bus.gain.linearRampToValueAtTime(1, startTime + fade);
    const layer = (level: number) => {
      const g = ctx.createGain();
      g.gain.value = level;
      g.connect(this.bus);
      return g;
    };
    const { levels } = this.def;
    this.layers = {
      pad: layer(levels.pad),
      bass: layer(levels.bass),
      arp: layer(levels.arp),
      melody: layer(levels.melody),
      perc: layer(levels.perc),
    };
    this.melody = this.def.melody.map(notesByStep);
    this.bass = notesByStep(this.def.bass);
    this.arp = this.def.arp ? notesByStep(this.def.arp) : null;
    this.hats = hitSet(this.def.hat);
    this.drums = hitSet(this.def.drum);
  }

  get finished(): boolean {
    return this.kit.ctx.currentTime > this.stopTime;
  }

  get key(): string {
    return this.mood;
  }

  /** Schedules every step that starts before `until` (seconds, context time). */
  scheduleUntil(until: number) {
    while (this.nextTime < until && this.nextTime < this.stopTime) {
      this.scheduleStep(this.step, this.nextTime);
      this.step += 1;
      this.nextTime += this.stepDur;
    }
  }

  fadeOut(seconds: number) {
    const ctx = this.kit.ctx;
    const now = ctx.currentTime;
    const g = this.bus.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + seconds);
    this.stopTime = Math.min(this.stopTime, now + seconds);
  }

  /** Drops melody, arpeggio and percussion, leaving a soft bed of pad and bass. */
  setThin(thin: boolean, seconds = 4) {
    if (thin === this.thin) return;
    this.thin = thin;
    const now = this.kit.ctx.currentTime;
    for (const name of THIN_LAYERS) {
      const g = this.layers[name].gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(thin ? 0 : this.def.levels[name], now + seconds);
    }
  }

  disconnect() {
    this.bus.disconnect();
  }

  private scheduleStep(step: number, t: number) {
    const { def, kit, layers } = this;
    const bar = Math.floor(step / STEPS_PER_BAR);
    const s = step % STEPS_PER_BAR;
    const chord = def.chords[bar % def.chords.length];
    const barDur = this.stepDur * STEPS_PER_BAR;

    if (def.pad && s === 0 && def.levels.pad > 0) {
      const freqs = [0, 1, 2].map((i) => midiToFreq(chordTone(def.root, def.scale, chord, i)));
      inst.pad(kit, layers.pad, freqs, t, barDur * 0.95, 0.9);
    }

    for (const n of this.bass.get(s) ?? []) {
      const f = midiToFreq(chordTone(def.root - 12, def.scale, chord, n.value));
      if (def.bassVoice === 'pizz') inst.pizzBass(kit, layers.bass, f, t, 0.8);
      else inst.softBass(kit, layers.bass, f, t, n.length * this.stepDur, 0.22); // sustained, so much quieter than a pluck
    }

    for (const n of this.arp?.get(s) ?? []) {
      const f = midiToFreq(chordTone(def.root + 12, def.scale, chord, n.value));
      inst.musicBox(kit, layers.arp, f, t, 0.6);
    }

    for (const n of this.melody[bar % this.melody.length].get(s) ?? []) {
      const f = midiToFreq(degreeToMidi(def.root + 12, def.scale, n.value));
      const dur = n.length * this.stepDur;
      // Small accent on the downbeat makes the loop feel less mechanical.
      const vel = s % 4 === 0 ? 0.75 : 0.6;
      switch (def.melodyVoice) {
        case 'musicBox':
          inst.musicBox(kit, layers.melody, f * 2, t, vel);
          break;
        case 'bell':
          inst.bell(kit, layers.melody, f * 2, t, vel);
          break;
        case 'pluck':
          inst.pluck(kit, layers.melody, f, t, dur, vel);
          break;
        case 'flute':
          inst.flute(kit, layers.melody, f, t, dur, vel);
          break;
      }
    }

    if (this.hats.has(s)) inst.hat(kit, layers.perc, t, s % 4 === 0 ? 0.6 : 0.4);
    if (this.drums.has(s)) inst.softDrum(kit, layers.perc, t, 1);
  }
}
