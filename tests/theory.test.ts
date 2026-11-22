import { describe, expect, it } from 'vitest';
import { chordTone, degreeToMidi, midiToFreq, parseHits, parsePattern } from '../src/audio/theory';

describe('degreeToMidi', () => {
  it('walks a major scale and wraps octaves', () => {
    const c4 = 60;
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((d) => degreeToMidi(c4, 'major', d))).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
    expect(degreeToMidi(c4, 'major', -1)).toBe(59);
    expect(degreeToMidi(c4, 'major', 14)).toBe(84);
  });

  it('raises the seventh in harmonic minor', () => {
    expect(degreeToMidi(57, 'harmonicMinor', 6)).toBe(68); // G# in A minor
    expect(degreeToMidi(57, 'minor', 6)).toBe(67);
  });
});

describe('chordTone', () => {
  it('builds triads and octaves on scale degrees', () => {
    const f3 = 53;
    // IV chord in F major is Bb D F.
    expect([0, 1, 2, 3].map((i) => chordTone(f3, 'major', 3, i))).toEqual([58, 62, 65, 70]);
    // V in D harmonic minor is A C# E.
    expect([0, 1, 2].map((i) => chordTone(50, 'harmonicMinor', 4, i))).toEqual([57, 61, 64]);
  });
});

describe('patterns', () => {
  it('reads notes, holds and rests', () => {
    const { steps, notes } = parsePattern('0 - - . 2 . 4 -');
    expect(steps).toBe(8);
    expect(notes).toEqual([
      { step: 0, length: 3, value: 0 },
      { step: 4, length: 1, value: 2 },
      { step: 6, length: 2, value: 4 },
    ]);
  });

  it('does not let a hold continue past a rest', () => {
    expect(parsePattern('1 . - -').notes).toEqual([{ step: 0, length: 1, value: 1 }]);
  });

  it('rejects junk', () => {
    expect(() => parsePattern('0 x 1')).toThrow();
    expect(() => parseHits('x . 1')).toThrow();
  });

  it('reads drum hits', () => {
    expect(parseHits('x . . x')).toEqual({ steps: 4, hits: [0, 3] });
  });
});

it('tunes A4 to 440 Hz', () => {
  expect(midiToFreq(69)).toBe(440);
  expect(midiToFreq(81)).toBeCloseTo(880);
});
