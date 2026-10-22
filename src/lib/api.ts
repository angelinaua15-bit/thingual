import { resolvePhoto } from './photoStore';
import { useApp } from '../store/useApp';
import { dateKey } from '../data/social';
import { supabase } from './supabase';

export type Profile = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  avatar_url: string | null;
  native_lang: string | null;
  learning_lang: string | null;
  age_group: 'under13' | 'teen' | 'adult' | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  streak?: number;
  streak_day?: string | null;
  flame?: string;
  created_at: string;
};

export type PostRow = {
  id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  photo_url: string | null;
  concept_id: string | null;
  lang: string | null;
  place: string | null;
  lat: number | null;
  lng: number | null;
  is_drop: boolean;
  drop_day: string | null;
  late_minutes: number | null;
  like_count: number;
  reply_count: number;
  created_at: string;
  author: Profile;
};

const POST_SELECT = '*, author:profiles!posts_author_id_fkey(*)';

export class AuthUnavailable extends Error {}

/* ---------------- session ---------------- */
let sessionPromise: Promise<string> | null = null;

/** Anonymous account: no sign-up form, the session is created silently on first launch. */
let currentUid: string | null = null;
export function ensureSession(): Promise<string> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) return (currentUid = data.session.user.id);
      const { data: signed, error } = await supabase.auth.signInAnonymously();
      if (error || !signed.user) {
        sessionPromise = null;
        throw new AuthUnavailable(error?.message ?? 'auth');
      }
      return (currentUid = signed.user.id);
    })();
  }
  return sessionPromise;
}

export async function myId(): Promise<string> {
  return ensureSession();
}

/* ---------------- profiles ---------------- */
export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getMyProfile(): Promise<Profile | null> {
  const id = await ensureSession();
  return getProfile(id);
}

export const normalizeHandle = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_.]/g, '').slice(0, 24);

export async function handleAvailable(handle: string, exceptId?: string) {
  const { data } = await supabase.from('profiles').select('id').eq('handle', handle).maybeSingle();
  return !data || data.id === exceptId;
}

export async function createProfile(p: { handle: string; name: string; native_lang?: string; learning_lang?: string; age_group?: string | null; avatar_url?: string | null }) {
  const id = await ensureSession();
  let base = normalizeHandle(p.handle);
  if (base.length < 3) base = `user${base}`.padEnd(3, '0');
  for (let i = 0; i < 6; i++) {
    const handle = i === 0 ? base : `${base.slice(0, 20)}${Math.floor(Math.random() * 9000) + 1000}`;
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id, handle, name: p.name.slice(0, 40), native_lang: p.native_lang, learning_lang: p.learning_lang, age_group: p.age_group ?? null, avatar_url: p.avatar_url ?? null })
      .select()
      .single();
    if (!error) return data as Profile;
    if (error.code !== '23505') throw error;
  }
  throw new Error('handle');
}

export async function updateProfile(patch: Partial<Pick<Profile, 'handle' | 'name' | 'bio' | 'avatar_url' | 'native_lang' | 'learning_lang' | 'age_group' | 'streak' | 'streak_day' | 'flame'>>) {
  const id = await ensureSession();
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Profile;
}

export async function searchProfiles(q: string): Promise<Profile[]> {
  const query = q.trim().replace(/[%_,()]/g, '');
  let req = supabase.from('profiles').select('*').order('followers_count', { ascending: false }).limit(30);
  if (query) req = req.or(`handle.ilike.%${normalizeHandle(query) || query}%,name.ilike.%${query}%`);
  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []) as Profile[];
}

/* ---------------- images ---------------- */
export async function uploadImage(bucket: 'avatars' | 'posts', uri: string): Promise<string> {
  const id = await ensureSession();
  const res = await fetch(await resolvePhoto(uri));
  const buf = await res.arrayBuffer();
  const type = res.headers.get('content-type')?.startsWith('image/') ? res.headers.get('content-type')! : 'image/jpeg';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  const path = `${id}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, buf, { contentType: type, upsert: false });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/* ---------------- follows ---------------- */
export async function followingIds(uid?: string): Promise<string[]> {
  const id = uid ?? (await ensureSession());
  const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', id);
  if (error) throw error;
  return (data ?? []).map((r) => r.following_id as string);
}

export async function follow(target: string) {
  const id = await ensureSession();
  const { error } = await supabase.from('follows').insert({ follower_id: id, following_id: target });
  if (error && error.code !== '23505') throw error;
}

export async function unfollow(target: string) {
  const id = await ensureSession();
  const { error } = await supabase.from('follows').delete().eq('follower_id', id).eq('following_id', target);
  if (error) throw error;
}

export async function followList(uid: string, kind: 'followers' | 'following'): Promise<Profile[]> {
  if (kind === 'followers') {
    const { data, error } = await supabase.from('follows').select('p:profiles!follows_follower_id_fkey(*)').eq('following_id', uid).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return (data ?? []).map((r) => r.p as unknown as Profile);
  }
  const { data, error } = await supabase.from('follows').select('p:profiles!follows_following_id_fkey(*)').eq('follower_id', uid).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []).map((r) => r.p as unknown as Profile);
}

/* ---------------- blocks ---------------- */
export async function blockedIds(): Promise<string[]> {
  const id = await ensureSession();
  const { data } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', id);
  return (data ?? []).map((r) => r.blocked_id as string);
}

export async function block(target: string) {
  const id = await ensureSession();
  await supabase.from('follows').delete().eq('follower_id', id).eq('following_id', target);
  const { error } = await supabase.from('blocks').insert({ blocker_id: id, blocked_id: target });
  if (error && error.code !== '23505') throw error;
}

export async function report(postId: string, reason = '') {
  const id = await ensureSession();
  const { error } = await supabase.from('reports').insert({ post_id: postId, reporter_id: id, reason });
  if (error && error.code !== '23505') throw error;
}

/* ---------------- posts ---------------- */
const PAGE = 20;

export async function feed(kind: 'for_you' | 'following', before?: string): Promise<PostRow[]> {
  let req = supabase.from('posts').select(POST_SELECT).is('parent_id', null).order('created_at', { ascending: false }).limit(PAGE);
  if (before) req = req.lt('created_at', before);
  if (kind === 'following') {
    const ids = await followingIds();
    const me = await ensureSession();
    req = req.in('author_id', [...ids, me]);
  }
  const { data, error } = await req;
  if (error) throw error;
  const blocked = new Set(await blockedIds().catch(() => []));
  return hideUnrevealedDrops((data ?? []) as PostRow[]).filter((p) => !blocked.has(p.author_id));
}

/** Today's Daily Drop stays hidden until you've posted yours ("post to see"). */
function hideUnrevealedDrops(rows: PostRow[]) {
  const today = dateKey();
  if (useApp.getState().drops[today]) return rows;
  const me = currentUid;
  return rows.filter((p) => !(p.is_drop && p.drop_day === today && p.author_id !== me));
}

export async function userPosts(uid: string, replies = false): Promise<PostRow[]> {
  let req = supabase.from('posts').select(POST_SELECT).eq('author_id', uid).order('created_at', { ascending: false }).limit(60);
  req = replies ? req.not('parent_id', 'is', null) : req.is('parent_id', null);
  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []) as PostRow[];
}

export async function getPost(id: string): Promise<PostRow | null> {
  const { data, error } = await supabase.from('posts').select(POST_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as PostRow | null;
}

export async function getReplies(id: string): Promise<PostRow[]> {
  const { data, error } = await supabase.from('posts').select(POST_SELECT).eq('parent_id', id).order('created_at', { ascending: true }).limit(200);
  if (error) throw error;
  const blocked = new Set(await blockedIds().catch(() => []));
  return ((data ?? []) as PostRow[]).filter((p) => !blocked.has(p.author_id));
}

export async function conceptPosts(concept: string): Promise<PostRow[]> {
  const { data, error } = await supabase.from('posts').select(POST_SELECT).eq('concept_id', concept).not('photo_url', 'is', null).order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  return (data ?? []) as PostRow[];
}

export async function mapPosts(opts: { concept?: string; dropDay?: string; authors?: string[] }): Promise<PostRow[]> {
  let req = supabase.from('posts').select(POST_SELECT).not('lat', 'is', null).not('photo_url', 'is', null).order('created_at', { ascending: false }).limit(500);
  if (opts.concept) req = req.eq('concept_id', opts.concept);
  if (opts.dropDay) req = req.eq('is_drop', true).eq('drop_day', opts.dropDay);
  if (opts.authors) req = req.in('author_id', opts.authors.length ? opts.authors : ['00000000-0000-0000-0000-000000000000']);
  const { data, error } = await req;
  if (error) throw error;
  const blocked = new Set(await blockedIds().catch(() => []));
  const rows = (data ?? []) as PostRow[];
  return (opts.dropDay ? rows : hideUnrevealedDrops(rows)).filter((p) => !blocked.has(p.author_id));
}

export async function myDropToday(day: string): Promise<PostRow | null> {
  const id = await ensureSession();
  const { data } = await supabase.from('posts').select(POST_SELECT).eq('author_id', id).eq('is_drop', true).eq('drop_day', day).maybeSingle();
  return data as PostRow | null;
}

export async function createPost(p: {
  body?: string; photoUri?: string | null; concept_id?: string | null; lang?: string | null; parent_id?: string | null;
  place?: string | null; lat?: number | null; lng?: number | null; is_drop?: boolean; drop_day?: string | null; late_minutes?: number | null;
}): Promise<PostRow> {
  const id = await ensureSession();
  const photo_url = p.photoUri ? (p.photoUri.startsWith('https://') ? p.photoUri : await uploadImage('posts', p.photoUri)) : null;
  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: id, body: (p.body ?? '').trim().slice(0, 500), photo_url, concept_id: p.concept_id ?? null, lang: p.lang ?? null,
      parent_id: p.parent_id ?? null, place: p.place ?? null, lat: p.lat ?? null, lng: p.lng ?? null,
      is_drop: !!p.is_drop, drop_day: p.drop_day ?? null, late_minutes: p.late_minutes ?? null,
    })
    .select(POST_SELECT)
    .single();
  if (error) throw error;
  return data as PostRow;
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

/* ---------------- likes ---------------- */
export async function myLikes(postIds: string[]): Promise<Set<string>> {
  if (!postIds.length) return new Set();
  const id = await ensureSession();
  const { data } = await supabase.from('likes').select('post_id').eq('user_id', id).in('post_id', postIds);
  return new Set((data ?? []).map((r) => r.post_id as string));
}

export async function setLike(postId: string, on: boolean) {
  const id = await ensureSession();
  if (on) {
    const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: id });
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', id);
    if (error) throw error;
  }
}

/* ---------------- activity ---------------- */
export type Activity =
  | { kind: 'follow'; at: string; user: Profile }
  | { kind: 'like'; at: string; user: Profile; post: { id: string; body: string; photo_url: string | null } }
  | { kind: 'reply'; at: string; user: Profile; post: { id: string; body: string; photo_url: string | null }; parentId: string };

export async function activity(): Promise<Activity[]> {
  const me = await ensureSession();
  const [f, l, r] = await Promise.all([
    supabase.from('follows').select('created_at, user:profiles!follows_follower_id_fkey(*)').eq('following_id', me).order('created_at', { ascending: false }).limit(30),
    supabase.from('likes').select('created_at, user:profiles(*), post:posts!inner(id, body, photo_url, author_id)').eq('post.author_id', me).neq('user_id', me).order('created_at', { ascending: false }).limit(30),
    supabase.from('posts').select('id, created_at, body, photo_url, parent_id, user:profiles!posts_author_id_fkey(*), parent:posts!posts_parent_id_fkey!inner(author_id)').eq('parent.author_id', me).neq('author_id', me).order('created_at', { ascending: false }).limit(30),
  ]);
  const out: Activity[] = [];
  (f.data ?? []).forEach((x) => out.push({ kind: 'follow', at: x.created_at as string, user: x.user as unknown as Profile }));
  (l.data ?? []).forEach((x) => out.push({ kind: 'like', at: x.created_at as string, user: x.user as unknown as Profile, post: x.post as unknown as { id: string; body: string; photo_url: string | null } }));
  (r.data ?? []).forEach((x) =>
    out.push({ kind: 'reply', at: x.created_at as string, user: x.user as unknown as Profile, post: { id: x.id as string, body: x.body as string, photo_url: x.photo_url as string | null }, parentId: x.parent_id as string }),
  );
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/* ---------------- account ---------------- */
export const SITE_URL = 'https://thingual.vercel.app';

/** Attach an email to the current (anonymous) account so progress can be restored elsewhere. */
export async function linkEmail(email: string) {
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: SITE_URL });
  if (error) throw error;
}

/** Sign in on another device with a magic link (only for accounts that already have an email). */
export async function signInWithEmail(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: SITE_URL } });
  if (error) throw error;
}

/** Forget the cached session id (after a sign-in on this device switched accounts). */
export function resetSession(uid?: string) {
  sessionPromise = uid ? Promise.resolve(uid) : null;
  currentUid = uid ?? null;
}

export async function myEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? data.user?.new_email ?? null;
}

export async function deleteMyData() {
  const id = await ensureSession();
  await supabase.from('posts').delete().eq('author_id', id);
  await supabase.from('premium_waitlist').delete().eq('user_id', id);
  await supabase.from('profiles').delete().eq('id', id);
  await supabase.auth.signOut();
  sessionPromise = null;
}

export async function dropPosts(day: string, concept: string): Promise<PostRow[]> {
  const { data, error } = await supabase.from('posts').select(POST_SELECT).eq('is_drop', true).eq('drop_day', day).eq('concept_id', concept).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  const blocked = new Set(await blockedIds().catch(() => []));
  return ((data ?? []) as PostRow[]).filter((p) => !blocked.has(p.author_id));
}

/** "Notify me" for Thingual Max (no payment yet). */
export async function joinPremiumWaitlist(plan: 'monthly' | 'yearly' | 'family') {
  const id = await ensureSession();
  const { error } = await supabase.from('premium_waitlist').upsert({ user_id: id, plan });
  if (error) throw error;
}
