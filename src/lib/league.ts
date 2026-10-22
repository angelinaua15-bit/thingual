import { supabase } from './supabase';
import { ensureSession, followingIds, type Profile } from './api';
import { useApp, weekKey } from '../store/useApp';

export type LeagueRow = { user_id: string; xp: number; profile: Pick<Profile, 'id' | 'handle' | 'name' | 'avatar_url' | 'streak' | 'streak_day' | 'flame'> | null };

/** Tiers by this week's sparks — just for fun and motivation. */
export const TIERS = [
  { id: 'bronze', min: 0, color: '#C98A5A', emoji: '🥉' },
  { id: 'silver', min: 100, color: '#AEB8C2', emoji: '🥈' },
  { id: 'gold', min: 300, color: '#E8B23A', emoji: '🥇' },
  { id: 'sapphire', min: 700, color: '#4D7CFF', emoji: '💎' },
  { id: 'diamond', min: 1500, color: '#7CE8FF', emoji: '👑' },
] as const;
export const tierFor = (xp: number) => [...TIERS].reverse().find((t) => xp >= t.min)!;

export async function leaderboard(scope: 'all' | 'friends'): Promise<LeagueRow[]> {
  let req = supabase
    .from('league_xp')
    .select('user_id, xp, profile:profiles(id, handle, name, avatar_url, streak, streak_day, flame)')
    .eq('week', weekKey())
    .order('xp', { ascending: false })
    .limit(50);
  if (scope === 'friends') {
    const me = await ensureSession();
    req = req.in('user_id', [...(await followingIds()), me]);
  }
  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []) as unknown as LeagueRow[];
}

let timer: ReturnType<typeof setTimeout> | null = null;
async function pushXp() {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  const w = useApp.getState().weekXp;
  if (!uid || w.week !== weekKey() || w.xp <= 0) return;
  await supabase.from('league_xp').upsert({ user_id: uid, week: w.week, xp: Math.min(w.xp, 99999), updated_at: new Date().toISOString() });
}

/** Keep the public weekly score in step with sparks earned on this device. */
export function initLeague() {
  useApp.subscribe((s, p) => {
    if (s.weekXp === p.weekXp) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => pushXp().catch(() => {}), 3000);
  });
}
export const syncLeagueNow = () => pushXp().catch(() => {});
