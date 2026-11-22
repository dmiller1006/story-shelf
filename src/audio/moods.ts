import type { ScaleName } from './theory';

export const MOODS = ['cozy', 'playful', 'sneaky', 'chase', 'sad', 'sleepy'] as const;
export type Mood = (typeof MOODS)[number];

export type MelodyVoice = 'musicBox' | 'pluck' | 'flute' | 'bell';
export type BassVoice = 'pizz' | 'soft';

/**
 * One looping piece of music. Each bar has 16 steps (sixteenth notes).
 *
 * - chords: scale degree of the chord for each bar (0 = I, 3 = IV, 4 = V, 5 = vi)
 * - melody: one pattern per bar, values are scale degrees above the tonic
 * - bass / arp: one pattern used for every bar, values are chord-tone indices
 *   (0 root, 1 third, 2 fifth, 3 octave)
 * - The melody can be longer than the chord loop; chords repeat to match.
 */
export interface MoodDef {
  label: string;
  bpm: number;
  /** MIDI note of the tonic in the pad's octave. */
  root: number;
  scale: ScaleName;
  chords: number[];
  melody: string[];
  melodyVoice: MelodyVoice;
  bass: string;
  bassVoice: BassVoice;
  arp?: string;
  hat?: string;
  drum?: string;
  pad: boolean;
  levels: { pad: number; bass: number; arp: number; melody: number; perc: number };
  /** Seconds for this mood to fade in when it starts. */
  fadeIn: number;
}

export const MOOD_DEFS: Record<Mood, MoodDef> = {
  cozy: {
    label: 'Cozy',
    bpm: 78,
    root: 53, // F3
    scale: 'major',
    chords: [0, 5, 3, 4],
    melody: [
      '4 - - - 2 - - - 4 - 5 - 4 - - -',
      '5 - - - 4 - - - 2 - - - 0 - - -',
      '3 - - - 5 - - - 7 - - - 5 - - -',
      '4 - - - - - - - 1 - 2 - 1 - - -',
      '7 - - - 6 - - - 4 - - - 2 - - -',
      '2 - 1 - 2 - - - 5 - - - 4 - - -',
      '3 - - - 2 - - - 1 - - - 0 - - -',
      '1 - - - - - - - . . . . . . . .',
    ],
    melodyVoice: 'musicBox',
    bass: '0 - - - - - - - 2 - - - - - - -',
    bassVoice: 'soft',
    arp: '0 . . . 1 . . . 2 . . . 1 . . .',
    pad: true,
    levels: { pad: 0.2, bass: 0.4, arp: 0.18, melody: 0.5, perc: 0 },
    fadeIn: 3,
  },
  playful: {
    label: 'Playful',
    bpm: 116,
    root: 55, // G3
    scale: 'major',
    chords: [0, 3, 4, 0],
    melody: [
      '0 . 2 . 4 . 2 . 4 - 5 . 4 . 2 .',
      '3 . 5 . 7 - - . 5 . 3 . 5 - - .',
      '4 . 6 . 8 . 6 . 4 . 3 . 2 . 1 .',
      '0 - - . 4 - - . 7 - - - . . . .',
      '4 . 4 . 5 . 4 . 2 . 2 . 4 - - .',
      '5 . 5 . 6 . 5 . 3 . 3 . 5 - - .',
      '6 . 5 . 4 . 3 . 1 . 2 . 3 . 4 .',
      '7 - - . 4 - - . 0 - - - . . . .',
    ],
    melodyVoice: 'pluck',
    bass: '0 . . . 2 . . . 0 . . . 2 . 1 .',
    bassVoice: 'pizz',
    hat: '. . x . . . x . . . x . . . x x',
    pad: true,
    levels: { pad: 0.22, bass: 0.6, arp: 0, melody: 0.5, perc: 0.22 },
    fadeIn: 2.5,
  },
  sneaky: {
    label: 'Sneaky',
    bpm: 92,
    root: 50, // D3
    scale: 'harmonicMinor',
    chords: [0, 0, 5, 4],
    melody: [
      '. . . . . . . . 4 . 5 . 4 . . .',
      '. . . . . . . . 4 . 5 . 6 . 7 .',
      '. . . . 5 . . . 4 . . . 2 . . .',
      '1 . . . 6 . . . 4 - - - . . . .',
    ],
    melodyVoice: 'bell',
    bass: '0 . . . 2 . . . 3 . . . 2 . . .',
    bassVoice: 'pizz',
    hat: '. . . . x . . . . . . . x . . .',
    pad: true,
    levels: { pad: 0.16, bass: 0.7, arp: 0, melody: 0.38, perc: 0.16 },
    fadeIn: 2,
  },
  chase: {
    label: 'Chase',
    bpm: 150,
    root: 45, // A2
    scale: 'minor',
    chords: [0, 5, 6, 0],
    melody: [
      '4 . 4 . 3 . 2 . 4 . 4 . 3 . 2 .',
      '5 . 5 . 4 . 3 . 5 . 5 . 4 . 3 .',
      '6 . 6 . 5 . 4 . 6 . 7 . 8 . 6 .',
      '7 - - - 4 - - - 7 . 6 . 5 . 4 .',
    ],
    melodyVoice: 'pluck',
    bass: '0 . 0 0 3 . 0 0 0 . 0 0 3 . 0 0',
    bassVoice: 'pizz',
    hat: 'x . x x x . x x x . x x x . x x',
    drum: 'x . . . . . . . x . . . . . . .',
    pad: false,
    levels: { pad: 0, bass: 0.6, arp: 0, melody: 0.42, perc: 0.2 },
    fadeIn: 1.2,
  },
  sad: {
    label: 'Sad',
    bpm: 62,
    root: 52, // E3
    scale: 'harmonicMinor',
    chords: [0, 3, 5, 4],
    melody: [
      '4 - - - - - - - 3 - - - 2 - - -',
      '3 - - - - - - - 2 - - - 0 - - -',
      '2 - - - 4 - - - 7 - - - - - - -',
      '6 - - - - - - - 4 - - - - - - -',
    ],
    melodyVoice: 'flute',
    bass: '0 - - - - - - - - - - - - - - -',
    bassVoice: 'soft',
    arp: '0 . . . 1 . . . 2 . . . 3 . . .',
    pad: true,
    levels: { pad: 0.2, bass: 0.4, arp: 0.2, melody: 0.18, perc: 0 },
    fadeIn: 3,
  },
  sleepy: {
    label: 'Sleepy',
    bpm: 60,
    root: 53, // F3
    scale: 'major',
    chords: [0, 3, 0, 4],
    melody: [
      '4 - - - 4 - 2 - 4 - - - - - - -',
      '5 - - - 5 - 3 - 5 - - - - - - -',
      '4 - - - 7 - - - 6 - 5 - 4 - - -',
      '1 - - - 2 - 3 - 1 - - - - - - -',
      '4 - - - 4 - 2 - 4 - - - - - - -',
      '5 - - - 5 - 3 - 7 - - - - - - -',
      '6 - - - 4 - - - 2 - 3 - 4 - - -',
      '1 - - - - - - - 0 - - - - - - -',
    ],
    melodyVoice: 'musicBox',
    bass: '0 - - - - - - - 2 - - - - - - -',
    bassVoice: 'soft',
    pad: true,
    levels: { pad: 0.18, bass: 0.45, arp: 0, melody: 0.5, perc: 0 },
    fadeIn: 3.5,
  },
};
