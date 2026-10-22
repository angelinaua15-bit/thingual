import { PHRASES as B1 } from './book1';
import { PHRASES as B2 } from './book2';
import { PHRASES as B3 } from './book3';
import { PHRASES as B4 } from './book4';
import { PHRASAL as P1 } from './phrasal1';
import { PHRASAL as P2 } from './phrasal2';
import { IDIOMS as IDIOMS_BASE } from './idioms';
import { COLLOCATIONS as COLL_BASE } from './collocations';
import { IDIOMS_ADV, PHRASAL_ADV, COLLOCATIONS_ADV } from './advanced';

export const PHRASES = [...B1, ...B2, ...B3, ...B4];
export const PHRASAL = [...P1, ...P2, ...PHRASAL_ADV];
/** C1–C2 items come last, so Free (the first items of each list) keeps the everyday ones */
export const COLLOCATIONS = [...COLL_BASE, ...COLLOCATIONS_ADV];
export const IDIOMS = [...IDIOMS_BASE, ...IDIOMS_ADV];
