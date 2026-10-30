-- Arena: 1-on-1 duels, fox teams, voice postcards and the weekly world journey.
-- Kid-safe by design: no free text anywhere — names come from fixed word lists,
-- reactions are stickers, and under-13s can't publish their voice.

------------------------------------------------------------------ duels
-- Async duels: player A plays a seeded round of 10 questions and leaves a "ghost"
-- (per-question time + right/wrong). Player B plays the same round against that ghost.
create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  code text unique check (code ~ '^[A-Z0-9]{6}$'),          -- set for friend duels (invite link)
  lang text not null check (lang ~ '^[a-z]{2,3}$'),
  level text not null default 'A1' check (level in ('A1','A2','B1','B2','C1','C2')),
  seed int not null,
  a_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  a_score int not null check (a_score between 0 and 1000),
  a_log jsonb not null check (jsonb_typeof(a_log) = 'array' and jsonb_array_length(a_log) <= 20),
  b_id uuid references auth.users(id) on delete cascade,
  b_score int check (b_score between 0 and 1000),
  b_log jsonb check (b_log is null or (jsonb_typeof(b_log) = 'array' and jsonb_array_length(b_log) <= 20)),
  claimed_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.duels enable row level security;
create index if not exists duels_open_idx on public.duels (lang, created_at) where b_score is null and code is null;
create index if not exists duels_a_idx on public.duels (a_id, created_at desc);
create index if not exists duels_b_idx on public.duels (b_id, created_at desc);

create policy "duels mine" on public.duels for select to authenticated
  using (a_id = (select auth.uid()) or b_id = (select auth.uid()));
create policy "duels start" on public.duels for insert to authenticated
  with check (a_id = (select auth.uid()) and b_id is null and b_score is null and finished_at is null);
create policy "duels drop open" on public.duels for delete to authenticated
  using (a_id = (select auth.uid()) and b_score is null);

-- at most 40 new duels a day per player
create or replace function public.tg_duel_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.duels where a_id = new.a_id and created_at > now() - interval '1 day') >= 40 then
    raise exception 'duel_limit';
  end if;
  return new;
end $$;
drop trigger if exists duel_limit on public.duels;
create trigger duel_limit before insert on public.duels for each row execute function public.tg_duel_limit();

-- the opponent's public card, returned together with a duel
create or replace function public.duel_card(d public.duels, side text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', p.id, 'handle', p.handle, 'name', p.name, 'avatar_url', p.avatar_url, 'flame', p.flame, 'native_lang', p.native_lang)
  from public.profiles p where p.id = case when side = 'a' then d.a_id else d.b_id end
$$;

-- find a waiting ghost in this language (similar level first) and take it
create or replace function public.duel_claim(p_lang text, p_level text default 'A1')
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); d public.duels;
begin
  if me is null then raise exception 'auth'; end if;
  select * into d from public.duels x
   where x.lang = p_lang and x.code is null and x.b_score is null and x.a_id <> me
     and (x.b_id is null or x.claimed_at < now() - interval '15 minutes')
     and not exists (select 1 from public.blocks b where (b.blocker_id = me and b.blocked_id = x.a_id) or (b.blocker_id = x.a_id and b.blocked_id = me))
     and not exists (select 1 from public.duels y where y.a_id = x.a_id and y.b_id = me and y.created_at > now() - interval '1 hour')
   order by (x.level = p_level) desc, x.created_at asc
   limit 1 for update skip locked;
  if not found then return null; end if;
  update public.duels set b_id = me, claimed_at = now() where id = d.id returning * into d;
  return jsonb_build_object('id', d.id, 'lang', d.lang, 'level', d.level, 'seed', d.seed, 'a_score', d.a_score, 'a_log', d.a_log, 'opponent', public.duel_card(d, 'a'));
end $$;

-- open a friend duel by its invite code
create or replace function public.duel_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); d public.duels;
begin
  if me is null then raise exception 'auth'; end if;
  select * into d from public.duels where code = upper(p_code) for update;
  if not found then return null; end if;
  if d.a_id = me then
    return jsonb_build_object('id', d.id, 'mine', true, 'lang', d.lang, 'level', d.level, 'seed', d.seed, 'a_score', d.a_score, 'b_score', d.b_score, 'opponent', public.duel_card(d, 'b'));
  end if;
  if d.b_score is not null and d.b_id <> me then return jsonb_build_object('taken', true); end if;
  if d.b_id is null or d.b_id = me or d.claimed_at < now() - interval '15 minutes' then
    update public.duels set b_id = me, claimed_at = coalesce(claimed_at, now()) where id = d.id returning * into d;
  else
    return jsonb_build_object('taken', true);
  end if;
  return jsonb_build_object('id', d.id, 'lang', d.lang, 'level', d.level, 'seed', d.seed, 'a_score', d.a_score, 'a_log', d.a_log, 'b_score', d.b_score, 'opponent', public.duel_card(d, 'a'));
end $$;

create or replace function public.duel_finish(p_id uuid, p_score int, p_log jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_score < 0 or p_score > 2000 or jsonb_typeof(p_log) <> 'array' or jsonb_array_length(p_log) > 20 then raise exception 'bad'; end if;
  update public.duels set b_score = p_score, b_log = p_log, finished_at = now()
   where id = p_id and b_id = auth.uid() and b_score is null;
  return found;
end $$;

-- my recent duels with both players' cards
create or replace function public.my_duels(p_limit int default 20)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(r order by r->>'created_at' desc), '[]'::jsonb) from (
    select jsonb_build_object('id', d.id, 'code', d.code, 'lang', d.lang, 'created_at', d.created_at, 'finished_at', d.finished_at,
      'me_first', d.a_id = auth.uid(),
      'my_score', case when d.a_id = auth.uid() then d.a_score else d.b_score end,
      'their_score', case when d.a_id = auth.uid() then d.b_score else d.a_score end,
      'opponent', case when d.a_id = auth.uid() then public.duel_card(d, 'b') else public.duel_card(d, 'a') end) r
    from public.duels d where d.a_id = auth.uid() or (d.b_id = auth.uid() and d.b_score is not null)
    order by d.created_at desc limit least(p_limit, 50)
  ) s
$$;

------------------------------------------------------------------ teams
-- Names are built from two fixed word lists (adjective + animal, translated in the app).
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  name_a smallint not null check (name_a between 0 and 39),
  name_b smallint not null check (name_b between 0 and 39),
  emoji text not null check (length(emoji) between 1 and 12),
  color smallint not null default 0 check (color between 0 and 11),
  open boolean not null default true,
  member_count int not null default 0,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.team_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  joined_at timestamptz not null default now()
);
create index if not exists team_members_team_idx on public.team_members (team_id);
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
create policy "teams read" on public.teams for select to authenticated using (true);
create policy "team members read" on public.team_members for select to authenticated using (true);

create or replace function public.team_leave() returns void language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  delete from public.team_members where user_id = auth.uid() returning team_id into t;
  if t is not null then
    update public.teams set member_count = (select count(*) from public.team_members where team_id = t) where id = t;
    delete from public.teams where id = t and member_count = 0;
  end if;
end $$;

create or replace function public.team_join_id(t uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  select member_count into n from public.teams where id = t for update;
  if not found then raise exception 'no_team'; end if;
  if exists (select 1 from public.team_members where user_id = auth.uid() and team_id = t) then return t; end if;
  if n >= 10 then raise exception 'team_full'; end if;
  perform public.team_leave();
  insert into public.team_members (user_id, team_id) values (auth.uid(), t);
  update public.teams set member_count = (select count(*) from public.team_members where team_id = t) where id = t;
  return t;
end $$;

create or replace function public.team_create(p_a int, p_b int, p_emoji text, p_color int, p_open boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid; c text;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when length(c) = 6 and not exists (select 1 from public.teams where code = c);
  end loop;
  insert into public.teams (code, name_a, name_b, emoji, color, open) values (c, p_a, p_b, p_emoji, p_color, p_open) returning id into t;
  return public.team_join_id(t);
end $$;

create or replace function public.team_join(p_code text) returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  select id into t from public.teams where code = upper(p_code);
  if t is null then raise exception 'no_team'; end if;
  return public.team_join_id(t);
end $$;

-- join an open team that still has room (most active first)
create or replace function public.team_join_random() returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  select id into t from public.teams
   where open and member_count between 1 and 9
     and id <> coalesce((select team_id from public.team_members where user_id = auth.uid()), '00000000-0000-0000-0000-000000000000')
   order by member_count desc, random() limit 1;
  if t is null then return null; end if;
  return public.team_join_id(t);
end $$;

-- this week's team ranking
create or replace function public.team_board(p_week text)
returns table (id uuid, code text, name_a smallint, name_b smallint, emoji text, color smallint, members int, xp bigint)
language sql stable security definer set search_path = public as $$
  select t.id, case when t.open then t.code else null end, t.name_a, t.name_b, t.emoji, t.color, t.member_count,
         coalesce(sum(l.xp), 0) as xp
  from public.teams t
  join public.team_members m on m.team_id = t.id
  left join public.league_xp l on l.user_id = m.user_id and l.week = p_week
  group by t.id order by xp desc, t.created_at asc limit 50
$$;

-- my team with every member's weekly XP
create or replace function public.my_team(p_week text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', t.id, 'code', t.code, 'name_a', t.name_a, 'name_b', t.name_b, 'emoji', t.emoji, 'color', t.color, 'open', t.open,
    'members', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'handle', p.handle, 'name', p.name, 'avatar_url', p.avatar_url, 'flame', p.flame,
                  'xp', coalesce((select l.xp from public.league_xp l where l.user_id = m.user_id and l.week = p_week), 0))
                  order by coalesce((select l.xp from public.league_xp l where l.user_id = m.user_id and l.week = p_week), 0) desc), '[]'::jsonb)
                from public.team_members m left join public.profiles p on p.id = m.user_id where m.team_id = t.id))
  from public.team_members me join public.teams t on t.id = me.team_id where me.user_id = auth.uid()
$$;

------------------------------------------------------------------ world journey
-- Everyone's XP this week together moves Tingo along a route.
create or replace function public.world_week(p_week text)
returns table (xp bigint, players int) language sql stable security definer set search_path = public as $$
  select coalesce(sum(xp), 0), count(*)::int from public.league_xp where week = p_week and xp > 0
$$;

------------------------------------------------------------------ voice postcards
create table if not exists public.voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lang text not null check (lang ~ '^[a-z]{2,3}$'),
  day date not null default current_date,
  phrase text not null check (length(phrase) <= 80),
  url text not null check (length(url) <= 500),
  duration_ms int not null check (duration_ms between 300 and 15000),
  reactions jsonb not null default '{}'::jsonb,
  reaction_count int not null default 0,
  report_count int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, lang, day)
);
create index if not exists voices_feed_idx on public.voices (lang, day, reaction_count desc) where not hidden;
alter table public.voices enable row level security;
create policy "voices read" on public.voices for select to authenticated using (not hidden or user_id = (select auth.uid()));
create policy "voices publish" on public.voices for insert to authenticated with check (
  user_id = (select auth.uid()) and not hidden and report_count = 0 and reaction_count = 0
  and coalesce((select age_group from public.profiles where id = (select auth.uid())), '') <> 'under13');
create policy "voices delete own" on public.voices for delete to authenticated using (user_id = (select auth.uid()));
create policy "voices replace own" on public.voices for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and not hidden);

create table if not exists public.voice_reactions (
  voice_id uuid not null references public.voices(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sticker text not null check (sticker in ('clap','fire','heart','star','laugh','wow')),
  created_at timestamptz not null default now(),
  primary key (voice_id, user_id)
);
alter table public.voice_reactions enable row level security;
create policy "reactions read own" on public.voice_reactions for select to authenticated using (user_id = (select auth.uid()));
create policy "reactions add" on public.voice_reactions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "reactions change" on public.voice_reactions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reactions remove" on public.voice_reactions for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.tg_voice_reactions() returns trigger language plpgsql security definer set search_path = public as $$
declare v uuid := coalesce(new.voice_id, old.voice_id);
begin
  update public.voices set
    reactions = coalesce((select jsonb_object_agg(sticker, n) from (select sticker, count(*) n from public.voice_reactions where voice_id = v group by sticker) s), '{}'::jsonb),
    reaction_count = (select count(*) from public.voice_reactions where voice_id = v)
  where id = v;
  return null;
end $$;
drop trigger if exists voice_reactions_count on public.voice_reactions;
create trigger voice_reactions_count after insert or update or delete on public.voice_reactions for each row execute function public.tg_voice_reactions();

create table if not exists public.voice_reports (
  voice_id uuid not null references public.voices(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (voice_id, user_id)
);
alter table public.voice_reports enable row level security;
create policy "voice report add" on public.voice_reports for insert to authenticated with check (user_id = (select auth.uid()));

-- three reports hide a postcard until someone reviews it
create or replace function public.tg_voice_report() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.voices set report_count = report_count + 1, hidden = (report_count + 1 >= 3) where id = new.voice_id;
  return null;
end $$;
drop trigger if exists voice_report_count on public.voice_reports;
create trigger voice_report_count after insert on public.voice_reports for each row execute function public.tg_voice_report();

-- audio files: public to listen, each user writes only into their own folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voices', 'voices', true, 1048576, array['audio/webm','audio/mp4','audio/m4a','audio/x-m4a','audio/aac','audio/mpeg','audio/ogg','audio/wav','audio/3gpp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "voices upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'voices' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "voices update own" on storage.objects for update to authenticated
  using (bucket_id = 'voices' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "voices delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'voices' and (storage.foldername(name))[1] = (select auth.uid())::text);

grant execute on function public.duel_claim(text, text), public.duel_by_code(text), public.duel_finish(uuid, int, jsonb), public.my_duels(int),
  public.team_leave(), public.team_create(int, int, text, int, boolean), public.team_join(text), public.team_join_random(),
  public.team_board(text), public.my_team(text), public.world_week(text) to authenticated;
revoke execute on function public.team_join_id(uuid), public.duel_card(public.duels, text) from anon, authenticated, public;

-- a perfect round is 10 × 150 points
alter table public.duels drop constraint duels_a_score_check, add constraint duels_a_score_check check (a_score between 0 and 2000);
alter table public.duels drop constraint duels_b_score_check, add constraint duels_b_score_check check (b_score between 0 and 2000);
revoke execute on function public.duel_claim(text, text), public.duel_by_code(text), public.duel_finish(uuid, int, jsonb), public.my_duels(int),
  public.team_leave(), public.team_create(int, int, text, int, boolean), public.team_join(text), public.team_join_random(),
  public.team_board(text), public.my_team(text), public.world_week(text) from public, anon;
revoke execute on function public.tg_duel_limit(), public.tg_voice_reactions(), public.tg_voice_report() from public, anon, authenticated;
