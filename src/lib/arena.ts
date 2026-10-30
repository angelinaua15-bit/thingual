import { Platform } from 'react-native';
import { supabase } from './supabase';
import { blockedIds, ensureSession, type Profile } from './api';
import { CEFR_LEVELS, CONCEPTS, conceptById, labelOf } from '../data/concepts';
import { EXPRESSIONS, exprTarget } from '../data/expressions';
import type { LangCode } from '../data/languages';
import { weekKey } from '../store/useApp';

/* ------------------------------------------------------------------ seeded randomness */
/** Same seed → same questions on every phone, so two players get an identical round. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffled = <T,>(xs: T[], r: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export const newSeed = () => Math.floor(Math.random() * 2_000_000_000);

/* ------------------------------------------------------------------ duels */
export const DUEL_QUESTIONS = 10;
export const DUEL_SECONDS = 8; // per question
export type DuelQ = { word: string; reverse: boolean; options: string[] };
/** One answer in a run: [milliseconds taken, 1 right / 0 wrong]. */
export type Step = [number, 0 | 1];

/** A round built only from the seed, the language and the level. */
export function duelQuestions(seed: number, lang: LangCode, level: string, native: LangCode): DuelQ[] {
  const r = rng(seed);
  const max = Math.max(0, CEFR_LEVELS.indexOf(level as never));
  const pool = CONCEPTS.filter((c) => CEFR_LEVELS.indexOf(c.level) <= max && c.labels[lang]?.word && c.labels.en?.word);
  const picked: string[] = [];
  const seenWords = new Set<string>();
  for (const c of shuffled(pool, r)) {
    if (picked.length >= DUEL_QUESTIONS) break;
    const w = c.labels[lang].word;
    if (seenWords.has(w)) continue;
    seenWords.add(w);
    picked.push(c.id);
  }
  return picked.map((word) => {
    const c = conceptById(word)!;
    const taken = new Set([labelOf(word, lang)?.word, labelOf(word, native)?.word]);
    const near = shuffled(pool.filter((x) => x.id !== word && x.topic === c.topic), r).concat(shuffled(pool, r));
    const opts: string[] = [];
    for (const x of near) {
      if (opts.length >= 3) break;
      const a = x.labels[lang]?.word;
      const b = x.labels[native]?.word;
      if (!a || !b || taken.has(a) || taken.has(b)) continue;
      taken.add(a); taken.add(b); opts.push(x.id);
    }
    return { word, reverse: r() < 0.35, options: shuffled([word, ...opts], r) };
  });
}

/** Points for one answer: 100 for right, up to +50 for speed. */
export const stepPoints = ([ms, ok]: Step) => (ok ? 100 + Math.max(0, Math.round(50 - ms / 120)) : 0);
export const runScore = (log: Step[]) => log.reduce((a, s) => a + stepPoints(s), 0);

/** Tingo's practice bots, used when nobody is waiting in this language right now. */
export const BOTS = [
  { id: 'bot:luna', name: 'Luna', emoji: '🦉', skill: 0.72, speed: 3400 },
  { id: 'bot:pip', name: 'Pip', emoji: '🐧', skill: 0.8, speed: 2900 },
  { id: 'bot:mango', name: 'Mango', emoji: '🐼', skill: 0.66, speed: 3800 },
  { id: 'bot:zap', name: 'Zap', emoji: '🐯', skill: 0.86, speed: 2400 },
  { id: 'bot:koko', name: 'Koko', emoji: '🐨', skill: 0.7, speed: 3100 },
];
export function botRun(seed: number, bot = BOTS[seed % BOTS.length]): Step[] {
  const r = rng(seed ^ 0x5bd1e995);
  return Array.from({ length: DUEL_QUESTIONS }, () => {
    const ok = r() < bot.skill ? 1 : 0;
    const ms = Math.round(Math.max(900, Math.min(DUEL_SECONDS * 1000 - 200, bot.speed * (0.55 + r() * 0.9) + (ok ? 0 : 900))));
    return [ms, ok] as Step;
  });
}

export type Card = Pick<Profile, 'id' | 'handle' | 'name' | 'avatar_url' | 'flame' | 'native_lang'>;
export type Claimed = { id: string; lang: LangCode; level: string; seed: number; a_score: number; a_log: Step[]; b_score?: number | null; opponent: Card | null };

/** Take a real player's waiting run in this language, if there is one. */
export async function claimDuel(lang: LangCode, level: string): Promise<Claimed | null> {
  await ensureSession();
  const { data, error } = await supabase.rpc('duel_claim', { p_lang: lang, p_level: level });
  if (error) throw error;
  return (data as Claimed | null) ?? null;
}

export async function duelByCode(code: string): Promise<(Claimed & { mine?: boolean; taken?: boolean }) | null> {
  await ensureSession();
  const { data, error } = await supabase.rpc('duel_by_code', { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return data ?? null;
}

export async function finishDuel(id: string, log: Step[]) {
  const { error } = await supabase.rpc('duel_finish', { p_id: id, p_score: runScore(log), p_log: log });
  if (error) throw error;
}

const code6 = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');

/** Leave my run as a ghost for the next player (open duel) or for a friend (with an invite code). */
export async function postRun(p: { lang: LangCode; level: string; seed: number; log: Step[]; friend?: boolean }): Promise<string | null> {
  const me = await ensureSession();
  if (!p.friend) {
    // keep at most three waiting ghosts per player
    const { count } = await supabase.from('duels').select('id', { count: 'exact', head: true }).eq('a_id', me).is('b_score', null).is('code', null);
    if ((count ?? 0) >= 3) return null;
  }
  const code = p.friend ? code6() : null;
  const { error } = await supabase.from('duels').insert({ code, lang: p.lang, level: p.level, seed: p.seed, a_score: runScore(p.log), a_log: p.log });
  if (error) throw error;
  return code;
}

export type DuelRow = { id: string; code: string | null; lang: LangCode; created_at: string; finished_at: string | null; me_first: boolean; my_score: number; their_score: number | null; opponent: Card | null };
export async function myDuels(): Promise<DuelRow[]> {
  await ensureSession();
  const { data, error } = await supabase.rpc('my_duels', { p_limit: 20 });
  if (error) throw error;
  return (data ?? []) as DuelRow[];
}
export const duelLink = (code: string) => `https://thingual.vercel.app/duel?code=${code}`;

/* ------------------------------------------------------------------ teams */
export const TEAM_A = 20; // name word lists live in i18n: teams.a.0…19 and teams.b.0…19
export const TEAM_B = 20;
export const TEAM_EMOJI = ['🦊', '🦉', '🐼', '🐯', '🐬', '🐨', '🐧', '🐺', '🦁', '🐝', '🦄', '🐢'];
export const TEAM_COLORS = ['#F97316', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444', '#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#84CC16', '#0EA5E9', '#A855F7'];
export const TEAM_MAX = 10;
/** Weekly team goal grows with the team. */
export const teamGoal = (members: number) => Math.max(300, members * 150);

export type TeamMember = Card & { xp: number };
export type MyTeam = { id: string; code: string; name_a: number; name_b: number; emoji: string; color: number; open: boolean; members: TeamMember[] };
export type TeamRow = { id: string; code: string | null; name_a: number; name_b: number; emoji: string; color: number; members: number; xp: number };

export async function myTeam(): Promise<MyTeam | null> {
  await ensureSession();
  const { data, error } = await supabase.rpc('my_team', { p_week: weekKey() });
  if (error) throw error;
  return (data as MyTeam | null) ?? null;
}
export async function teamBoard(): Promise<TeamRow[]> {
  await ensureSession();
  const { data, error } = await supabase.rpc('team_board', { p_week: weekKey() });
  if (error) throw error;
  return (data ?? []) as TeamRow[];
}
export async function createTeam(a: number, b: number, emoji: string, color: number, open: boolean) {
  await ensureSession();
  const { error } = await supabase.rpc('team_create', { p_a: a, p_b: b, p_emoji: emoji, p_color: color, p_open: open });
  if (error) throw error;
}
export class TeamError extends Error {}
export async function joinTeam(code: string) {
  await ensureSession();
  const { error } = await supabase.rpc('team_join', { p_code: code.trim().toUpperCase() });
  if (error) throw new TeamError(/team_full/.test(error.message) ? 'full' : /no_team/.test(error.message) ? 'none' : 'other');
}
export async function joinRandomTeam(): Promise<boolean> {
  await ensureSession();
  const { data, error } = await supabase.rpc('team_join_random');
  if (error) throw error;
  return !!data;
}
export async function leaveTeam() {
  const { error } = await supabase.rpc('team_leave');
  if (error) throw error;
}
export const teamLink = (code: string) => `https://thingual.vercel.app/team?code=${code}`;

/* ------------------------------------------------------------------ world journey */
/** Every week Tingo travels to one country; everyone's XP together moves him from stop to stop. */
export const JOURNEY = [
  { id: 'jp', flag: '🇯🇵', stops: ['🗼', '⛩️', '🍣', '🗻', '🌸'] },
  { id: 'it', flag: '🇮🇹', stops: ['🍕', '🛶', '🏛️', '🍝', '🌋'] },
  { id: 'mx', flag: '🇲🇽', stops: ['🌮', '🛕', '🎉', '🌵', '🏖️'] },
  { id: 'fr', flag: '🇫🇷', stops: ['🥐', '🗼', '🎨', '🏰', '🧀'] },
  { id: 'br', flag: '🇧🇷', stops: ['⚽', '🦜', '🌴', '🎭', '🏖️'] },
  { id: 'ua', flag: '🇺🇦', stops: ['🌻', '🏰', '🥟', '⛰️', '🌊'] },
  { id: 'eg', flag: '🇪🇬', stops: ['🐪', '🏜️', '🔺', '⛵', '🌅'] },
  { id: 'kr', flag: '🇰🇷', stops: ['🍜', '🏯', '🎤', '🌃', '🍵'] },
  { id: 'gb', flag: '🇬🇧', stops: ['💂', '☕', '🎡', '🏰', '📚'] },
  { id: 'in', flag: '🇮🇳', stops: ['🐘', '🕌', '🍛', '🪁', '🐅'] },
  { id: 'es', flag: '🇪🇸', stops: ['💃', '🥘', '⛪', '🏟️', '🍊'] },
  { id: 'au', flag: '🇦🇺', stops: ['🦘', '🏄', '🐨', '🎶', '🪸'] },
];
/** World XP needed to reach each stop. */
export const JOURNEY_GOALS = [300, 800, 1600, 3000, 5000];
export const JOURNEY_REWARD = 10; // crystals per reached stop
const weekNum = (w = weekKey()) => { const [y, n] = w.split('-W').map(Number); return y * 53 + n; };
export const journeyOfWeek = (w = weekKey()) => JOURNEY[weekNum(w) % JOURNEY.length];
export async function worldWeek(): Promise<{ xp: number; players: number }> {
  await ensureSession();
  const { data, error } = await supabase.rpc('world_week', { p_week: weekKey() });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { xp: number; players: number } | undefined;
  return { xp: Number(row?.xp ?? 0), players: Number(row?.players ?? 0) };
}

/* ------------------------------------------------------------------ voice postcards */
export const STICKERS = [
  { id: 'clap', emoji: '👏' }, { id: 'fire', emoji: '🔥' }, { id: 'heart', emoji: '😍' },
  { id: 'star', emoji: '🌟' }, { id: 'laugh', emoji: '😂' }, { id: 'wow', emoji: '😮' },
] as const;
export type StickerId = (typeof STICKERS)[number]['id'];
export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);

/** Everyone gets the same short everyday phrase today (it changes at midnight UTC). */
const DAILY = EXPRESSIONS.filter((e) => e.kind === 'phrase' && e.texts && Object.keys(e.texts).length >= 10 && e.en.length <= 34);
export function phraseOfDay(day = utcDay()) {
  const n = Math.floor(Date.parse(day) / 86400000);
  return DAILY[(n * 7919) % DAILY.length];
}
export const phraseText = (lang: LangCode, day?: string) => exprTarget(phraseOfDay(day), lang).text;

export type Voice = { id: string; user_id: string; lang: LangCode; day: string; phrase: string; url: string; duration_ms: number; reactions: Partial<Record<StickerId, number>>; reaction_count: number; created_at: string; author?: Card | null };

export async function voicesOf(lang: LangCode, day = utcDay()): Promise<Voice[]> {
  await ensureSession();
  const { data, error } = await supabase
    .from('voices')
    .select('id, user_id, lang, day, phrase, url, duration_ms, reactions, reaction_count, created_at')
    .eq('lang', lang).eq('day', day)
    .order('reaction_count', { ascending: false }).order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  const blocked = new Set(await blockedIds().catch(() => [] as string[]));
  const rows = (data ?? []).filter((v) => !blocked.has(v.user_id)) as Voice[];
  const ids = [...new Set(rows.map((v) => v.user_id))];
  if (ids.length) {
    const { data: ps } = await supabase.from('profiles').select('id, handle, name, avatar_url, flame, native_lang').in('id', ids);
    const by = new Map((ps ?? []).map((p) => [p.id as string, p as Card]));
    rows.forEach((v) => (v.author = by.get(v.user_id) ?? null));
  }
  return rows;
}

export async function myReactions(ids: string[]): Promise<Record<string, StickerId>> {
  if (!ids.length) return {};
  const { data } = await supabase.from('voice_reactions').select('voice_id, sticker').in('voice_id', ids);
  return Object.fromEntries((data ?? []).map((r) => [r.voice_id, r.sticker]));
}

export async function react(voiceId: string, sticker: StickerId | null) {
  const me = await ensureSession();
  if (!sticker) {
    const { error } = await supabase.from('voice_reactions').delete().eq('voice_id', voiceId).eq('user_id', me);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('voice_reactions').upsert({ voice_id: voiceId, user_id: me, sticker });
  if (error) throw error;
}

export async function reportVoice(voiceId: string) {
  await ensureSession();
  const { error } = await supabase.from('voice_reports').insert({ voice_id: voiceId });
  if (error && error.code !== '23505') throw error;
}

/** Upload a recording and publish it as today's postcard (replaces my earlier one for today). */
export async function publishVoice(p: { uri: string; lang: LangCode; durationMs: number }) {
  const me = await ensureSession();
  const res = await fetch(p.uri);
  const blob = await res.blob();
  const raw = (blob.type || (Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4')).split(';')[0];
  const type = raw === 'audio/x-m4a' ? 'audio/mp4' : raw;
  const ext = type.includes('webm') ? 'webm' : type.includes('ogg') ? 'ogg' : type.includes('wav') ? 'wav' : type.includes('mpeg') ? 'mp3' : 'm4a';
  const day = utcDay();
  const path = `${me}/${day}-${p.lang}-${Date.now().toString(36)}.${ext}`;
  const { error: upErr } = await supabase.storage.from('voices').upload(path, await blob.arrayBuffer(), { contentType: type, upsert: false });
  if (upErr) throw upErr;
  const url = supabase.storage.from('voices').getPublicUrl(path).data.publicUrl;
  const phrase = phraseOfDay(day).id;
  const duration_ms = Math.max(300, Math.min(15000, Math.round(p.durationMs)));
  const { data: old } = await supabase.from('voices').select('id, url').eq('user_id', me).eq('lang', p.lang).eq('day', day).maybeSingle();
  if (old) {
    const { error } = await supabase.from('voices').update({ url, duration_ms, phrase }).eq('id', old.id);
    if (error) throw error;
    const oldPath = String(old.url).split('/voices/')[1];
    if (oldPath) supabase.storage.from('voices').remove([oldPath]).catch(() => {});
  } else {
    const { error } = await supabase.from('voices').insert({ lang: p.lang, day, phrase, url, duration_ms });
    if (error) throw error;
  }
}

export async function deleteVoice(v: Voice) {
  const { error } = await supabase.from('voices').delete().eq('id', v.id);
  if (error) throw error;
  const path = v.url.split('/voices/')[1];
  if (path) await supabase.storage.from('voices').remove([path]).catch(() => {});
}
