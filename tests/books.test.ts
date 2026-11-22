import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOODS } from '../src/audio/moods';
import { SFX, STINGS } from '../src/audio/sfx';
import { BOOKS } from '../src/books';

const publicDir = join(import.meta.dirname, '..', 'public');

describe.each(BOOKS.map((b) => [b.id, b] as const))('book %s', (_id, book) => {
  it('has a cover image', () => {
    expect(existsSync(join(publicDir, 'books', book.id, book.cover))).toBe(true);
    expect(book.coverAlt.length).toBeGreaterThan(10);
  });

  it('has valid pages', () => {
    expect(book.pages.length).toBeGreaterThan(0);
    book.pages.forEach((page, i) => {
      const where = `page ${i + 1}`;
      expect(existsSync(join(publicDir, 'books', book.id, page.image)), `${where} image`).toBe(true);
      expect(page.alt.length, `${where} alt`).toBeGreaterThan(10);
      expect(page.text.join('').trim().length, `${where} text`).toBeGreaterThan(0);
      expect(MOODS, `${where} mood`).toContain(page.mood);
      if (page.sfx) expect(SFX, `${where} sfx`).toContain(page.sfx);
      if (page.sting) expect(STINGS, `${where} sting`).toContain(page.sting);
    });
  });

  it('uses each picture once', () => {
    const images = book.pages.map((p) => p.image);
    expect(new Set(images).size).toBe(images.length);
  });
});

it('Peter Rabbit has the whole story in order', () => {
  const peter = BOOKS.find((b) => b.id === 'peter-rabbit')!;
  const all = peter.pages.flatMap((p) => p.text).join(' ');
  expect(all.startsWith('Once upon a time there were four little Rabbits')).toBe(true);
  expect(all).toContain("'Stop thief!'");
  expect(all).toContain('Kertyschoo');
  expect(all.endsWith('blackberries for supper.')).toBe(true);
  expect(peter.pages).toHaveLength(27);
});

it('has the other Potter books, complete', () => {
  const ends: Record<string, [string, string]> = {
    'benjamin-bunny': ['One morning a little rabbit sat on a bank.', 'with the bunches of herbs and the rabbit-tobacco.'],
    'jemima-puddle-duck': ['What a funny sight it is to see a brood of ducklings with a hen!', 'she had always been a bad sitter.'],
    'jeremy-fisher': ['Once upon a time there was a frog called Mr. Jeremy Fisher;', 'but I think it must have been nasty!'],
  };
  for (const [id, [first, last]] of Object.entries(ends)) {
    const book = BOOKS.find((b) => b.id === id)!;
    const all = book.pages.flatMap((p) => p.text).join(' ');
    expect(all.startsWith(first), id).toBe(true);
    expect(all.endsWith(last), id).toBe(true);
    expect(all, id).not.toMatch(/\n|Gutenberg|THE END/);
  }
});
