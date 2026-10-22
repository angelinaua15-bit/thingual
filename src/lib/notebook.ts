import { CONCEPTS, fullWord, labelOf, type Concept } from '../data/concepts';
import { coverFor } from '../data/photos';
import { isEmojiUrl } from '../data/emoji';
import type { LangCode } from '../data/languages';
import type { NoteInput } from '../store/useApp';

/**
 * My vocabulary works offline, without AI: when the learner types a word we already know
 * (in any of the 16 languages, with or without an article), we offer to fill in the
 * translation, example, transcription and a picture from the built-in dictionary.
 */
const ARTICLES = /^(the|a|an|to|el|la|los|las|le|les|l’|l'|der|die|das|den|dem|il|lo|gli|i|o|os|as|un|una|une|ein|eine)\s+/;
export const normWord = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '’').trim().replace(ARTICLES, '').replace(/^l’/, '').trim();

let index: Map<string, Concept[]> | null = null;
function getIndex() {
  if (index) return index;
  index = new Map();
  for (const c of CONCEPTS) {
    for (const l of Object.values(c.labels)) {
      for (const v of [l.word, l.roman].filter(Boolean) as string[]) {
        const k = normWord(v);
        if (!k) continue;
        const list = index.get(k) ?? [];
        if (!list.includes(c)) list.push(c);
        index.set(k, list);
      }
    }
  }
  return index;
}

/** Built-in words that match what the learner typed: exact matches first, then words starting with it. */
export function lookupWord(text: string, limit = 4): Concept[] {
  const q = normWord(text);
  if (q.length < 2) return [];
  const idx = getIndex();
  const out: Concept[] = [...(idx.get(q) ?? [])];
  if (out.length < limit && q.length >= 3) {
    for (const [k, list] of idx) {
      if (out.length >= limit) break;
      if (k !== q && k.startsWith(q)) list.forEach((c) => !out.includes(c) && out.length < limit && out.push(c));
    }
  }
  return out.slice(0, limit);
}

/** What a built-in word can fill in for the learner's card. */
export function fromConcept(c: Concept, target: LangCode, native: LangCode): Partial<NoteInput> {
  const cover = coverFor(c.id, 600);
  const ex = c.examples as Partial<Record<LangCode, string>>;
  return {
    word: fullWord(c.id, target),
    translation: labelOf(c.id, native)?.word ?? '',
    ipa: target === 'en' ? c.ipa : undefined,
    roman: labelOf(c.id, target)?.roman ?? null,
    example: ex[target] || undefined,
    exampleTr: ex[target] ? ex[native] || undefined : undefined,
    emoji: c.emoji,
    photo: cover && !isEmojiUrl(cover) ? cover : undefined,
    conceptId: c.id,
  };
}

/** Pictures to choose from when the word has no photo. */
export const PICK_EMOJI = ['💡', '❤️', '🌈', '⭐', '🔥', '🌊', '🌱', '🌙', '☀️', '🎯', '🧠', '💬', '🎵', '🏠', '✈️', '🍀', '🕊️', '⏳', '🎨', '📚', '💪', '🤝', '😊', '😢', '😡', '😮', '🤔', '🙏', '🎉', '🔑', '🧩', '⚖️'];
