import { CONCEPTS, CEFR_LEVELS, TOPICS, TOPIC_EMOJI, type CEFR, type Topic } from './concepts';
import { EXPRESSIONS, SITUATIONS, SITUATION_EMOJI } from './expressions';

/**
 * The learning path: units from A1 to C2, each a short run of lessons on one theme.
 * It is the same for every target language — all words and phrases exist in all 16 languages.
 */
export type NodeKind = 'lesson' | 'phrases' | 'chest' | 'review';
export type PathNode = { id: string; kind: NodeKind; unit: number; words: string[]; phrases: string[] };
export type Unit = {
  n: number;
  level: CEFR;
  topic?: Topic;
  /** second, third… unit of the same topic at the same level */
  part: number;
  situation?: string;
  emoji: string;
  color: string;
  nodes: PathNode[];
};

export const UNIT_COLORS = ['#2FB574', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6', '#EF6C3B', '#6366F1'];
const WORDS_PER_LESSON = 6;
const MAX_WORDS_PER_UNIT = 24;
const PHRASES_PER_NODE = 5;
/** phrase lessons go into the units of these levels */
const PHRASE_LEVELS: CEFR[] = ['A1', 'A2', 'B1'];

const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** old position-based ids ("u3-2") → stable ids, for progress saved by earlier versions */
const LEGACY = new Map<string, string>();

function build(): Unit[] {
  const units: Unit[] = [];
  // phrases are handed out situation by situation, in phrasebook order
  const phraseQueue = SITUATIONS.flatMap((s) => {
    const parts = chunk(EXPRESSIONS.filter((e) => e.kind === 'phrase' && e.group === s).map((e) => e.id), PHRASES_PER_NODE);
    // a last chunk of one or two phrases joins the one before it
    if (parts.length > 1 && parts[parts.length - 1].length < 3) parts[parts.length - 2].push(...parts.pop()!);
    return parts.map((ids) => ({ s, ids }));
  });
  let pq = 0;

  CEFR_LEVELS.forEach((level) => {
    const groups: { topic?: Topic; words: string[] }[] = [];
    const leftovers: string[] = [];
    TOPICS.forEach((topic) => {
      const ids = CONCEPTS.filter((c) => c.level === level && c.topic === topic).map((c) => c.id);
      if (ids.length >= 5) chunk(ids, MAX_WORDS_PER_UNIT).forEach((part) => (part.length >= 5 ? groups.push({ topic, words: part }) : leftovers.push(...part)));
      else leftovers.push(...ids);
    });
    // small topics of this level go together into "mixed" units
    chunk(leftovers, MAX_WORDS_PER_UNIT).forEach((words) => {
      // too few for a unit of its own: add them to the last unit of this level
      if (words.length < 5 && groups.length) groups[groups.length - 1].words.push(...words);
      else if (words.length) groups.push({ words });
    });

    const seen: Partial<Record<string, number>> = {};
    groups.forEach((g) => {
      const n = units.length;
      const key = g.topic ?? 'mix';
      seen[key] = (seen[key] ?? 0) + 1;
      const lessons = chunk(g.words, WORDS_PER_LESSON);
      // a tiny last lesson joins the one before it
      if (lessons.length > 1 && lessons[lessons.length - 1].length < 4) lessons[lessons.length - 2].push(...lessons.pop()!);
      const phrase = PHRASE_LEVELS.includes(level) && pq < phraseQueue.length ? phraseQueue[pq++] : undefined;
      const nodes: PathNode[] = [];
      // ids come from the content (first word / phrase / the unit itself), so adding units later never shifts progress
      const unitKey = `${level}-${key}-${seen[key]}`;
      const node = (kind: NodeKind, words: string[] = [], phrases: string[] = []) => {
        const id = kind === 'lesson' ? `l:${words[0]}` : kind === 'phrases' ? `p:${phrases[0].replace(/^ph:/, '')}` : `${kind === 'chest' ? 'c' : 'r'}:${unitKey}`;
        LEGACY.set(`u${n}-${nodes.length}`, id);
        nodes.push({ id, kind, unit: n, words, phrases });
      };
      lessons.forEach((w, i) => {
        node('lesson', w);
        if (i === 1 && phrase) node('phrases', [], phrase.ids);
        if (i === 1) node('chest');
      });
      if (lessons.length < 2 && phrase) node('phrases', [], phrase.ids);
      if (lessons.length < 2) node('chest');
      node('review', g.words, phrase?.ids ?? []);
      units.push({
        n,
        level,
        topic: g.topic,
        part: seen[key]!,
        situation: phrase?.s,
        emoji: g.topic ? TOPIC_EMOJI[g.topic][1] : phrase ? SITUATION_EMOJI[phrase.s] ?? '✨' : '✨',
        color: UNIT_COLORS[n % UNIT_COLORS.length],
        nodes,
      });
    });
  });
  return units;
}

export const UNITS: Unit[] = build();
export const NODES: PathNode[] = UNITS.flatMap((u) => u.nodes);
const BY_ID = new Map(NODES.map((x, i) => [x.id, i]));
export const stableId = (id: string) => LEGACY.get(id) ?? id;
export const nodeIndex = (id: string) => BY_ID.get(stableId(id)) ?? -1;
/** "lang:u3-2" keys from older versions → "lang:l:apple" */
export function migratePathKeys(path: Record<string, number> = {}) {
  const out: Record<string, number> = {};
  Object.entries(path).forEach(([k, v]) => {
    const i = k.indexOf(':');
    const key = i > 0 && /^u\d+-\d+$/.test(k.slice(i + 1)) ? `${k.slice(0, i)}:${stableId(k.slice(i + 1))}` : k;
    out[key] = Math.max(out[key] ?? 0, v);
  });
  return out;
}
export const nodeById = (id: string) => NODES[nodeIndex(id)];
/** first node of the section for a CEFR level (learners start at their own level) */
export const sectionStart = (level: CEFR) => {
  const u = UNITS.find((x) => x.level === level);
  return u ? nodeIndex(u.nodes[0].id) : 0;
};

/**
 * Where the learner is: nodes before their level are open to revisit, the first unfinished
 * node from their level on is "current", everything after it is locked.
 */
export function pathState(done: Record<string, number>, lang: string, level: CEFR) {
  const start = sectionStart(level);
  let current = NODES.length;
  for (let i = start; i < NODES.length; i++) {
    if (!done[`${lang}:${NODES[i].id}`]) { current = i; break; }
  }
  const status = (i: number): 'done' | 'current' | 'open' | 'locked' =>
    done[`${lang}:${NODES[i].id}`] ? 'done' : i === current ? 'current' : i < start ? 'open' : i < current ? 'open' : 'locked';
  return { start, current, status };
}
