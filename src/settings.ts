export type TextSize = 'M' | 'L' | 'XL';
export type Theme = 'paper' | 'night';

export interface Settings {
  music: boolean;
  volume: number;
  sfx: boolean;
  textSize: TextSize;
  theme: Theme;
  debug: boolean;
}

export const DEFAULTS: Settings = {
  music: true,
  volume: 0.7,
  sfx: true,
  textSize: 'L',
  theme: 'paper',
  debug: false,
};

const KEY = 'story-shelf.settings';
const PROGRESS = 'story-shelf.progress.';

// Storage can be missing or throw (private mode, blocked site data). The app
// works without it; it just won't remember anything.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function loadSettings(): Settings {
  try {
    const raw = read(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings) {
  write(KEY, JSON.stringify(settings));
}

/** Saved page index for a book, or 0. */
export function loadProgress(bookId: string): number {
  const n = Number(read(PROGRESS + bookId));
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function saveProgress(bookId: string, pageIndex: number) {
  write(PROGRESS + bookId, String(pageIndex));
}
