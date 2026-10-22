-- Post topics so people can share trips and interesting finds, and filter the feed by them
alter table public.posts add column if not exists topic text check (topic is null or topic in ('travel','fact','word','question'));
create index if not exists posts_topic_created_idx on public.posts (topic, created_at desc) where parent_id is null;
