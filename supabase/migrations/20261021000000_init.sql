-- Thingual — initial schema (spec §10). Run with `supabase db push`.
create extension if not exists postgis;

-- Concepts: one row per object, labels per language
create table public.concepts (
  id text primary key,
  place text not null,
  wikidata_id text,
  created_at timestamptz default now()
);

create table public.concept_labels (
  concept_id text references public.concepts(id) on delete cascade,
  lang text not null,
  word text not null,
  article text,
  romanization text,
  ipa text,
  audio_url text,
  examples jsonb default '[]',
  verified boolean default false,
  primary key (concept_id, lang)
);

-- Users are anonymous Supabase auth users; profile keeps only what the app shows
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  age_group text check (age_group in ('under13', 'teen', 'adult')),
  native_lang text,
  premium boolean default false,
  strikes int default 0,
  banned boolean default false,
  created_at timestamptz default now()
);

create table public.user_words (
  user_id uuid references public.profiles(id) on delete cascade,
  concept_id text references public.concepts(id),
  photo_path text,
  source text,
  note text,
  card jsonb not null,
  added_at timestamptz default now(),
  primary key (user_id, concept_id)
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  concept_ids text[] default '{}',
  is_public boolean default false,
  created_at timestamptz default now()
);

create table public.drops (
  day date primary key,
  concept_id text references public.concepts(id) not null
);

-- Posts: location is rounded on the device to a ~2 km grid; only the city label is shown
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  concept_id text references public.concepts(id) not null,
  photo_path text not null,
  author_lang text not null,
  place text,
  location geography(point, 4326),
  is_drop boolean default false,
  late_minutes int,
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden', 'removed')),
  created_at timestamptz default now()
);
create index posts_location_idx on public.posts using gist (location);
create index posts_drop_idx on public.posts (concept_id, is_drop, created_at desc);

create table public.reactions (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  type text check (type in ('new', 'beautiful', 'same', 'wanna')),
  primary key (post_id, user_id, type)
);

create table public.friendships (
  user_id uuid references public.profiles(id) on delete cascade,
  friend_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

create table public.blocks (
  user_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  primary key (user_id, blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table public.moderation_queue (
  post_id uuid primary key references public.posts(id) on delete cascade,
  reason text,
  scores jsonb,
  created_at timestamptz default now()
);

-- Row Level Security --------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_words enable row level security;
alter table public.collections enable row level security;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;
alter table public.friendships enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.concepts enable row level security;
alter table public.concept_labels enable row level security;
alter table public.drops enable row level security;

create policy "concepts readable" on public.concepts for select using (true);
create policy "labels readable" on public.concept_labels for select using (true);
create policy "drops readable" on public.drops for select using (day <= current_date);

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "public nicknames" on public.profiles for select using (true);

create policy "own words" on public.user_words for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own collections" on public.collections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public collections" on public.collections for select using (is_public);

create policy "read published posts" on public.posts for select using (status = 'published' or auth.uid() = user_id);
create policy "insert own posts (adults/teens only)" on public.posts for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.age_group in ('teen', 'adult') and not p.banned)
);
create policy "delete own posts" on public.posts for delete using (auth.uid() = user_id);

create policy "own reactions" on public.reactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own friendships" on public.friendships for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own blocks" on public.blocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "file reports" on public.reports for insert with check (auth.uid() = reporter_id);

-- Map clusters for a bounding box (server-side clustering keeps the map smooth with 10k+ points)
create or replace function public.posts_in_view(min_lng float, min_lat float, max_lng float, max_lat float, concept text default null, drop_only boolean default false)
returns table (id uuid, concept_id text, photo_path text, author_lang text, place text, lat float, lng float)
language sql stable as $$
  select p.id, p.concept_id, p.photo_path, p.author_lang, p.place, st_y(p.location::geometry), st_x(p.location::geometry)
  from public.posts p
  where p.status = 'published'
    and p.location && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    and (concept is null or p.concept_id = concept)
    and (not drop_only or p.is_drop)
  order by p.created_at desc
  limit 2000;
$$;
