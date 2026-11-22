import { benjaminBunny } from './benjamin-bunny';
import { jemimaPuddleDuck } from './jemima-puddle-duck';
import { jeremyFisher } from './jeremy-fisher';
import { peterRabbit } from './peter-rabbit';
import type { Book } from './types';

export const BOOKS: Book[] = [peterRabbit, benjaminBunny, jemimaPuddleDuck, jeremyFisher];

export function findBook(id: string): Book | undefined {
  return BOOKS.find((b) => b.id === id);
}

export function imageUrl(book: Book, file: string): string {
  return `./books/${book.id}/${file}`;
}
