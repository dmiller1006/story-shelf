import { describe, expect, it } from 'vitest';
import { MOOD_DEFS, MOODS } from '../src/audio/moods';
import { chordTone, degreeToMidi, parseHits, parsePattern } from '../src/audio/theory';

describe.each(MOODS)('mood %s', (mood) => {
  const def = MOOD_DEFS[mood];

  it('has 16-step bars everywhere', () => {
    for (const bar of def.melody) expect(parsePattern(bar).steps).toBe(16);
    expect(parsePattern(def.bass).steps).toBe(16);
    if (def.arp) expect(parsePattern(def.arp).steps).toBe(16);
    if (def.hat) expect(parseHits(def.hat).steps).toBe(16);
    if (def.drum) expect(parseHits(def.drum).steps).toBe(16);
  });

  it('has a melody that lines up with the chord loop', () => {
    expect(def.melody.length % def.chords.length).toBe(0);
  });

  it('keeps every note in a comfortable range', () => {
    for (const bar of def.melody) {
      for (const n of parsePattern(bar).notes) {
        const midi = degreeToMidi(def.root + 12, def.scale, n.value);
        expect(midi).toBeGreaterThanOrEqual(55);
        expect(midi).toBeLessThanOrEqual(90);
      }
    }
    for (const chord of def.chords) {
      for (const n of parsePattern(def.bass).notes) {
        expect(chordTone(def.root - 12, def.scale, chord, n.value)).toBeGreaterThanOrEqual(28);
      }
    }
  });

  it('has sane mix levels', () => {
    for (const level of Object.values(def.levels)) {
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    }
    expect(def.bpm).toBeGreaterThan(40);
    expect(def.bpm).toBeLessThan(200);
  });
});
