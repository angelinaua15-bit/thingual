import type { RawWord } from './types';
import { WORDS as FOOD } from './food';
import { WORDS as ANIMALS } from './animals';
import { WORDS as HOME } from './home';
import { WORDS as CLOTHES } from './clothes';
import { WORDS as CITY } from './city';
import { WORDS as SCHOOL } from './school';

/** Extended vocabulary by topic. On a duplicate id the first entry wins. */
const seen = new Set<string>();
export const WORDS: RawWord[] = [...FOOD, ...ANIMALS, ...HOME, ...CLOTHES, ...CITY, ...SCHOOL].filter(([id]) => (seen.has(id) ? false : (seen.add(id), true)));
