import type { Mood } from '../audio/moods';
import type { Sfx, Sting } from '../audio/sfx';

export interface Page {
  /** File name inside the book's folder in public/books/<id>/. */
  image: string;
  /** Short description of the picture for screen readers (and later, read-aloud). */
  alt: string;
  /** Paragraphs. A "\n" inside a paragraph is a line break. */
  text: string[];
  /** Music for this page. Consecutive pages with the same mood keep playing without a change. */
  mood: Mood;
  /** Sound when the picture is tapped. Defaults to a chime. */
  sfx?: Sfx;
  /** Short musical hit when the page is first reached. */
  sting?: Sting;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  cover: string;
  /** Description of the cover picture. */
  coverAlt: string;
  /** Background color for the cover tile. */
  coverColor: string;
  coverMood: Mood;
  credit: string;
  pages: Page[];
}
