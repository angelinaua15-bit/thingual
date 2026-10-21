import { CONCEPTS } from '../data/concepts';

export type Recognition = {
  concept: string | null;
  confidence: number;
  alternatives: string[];
  source: 'server' | 'none';
};

/** Supabase Edge Function `recognize` (see supabase/functions/recognize). */
export const RECOGNIZE_URL = process.env.EXPO_PUBLIC_RECOGNIZE_URL ?? '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const backendConnected = () => !!RECOGNIZE_URL;

/**
 * Two-step recognition from the spec:
 * 1) instant on-device detection (dots in the viewfinder),
 * 2) the tapped crop is refined by a multimodal model on the server and mapped to a concept id.
 * Without a server, the app asks the user to pick the word (the "low confidence" path).
 */
export async function recognize(input: { base64?: string }): Promise<Recognition> {
  if (RECOGNIZE_URL && input.base64) {
    try {
      const res = await fetch(RECOGNIZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}` } : {}) },
        body: JSON.stringify({ image: input.base64, concepts: CONCEPTS.map((c) => c.id) }),
      });
      if (res.ok) {
        const data = (await res.json()) as { concept: string | null; confidence: number; alternatives?: string[] };
        return { concept: data.concept, confidence: data.confidence ?? 0, alternatives: data.alternatives ?? [], source: 'server' };
      }
    } catch {
      // fall through to manual pick
    }
  }
  return { concept: null, confidence: 0, alternatives: [], source: 'none' };
}
