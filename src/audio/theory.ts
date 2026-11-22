// Small music-theory helpers. Everything here is pure so it can be unit tested.

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
} as const;

export type ScaleName = keyof typeof SCALES;

/** MIDI note for a 0-based scale degree. Degrees past 6 or below 0 wrap octaves. */
export function degreeToMidi(root: number, scale: ScaleName, degree: number): number {
  const steps = SCALES[scale];
  const octave = Math.floor(degree / steps.length);
  const index = ((degree % steps.length) + steps.length) % steps.length;
  return root + octave * 12 + steps[index];
}

/** Triad on a scale degree as scale degrees: root, third, fifth. */
export function triadDegrees(degree: number): [number, number, number] {
  return [degree, degree + 2, degree + 4];
}

/**
 * MIDI note for a chord tone. Index 0 = root, 1 = third, 2 = fifth,
 * 3 = root an octave up, and so on.
 */
export function chordTone(root: number, scale: ScaleName, chordDegree: number, index: number): number {
  const octave = Math.floor(index / 3);
  const tone = ((index % 3) + 3) % 3;
  return degreeToMidi(root, scale, chordDegree + tone * 2) + octave * 12;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface PatternNote {
  /** Step the note starts on, 0-based. */
  step: number;
  /** Length in steps, including held steps. */
  length: number;
  /** Number from the pattern (degree or chord-tone index). */
  value: number;
}

/**
 * Parses a step pattern. Tokens are separated by spaces:
 *   a number  starts a note
 *   -         holds the previous note one more step
 *   .         rest
 * Example: "0 - - . 2 . 4 -" is a 3-step note, a rest, a 1-step note, a 2-step note.
 */
export function parsePattern(pattern: string): { steps: number; notes: PatternNote[] } {
  const tokens = pattern.trim().split(/\s+/);
  const notes: PatternNote[] = [];
  let current: PatternNote | null = null;
  tokens.forEach((token, step) => {
    if (token === '-') {
      if (current) current.length += 1;
      return;
    }
    current = null;
    if (token === '.') return;
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error(`Bad pattern token "${token}" in "${pattern}"`);
    current = { step, length: 1, value };
    notes.push(current);
  });
  return { steps: tokens.length, notes };
}

/** Parses a drum pattern where "x" is a hit and "." is a rest. */
export function parseHits(pattern: string): { steps: number; hits: number[] } {
  const tokens = pattern.trim().split(/\s+/);
  const hits: number[] = [];
  tokens.forEach((token, step) => {
    if (token === 'x') hits.push(step);
    else if (token !== '.') throw new Error(`Bad hit token "${token}" in "${pattern}"`);
  });
  return { steps: tokens.length, hits };
}
