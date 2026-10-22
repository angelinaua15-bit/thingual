export type GrammarExercise =
  | { type: 'choice'; q: string; options: string[]; answer: number; uk?: string }
  | { type: 'gap'; q: string; answer: string; alt?: string[]; hint?: string; uk?: string };

export type GrammarLesson = {
  id: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  emoji: string;
  title: { uk: string; en: string };
  /** short explanation paragraphs (Ukrainian / English) */
  explain: { uk: string[]; en: string[] };
  /** pattern table rows, e.g. ["I/you/we/they", "work"], ["he/she/it", "works"] */
  table?: string[][];
  examples: { en: string; uk: string }[];
  exercises: GrammarExercise[];
};
