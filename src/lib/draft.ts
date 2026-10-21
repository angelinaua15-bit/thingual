import { create } from 'zustand';

/** Hand-off for the composer (photos can be large data URIs, so they don't travel in the URL). */
type Draft = { photo?: string; concept?: string; set: (d: { photo?: string; concept?: string }) => void; clear: () => void };
export const useDraft = create<Draft>((set) => ({ set: (d) => set(d), clear: () => set({ photo: undefined, concept: undefined }) }));

export function openComposer(router: { push: (h: never) => void }, d: { photo?: string; concept?: string } = {}) {
  useDraft.getState().set(d);
  router.push('/compose' as never);
}
