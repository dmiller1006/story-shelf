import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRACKS, playlistFor } from '../src/audio/clips';
import { MOODS } from '../src/audio/moods';
import { BOOKS } from '../src/books';

const publicDir = join(import.meta.dirname, '..', 'public');

describe('music tracks', () => {
  it('have unique ids and usable licenses', () => {
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(TRACKS.length);
    for (const t of TRACKS) {
      expect(['Public domain', 'CC0', 'CC BY-SA 2.0'], t.id).toContain(t.license);
      expect(t.source, t.id).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      expect(t.url, t.id).not.toContain('?');
      if (t.start !== undefined && t.end !== undefined) expect(t.end, t.id).toBeGreaterThan(t.start + 20);
    }
  });

  it('give every mood at least two pieces', () => {
    for (const mood of MOODS) expect(playlistFor(mood).length, mood).toBeGreaterThanOrEqual(2);
  });

  it('are all encoded into public/music', () => {
    const missing = TRACKS.filter((t) => !existsSync(join(publicDir, 'music', `${t.id}.m4a`))).map((t) => t.id);
    expect(missing, 'run scripts/build-music.mjs').toEqual([]);
  });

  it('cover every track a page asks for', () => {
    const ids = new Set(TRACKS.map((t) => t.id));
    for (const book of BOOKS) {
      book.pages.forEach((p, i) => {
        if (p.track) expect(ids.has(p.track), `${book.id} page ${i + 1}: ${p.track}`).toBe(true);
      });
    }
  });
});
