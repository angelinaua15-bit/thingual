export type CEFR = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
/** [id, topic, emoji, ipa, labels "word|article|roman;…" (16 langs), examples "en|uk|es|de|fr", related ids, CEFR level] */
export type RawWord = [id: string, topic: string, emoji: string, ipa: string, labels: string, examples: string, related: string, level?: CEFR];
