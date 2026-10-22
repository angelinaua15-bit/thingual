import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { createProfile, ensureSession, getMyProfile, myLikes, updateProfile, uploadImage, type PostRow, type Profile } from './api';
import { useApp } from '../store/useApp';
import { pullState } from './sync';

export const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false } } });

type Net = { status: 'idle' | 'ok' | 'offline'; uid?: string; set: (p: Partial<Net>) => void };
export const useNet = create<Net>((set) => ({ status: 'idle', set: (p) => set(p) }));

/** Signs in anonymously and makes sure the user has a community profile. */
let connecting = false;
/** Anonymous session + profile. Safe to call again — used for retries after a network failure. */
export async function connect() {
  if (connecting || !useApp.getState().onboarded) return;
  connecting = true;
  try {
    const uid = await ensureSession();
    let me = await getMyProfile();
    if (!me) {
      const s = useApp.getState();
      me = await createProfile({
        handle: s.profile.nickname, name: s.profile.displayName ?? s.profile.nickname, native_lang: s.settings.native, learning_lang: s.settings.active, age_group: s.profile.ageGroup ?? null,
      });
    }
    const pending = useApp.getState().profile.pendingAvatar;
    if (pending) {
      try {
        me = await updateProfile({ avatar_url: await uploadImage('avatars', pending) });
      } catch {}
      useApp.getState().setLocalProfile({ pendingAvatar: undefined });
    }
    qc.setQueryData(['me'], me);
    useNet.getState().set({ status: 'ok', uid });
    await pullState().catch(() => {});
    import('./league').then((m) => m.syncLeagueNow());
    qc.invalidateQueries();
    syncStreak();
  } catch {
    useNet.getState().set({ status: 'offline' });
  } finally {
    connecting = false;
  }
}

export function useBootstrap() {
  const onboarded = useApp((s) => s.onboarded);
  useEffect(() => {
    if (!onboarded) return;
    connect();
    // reconnect when the network comes back or the app returns to the foreground
    const retry = () => useNet.getState().status !== 'ok' && connect();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && retry());
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('online', retry);
    return () => {
      sub.remove();
      if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('online', retry);
    };
  }, [onboarded]);
}

/** Mirror the flame to the public profile so friends see it. */
let lastSynced = '';
function syncStreak() {
  const s = useApp.getState();
  const key = `${s.learnStreak.count}|${s.learnStreak.last ?? ''}|${s.flame}`;
  if (key === lastSynced || useNet.getState().status !== 'ok') return;
  lastSynced = key;
  updateProfile({ streak: s.learnStreak.count, streak_day: s.learnStreak.last ?? null, flame: s.flame })
    .then((me) => qc.setQueryData(['me'], me))
    .catch(() => { lastSynced = ''; });
}
useApp.subscribe((s, prev) => {
  if (s.learnStreak !== prev.learnStreak || s.flame !== prev.flame) syncStreak();
});

export function useMe() {
  const status = useNet((s) => s.status);
  return useQuery<Profile | null>({ queryKey: ['me'], queryFn: getMyProfile, enabled: status === 'ok' });
}

/** Which of these posts I liked — one request per list. */
export function useLikedSet(posts: PostRow[] | undefined) {
  const ids = useMemo(() => (posts ?? []).map((p) => p.id).sort(), [posts]);
  const status = useNet((s) => s.status);
  const q = useQuery({ queryKey: ['liked', ids.join(',')], queryFn: () => myLikes(ids), enabled: status === 'ok' && ids.length > 0 });
  return q.data ?? new Set<string>();
}
