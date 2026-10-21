import { useEffect, useMemo } from 'react';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { createProfile, ensureSession, getMyProfile, myLikes, updateProfile, uploadImage, type PostRow, type Profile } from './api';
import { useApp } from '../store/useApp';

export const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false } } });

type Net = { status: 'idle' | 'ok' | 'offline'; uid?: string; set: (p: Partial<Net>) => void };
export const useNet = create<Net>((set) => ({ status: 'idle', set: (p) => set(p) }));

/** Signs in anonymously and makes sure the user has a community profile. */
export function useBootstrap() {
  const onboarded = useApp((s) => s.onboarded);
  useEffect(() => {
    if (!onboarded) return;
    (async () => {
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
      } catch {
        useNet.getState().set({ status: 'offline' });
      }
    })();
  }, [onboarded]);
}

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
