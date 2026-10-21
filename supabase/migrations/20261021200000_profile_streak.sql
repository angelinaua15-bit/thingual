-- Streak shown on profiles (the flame next to a name).
alter table public.profiles add column if not exists streak int not null default 0 check (streak >= 0 and streak < 100000);
alter table public.profiles add column if not exists streak_day date;
alter table public.profiles add column if not exists flame text not null default 'classic' check (flame in ('classic','ocean','violet','gold'));
