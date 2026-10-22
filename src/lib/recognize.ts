import { CONCEPTS } from '../data/concepts';
import { supabase } from './supabase';
import { ensureSession } from './api';
import { hasQuota, spendQuota } from './premium';

export type Recognition = {
  concept: string | null;
  confidence: number;
  alternatives: string[];
  source: 'server' | 'none' | 'limit';
};

/**
 * AI recognition runs in the Supabase Edge Function `recognize` (supabase/functions/recognize).
 * The Anthropic key lives only in Supabase → Edge Functions → Secrets (ANTHROPIC_API_KEY),
 * never in the app. If the secret is missing the function answers `no_key` and we fall back
 * to the word picker.
 */
let available = true;

export const backendConnected = () => available;

/**
 * Two-step recognition from the spec:
 * 1) instant on-device detection (dots in the viewfinder),
 * 2) the tapped crop is refined by a multimodal model on the server and mapped to a concept id.
 * Without a server, the app asks the user to pick the word (the "low confidence" path).
 */
export async function recognize(input: { base64?: string }): Promise<Recognition> {
  if (available && input.base64) {
    // Free: a daily number of AI scans; Max: unlimited
    if (!hasQuota('ai')) return { concept: null, confidence: 0, alternatives: [], source: 'limit' };
    try {
      await ensureSession();
      const { data, error } = await supabase.functions.invoke('recognize', {
        body: { image: input.base64, concepts: CONCEPTS.map((c) => c.id) },
      });
      if (!error && data) {
        const d = data as { concept: string | null; confidence?: number; alternatives?: string[]; error?: string };
        if (d.error === 'no_key') available = false;
        if (!d.error) spendQuota('ai');
        return { concept: d.concept ?? null, confidence: d.confidence ?? 0, alternatives: d.alternatives ?? [], source: d.error ? 'none' : 'server' };
      }
    } catch {
      // network or auth problem: fall through to manual pick
    }
  }
  return { concept: null, confidence: 0, alternatives: [], source: 'none' };
}
