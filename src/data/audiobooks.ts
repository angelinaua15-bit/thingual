import type { LangCode } from './languages';

/** Public-domain audiobooks recorded by LibriVox volunteers, hosted on the Internet Archive. */
export type Level = 'A2' | 'B1' | 'B2' | 'C1';
export type Book = { id: string; lang: LangCode; level: Level; title: string; author: string; mp3Format: string; chapters: number; minutes: number; about: { en: string; uk: string } };

export const LEVELS: Level[] = ['A2', 'B1', 'B2', 'C1'];

export const BOOKS: Book[] = [];

export const booksFor = (lang: LangCode) => BOOKS.filter((b) => b.lang === lang).sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.minutes - b.minutes);
export const bookById = (id: string) => BOOKS.find((b) => b.id === id);
