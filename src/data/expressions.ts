import { LangCode } from './languages';
import { COLLOCATIONS, IDIOMS, PHRASAL, PHRASES } from './phrases';
import { FEMININE } from './phrases/feminine';

/**
 * Expressions beyond single objects:
 * - phrase: situational phrasebook, translated into all 16 languages
 * - phrasal / collocation / idiom: English material with Ukrainian and English explanations
 */
export type ExprKind = 'phrase' | 'phrasal' | 'collocation' | 'idiom';
export const EXPR_KINDS: ExprKind[] = ['phrase', 'phrasal', 'collocation', 'idiom'];

export type Expr = {
  id: string;
  kind: ExprKind;
  group: string;
  level?: string;
  /** phrase: text per language */
  texts?: Partial<Record<LangCode, { text: string; roman?: string }>>;
  /** English text (phrasal verb / collocation / idiom, or the English phrase) */
  en: string;
  uk?: string;
  def?: string;
  exEn?: string;
  exUk?: string;
};

const ORDER: LangCode[] = ['en', 'uk', 'es', 'pt', 'de', 'fr', 'it', 'pl', 'tr', 'zh', 'ja', 'ko', 'ar', 'hi', 'id', 'vi'];

const phrases: Expr[] = PHRASES.map(([id, situation, raw]) => {
  const parts = raw.split(';');
  const texts: Expr['texts'] = {};
  ORDER.forEach((code, i) => {
    const [text, roman] = (parts[i] ?? '').split('|');
    if (text) texts[code] = { text: text.trim(), roman: roman?.trim() || undefined };
  });
  return { id: `ph:${id}`, kind: 'phrase', group: situation, texts, en: texts.en?.text ?? id, uk: texts.uk?.text };
});
const phrasal: Expr[] = PHRASAL.map(([id, verb, level, uk, def, exEn, exUk]) => ({ id: `pv:${id}`, kind: 'phrasal', group: verb.split(' ')[0], level, en: verb, uk, def, exEn, exUk }));
const colls: Expr[] = COLLOCATIONS.map(([id, group, text, level, uk, exEn, exUk]) => ({ id: `co:${id}`, kind: 'collocation', group, level, en: text, uk, exEn, exUk }));
const idioms: Expr[] = IDIOMS.map(([id, idiom, level, uk, def, exEn, exUk]) => ({ id: `id:${id}`, kind: 'idiom', group: level, level, en: idiom, uk, def, exEn, exUk }));

const dedupe = (xs: Expr[]) => { const seen = new Set<string>(); return xs.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))); };
export const EXPRESSIONS: Expr[] = dedupe([...phrases, ...phrasal, ...colls, ...idioms]);
const BY_ID = new Map(EXPRESSIONS.map((e) => [e.id, e]));
export const exprById = (id: string) => BY_ID.get(id);
export const exprsOfKind = (k: ExprKind) => EXPRESSIONS.filter((e) => e.kind === k);
export const groupsOf = (k: ExprKind) => [...new Set(exprsOfKind(k).map((e) => e.group))];

export const SITUATIONS = ['basics', 'cafe', 'shopping', 'directions', 'transport', 'hotel', 'health', 'emergency', 'smalltalk', 'work', 'home', 'feelings'];
export const SITUATION_EMOJI: Record<string, string> = {
  basics: '👋', cafe: '☕', shopping: '🛍️', directions: '🧭', transport: '🚆', hotel: '🏨', health: '💊', emergency: '🚨', smalltalk: '💬', work: '💼', home: '🏠', feelings: '💛',
};
export const KIND_EMOJI: Record<ExprKind, string> = { phrase: '💬', phrasal: '🧩', collocation: '🔗', idiom: '🎭' };

/** What the learner should produce (front of the card is the meaning). */
/** Phrase text in a language, in the feminine form when the learner chose it. */
function phraseIn(e: Expr, code: LangCode, female?: boolean) {
  const f = female ? FEMININE[e.id.slice(3)]?.[code] : undefined;
  if (f) { const [text, roman] = f.split('|'); return { text, roman: roman || undefined }; }
  return e.texts?.[code];
}
export function exprTarget(e: Expr, target: LangCode, female?: boolean) {
  if (e.kind === 'phrase') return phraseIn(e, target, female) ?? e.texts?.en ?? { text: e.en };
  return { text: e.en };
}
/** Meaning shown to the learner in their own language. */
export function exprMeaning(e: Expr, native: LangCode, female?: boolean) {
  if (e.kind === 'phrase') return phraseIn(e, native, female)?.text ?? e.en;
  return native === 'uk' ? e.uk ?? e.def ?? '' : e.def ?? e.uk ?? '';
}
/** Speech language for the expression. */
export const exprLang = (e: Expr, target: LangCode): LangCode => (e.kind === 'phrase' ? target : 'en');
