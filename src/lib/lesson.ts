import { CONCEPTS, conceptById, fullWord, labelOf } from '../data/concepts';
import { exprById, exprTarget, exprMeaning } from '../data/expressions';
import type { LangCode } from '../data/languages';
import type { PathNode } from '../data/path';

/** One step of a lesson. Words are concept ids; phrases are expression ids. */
export type Exercise =
  | { t: 'pick'; word: string; options: string[]; isNew: boolean }
  | { t: 'meaning'; word: string; options: string[] }
  | { t: 'reverse'; word: string; options: string[] }
  | { t: 'listen'; word: string; options: string[] }
  | { t: 'match'; words: string[] }
  | { t: 'type'; word: string }
  | { t: 'build'; prompt: string; say: string; answer: string[]; tiles: string[]; listen?: boolean }
  | { t: 'phrase'; phrase: string; options: string[] };

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pickN = <T,>(xs: T[], n: number) => shuffle(xs).slice(0, n);

/** Lower-case, no punctuation — what we compare when checking answers. */
export const normalize = (s: string) =>
  s.toLowerCase().replace(/[.,!?¡¿;:"“”«»„()…。！？、，：；「」『』]/g, '').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
/** Same, also without accents (a missing accent is a typo, not a mistake). */
export const loose = (s: string) => normalize(s).normalize('NFD').replace(/[̀-ͯ]/g, '');

const NO_SPACES: LangCode[] = ['zh', 'ja'];
/** Split a sentence into word tiles. */
export function tokens(text: string, code: LangCode): string[] {
  const clean = text.replace(/[.,!?¡¿;:"“”«»„()…。！？、，：；「」『』]/g, ' ').trim();
  if (NO_SPACES.includes(code)) {
    const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string; isWordLike?: boolean }> } }).Segmenter;
    const raw = Seg
      ? [...new Seg(code, { granularity: 'word' }).segment(clean)].filter((x) => x.isWordLike !== false && x.segment.trim()).map((x) => x.segment.trim())
      : [...clean.replace(/\s+/g, '')];
    // single characters make a confusing puzzle: glue them into tiles of 2+ characters
    const out: string[] = [];
    raw.forEach((x) => (out.length && [...out[out.length - 1]].length < 2 ? (out[out.length - 1] += x) : out.push(x)));
    return out;
  }
  return clean.split(/\s+/).filter(Boolean);
}

/** Wrong options that look like the right one: same topic and level first. */
function distractors(id: string, target: LangCode, native: LangCode, n = 3) {
  const c = conceptById(id)!;
  const taken = new Set([labelOf(id, target)?.word, labelOf(id, native)?.word]);
  const ok = (x: (typeof CONCEPTS)[number]) => {
    const a = x.labels[target]?.word;
    const b = x.labels[native]?.word;
    if (!a || !b || taken.has(a) || taken.has(b)) return false;
    return true;
  };
  const tiers = [
    CONCEPTS.filter((x) => x.id !== id && x.topic === c.topic && x.level === c.level),
    CONCEPTS.filter((x) => x.id !== id && x.topic === c.topic),
    CONCEPTS.filter((x) => x.id !== id && x.level === c.level),
  ];
  const out: string[] = [];
  for (const tier of tiers) {
    for (const x of shuffle(tier)) {
      if (out.length >= n) break;
      if (!ok(x)) continue;
      out.push(x.id);
      taken.add(x.labels[target].word);
      taken.add(x.labels[native].word);
    }
  }
  return out;
}
const options = (id: string, target: LangCode, native: LangCode) => shuffle([id, ...distractors(id, target, native)]);

/** Extra tiles for the word bank, taken from other sentences in the same language. */
function extraTiles(answer: string[], pool: string[], n: number) {
  const have = new Set(answer.map(normalize));
  const out: string[] = [];
  for (const w of shuffle(pool)) {
    if (out.length >= n) break;
    if (!have.has(normalize(w))) { out.push(w); have.add(normalize(w)); }
  }
  return out;
}

type Ctx = { target: LangCode; native: LangCode; female?: boolean; known: Set<string> };

function phraseBuild(id: string, ctx: Ctx, pool: string[], listen = false): Exercise | null {
  const e = exprById(id);
  if (!e) return null;
  const text = exprTarget(e, ctx.target, ctx.female).text;
  const answer = tokens(text, ctx.target);
  if (answer.length < 2 || answer.length > 12) return null;
  return { t: 'build', prompt: exprMeaning(e, ctx.native, ctx.female), say: text, answer, tiles: shuffle([...answer, ...extraTiles(answer, pool, Math.min(4, Math.max(2, 10 - answer.length)))]), listen };
}

function exampleBuild(id: string, ctx: Ctx, pool: string[]): Exercise | null {
  const c = conceptById(id);
  const ex = c?.examples as Partial<Record<LangCode, string>> | undefined;
  const text = ex?.[ctx.target];
  const prompt = ex?.[ctx.native] ?? (ctx.native !== 'en' ? undefined : ex?.en);
  if (!text || !prompt) return null;
  const answer = tokens(text, ctx.target);
  if (answer.length < 2 || answer.length > 10) return null;
  return { t: 'build', prompt, say: text, answer, tiles: shuffle([...answer, ...extraTiles(answer, pool, 3)]) };
}

/** Example sentences in the target language, cut into words — material for extra tiles. */
function tilePool(ctx: Ctx, words: string[], phrases: string[]) {
  const texts = [
    ...phrases.map((p) => exprById(p)).filter(Boolean).map((e) => exprTarget(e!, ctx.target, ctx.female).text),
    ...words.map((w) => (conceptById(w)?.examples as Partial<Record<LangCode, string>> | undefined)?.[ctx.target]).filter(Boolean) as string[],
  ];
  return texts.flatMap((t) => tokens(t, ctx.target));
}

/** Builds a lesson of ~10–14 steps for a path node. */
export function makeLesson(node: PathNode, target: LangCode, native: LangCode, opts: { female?: boolean; known?: string[] } = {}): Exercise[] {
  const ctx: Ctx = { target, native, female: opts.female, known: new Set(opts.known ?? []) };
  const pool = tilePool(ctx, node.words, node.phrases);
  const out: Exercise[] = [];
  const push = (e: Exercise | null) => e && out.push(e);

  if (node.kind === 'phrases') {
    const ids = node.phrases;
    ids.forEach((id, i) => {
      // first see it with its meaning, then build it, later build it by ear
      push({ t: 'phrase', phrase: id, options: shuffle([id, ...pickN(ids.filter((x) => x !== id), 2)]) });
      push(phraseBuild(id, ctx, pool, i % 2 === 1));
    });
    return out.slice(0, 12);
  }

  if (node.kind === 'review') {
    const ws = pickN(node.words, 8);
    ws.forEach((w, i) => push(i % 4 === 0 ? { t: 'type', word: w } : i % 4 === 1 ? { t: 'listen', word: w, options: options(w, target, native) } : i % 4 === 2 ? { t: 'reverse', word: w, options: options(w, target, native) } : { t: 'meaning', word: w, options: options(w, target, native) }));
    push({ t: 'match', words: pickN(node.words, 5) });
    pickN(node.phrases, 2).forEach((p) => push(phraseBuild(p, ctx, pool, true)));
    pickN(node.words, 3).map((w) => exampleBuild(w, ctx, pool)).filter(Boolean).slice(0, 2).forEach(push);
    return shuffle(out).slice(0, 14);
  }

  // a lesson of new words: meet each one by its picture, then use it in different ways
  const ws = node.words;
  ws.forEach((w) => push({ t: 'pick', word: w, options: options(w, target, native), isNew: !ctx.known.has(w) }));
  const steps: Exercise[] = [];
  ws.forEach((w, i) => {
    steps.push(i % 3 === 0 ? { t: 'meaning', word: w, options: options(w, target, native) } : i % 3 === 1 ? { t: 'listen', word: w, options: options(w, target, native) } : { t: 'reverse', word: w, options: options(w, target, native) });
  });
  // new-word pictures come in pairs, then practice, so it never feels like a list
  const mixed: Exercise[] = [];
  out.forEach((e, i) => {
    mixed.push(e);
    if (i % 2 === 1 && steps.length) mixed.push(steps.shift()!);
  });
  mixed.push(...steps);
  // the lesson ends with pairs, a sentence and typing — keep it around 15 steps
  const tail: Exercise[] = [];
  if (ws.length >= 4) tail.push({ t: 'match', words: pickN(ws, Math.min(5, ws.length)) });
  const b = pickN(ws, 4).map((w) => exampleBuild(w, ctx, pool)).find(Boolean);
  if (b) tail.push(b);
  tail.push({ t: 'type', word: pickN(ws, 1)[0] });
  return [...mixed.slice(0, 16 - tail.length), ...tail];
}

/** What counts as the right answer for "type the word". */
export function typedOk(input: string, id: string, target: LangCode): 'ok' | 'typo' | 'wrong' {
  const l = labelOf(id, target);
  if (!l) return 'wrong';
  const forms = [l.word, fullWord(id, target), l.roman].filter(Boolean) as string[];
  if (forms.some((f) => normalize(f) === normalize(input))) return 'ok';
  if (forms.some((f) => loose(f) === loose(input))) return 'typo';
  return 'wrong';
}

export const builtOk = (picked: string[], answer: string[]) => picked.map(normalize).join(' ') === answer.map(normalize).join(' ');
