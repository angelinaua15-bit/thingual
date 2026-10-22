import { supabase } from './supabase';
import { ensureSession } from './api';
import { hasQuota, spendQuota } from './premium';
import type { LangCode } from '../data/languages';

export type WordAI = { word: string; translation: string; ipa: string; roman: string | null; pos: string; association: string; example: string; exampleTr: string; emoji: string };
export type WordAIError = 'limit' | 'offline' | 'unknown' | 'no_key' | 'service';

/**
 * AI help for a word the learner wrote: translation, IPA transcription, an association that makes it stick,
 * an example and an emoji. Runs in the Supabase Edge Function `word` (key stays on the server).
 */
export async function enrichWord(input: { word: string; target: LangCode; native: LangCode; translation?: string; level?: string }): Promise<{ ok: true; data: WordAI } | { ok: false; error: WordAIError }> {
  if (!hasQuota('word')) return { ok: false, error: 'limit' };
  try {
    await ensureSession();
    const { data, error } = await supabase.functions.invoke('word', { body: input });
    if (error || !data) return { ok: false, error: 'offline' };
    const d = data as Partial<WordAI> & { error?: string };
    if (d.error === 'no_key') return { ok: false, error: 'no_key' };
    // the server answered but the AI provider refused (key, balance, model) — not the user's connection
    if (d.error) return { ok: false, error: d.error === 'unknown' ? 'unknown' : 'service' };
    spendQuota('word');
    return { ok: true, data: d as WordAI };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

