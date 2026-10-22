-- progress sync
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_state enable row level security;
create policy "state own select" on public.user_state for select to authenticated using (user_id = (select auth.uid()));
create policy "state own insert" on public.user_state for insert to authenticated with check (user_id = (select auth.uid()));
create policy "state own update" on public.user_state for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "state own delete" on public.user_state for delete to authenticated using (user_id = (select auth.uid()));

-- weekly league XP (public leaderboard)
create table if not exists public.league_xp (
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  week text not null check (week ~ '^[0-9]{4}-W[0-9]{1,2}$'),
  xp int not null default 0 check (xp >= 0 and xp < 100000),
  updated_at timestamptz not null default now(),
  primary key (user_id, week)
);
alter table public.league_xp enable row level security;
create policy "league read" on public.league_xp for select to anon, authenticated using (true);
create policy "league insert own" on public.league_xp for insert to authenticated with check (user_id = (select auth.uid()));
create policy "league update own" on public.league_xp for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index if not exists league_xp_week_idx on public.league_xp (week, xp desc);

-- client error reports
create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid(),
  message text not null check (length(message) <= 2000),
  stack text check (length(stack) <= 8000),
  url text check (length(url) <= 500),
  ua text check (length(ua) <= 400),
  created_at timestamptz not null default now()
);
alter table public.client_errors enable row level security;
create policy "errors insert" on public.client_errors for insert to anon, authenticated with check (true);
