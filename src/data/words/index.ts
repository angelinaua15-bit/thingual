import type { RawWord } from './types';
import { WORDS as FOOD } from './food';
import { WORDS as ANIMALS } from './animals';
import { WORDS as HOME } from './home';
import { WORDS as CLOTHES } from './clothes';
import { WORDS as CITY } from './city';
import { WORDS as SCHOOL } from './school';
import { WORDS as PEOPLE } from './people';
import { WORDS as JOBS } from './jobs';
import { WORDS as TIME } from './time';
import { WORDS as COLORS } from './colors';
import { WORDS as QUALITIES } from './qualities';
import { WORDS as ACTIONS } from './actions';
import { WORDS as FEELINGS } from './feelings';
import { WORDS as WORK } from './work';
import { WORDS as SOCIETY } from './society';
import { WORDS as IDEAS } from './ideas';


/** Extended vocabulary by topic. On a duplicate id the first entry wins. */
const seen = new Set<string>();
export const WORDS: RawWord[] = [...FOOD, ...ANIMALS, ...HOME, ...CLOTHES, ...CITY, ...SCHOOL, ...PEOPLE, ...JOBS, ...TIME, ...COLORS, ...QUALITIES, ...ACTIONS, ...FEELINGS, ...WORK, ...SOCIETY, ...IDEAS].filter(([id]) => (seen.has(id) ? false : (seen.add(id), true)));
