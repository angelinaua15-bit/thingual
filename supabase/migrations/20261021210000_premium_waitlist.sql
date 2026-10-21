-- People who asked to be notified when Thingual Max launches.
create table if not exists public.premium_waitlist (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  plan text not null check (plan in ('monthly','yearly','family')),
  created_at timestamptz not null default now()
);
alter table public.premium_waitlist enable row level security;
create policy "waitlist insert own" on public.premium_waitlist for insert to authenticated with check (user_id = (select auth.uid()));
create policy "waitlist update own" on public.premium_waitlist for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "waitlist read own" on public.premium_waitlist for select to authenticated using (user_id = (select auth.uid()));
