/** Phrasebook entry: [id, situation, texts for 16 languages "text|romanization" separated by ";" in order en;uk;es;pt;de;fr;it;pl;tr;zh;ja;ko;ar;hi;id;vi] */
export type RawPhrase = [id: string, situation: string, texts: string];
/** English phrasal verb: [id, verb, level, Ukrainian meaning, English definition, example en, example uk] */
export type RawPhrasal = [id: string, verb: string, level: 'A2' | 'B1' | 'B2' | 'C1', uk: string, def: string, exEn: string, exUk: string];
/** English collocation: [id, group, collocation, level, Ukrainian translation, example en, example uk] */
export type RawCollocation = [id: string, group: string, text: string, level: 'A2' | 'B1' | 'B2' | 'C1', uk: string, exEn: string, exUk: string];
/** English idiom: [id, idiom, level, Ukrainian meaning or equivalent, English meaning, example en, example uk] */
export type RawIdiom = [id: string, idiom: string, level: 'B1' | 'B2' | 'C1', uk: string, def: string, exEn: string, exUk: string];
