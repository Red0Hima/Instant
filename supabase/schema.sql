-- Run this SQL in Supabase SQL editor before using the app.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  bio text not null default '',
  avatar_url text,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  caption text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;

-- profiles
drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
on public.profiles for select
using (true);

drop policy if exists "User can insert own profile" on public.profiles;
create policy "User can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "User can update own profile" on public.profiles;
create policy "User can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- posts
drop policy if exists "Posts are readable by everyone" on public.posts;
create policy "Posts are readable by everyone"
on public.posts for select
using (true);

drop policy if exists "User can insert own posts" on public.posts;
create policy "User can insert own posts"
on public.posts for insert
with check (auth.uid() = user_id);

drop policy if exists "User can update own posts" on public.posts;
create policy "User can update own posts"
on public.posts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "User can delete own posts" on public.posts;
create policy "User can delete own posts"
on public.posts for delete
using (auth.uid() = user_id);

-- likes
drop policy if exists "Likes are readable by everyone" on public.likes;
create policy "Likes are readable by everyone"
on public.likes for select
using (true);

drop policy if exists "User can like as self" on public.likes;
create policy "User can like as self"
on public.likes for insert
with check (auth.uid() = user_id);

drop policy if exists "User can unlike as self" on public.likes;
create policy "User can unlike as self"
on public.likes for delete
using (auth.uid() = user_id);

-- comments
drop policy if exists "Comments are readable by everyone" on public.comments;
create policy "Comments are readable by everyone"
on public.comments for select
using (true);

drop policy if exists "User can insert own comments" on public.comments;
create policy "User can insert own comments"
on public.comments for insert
with check (auth.uid() = user_id);

drop policy if exists "User can delete own comments" on public.comments;
create policy "User can delete own comments"
on public.comments for delete
using (auth.uid() = user_id);

-- follows
drop policy if exists "Follows are readable by everyone" on public.follows;
create policy "Follows are readable by everyone"
on public.follows for select
using (true);

drop policy if exists "User can follow as self" on public.follows;
create policy "User can follow as self"
on public.follows for insert
with check (auth.uid() = follower_id);

drop policy if exists "User can unfollow as self" on public.follows;
create policy "User can unfollow as self"
on public.follows for delete
using (auth.uid() = follower_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

drop policy if exists "Avatar files are public" on storage.objects;
create policy "Avatar files are public"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Post files are public" on storage.objects;
create policy "Post files are public"
on storage.objects for select
using (bucket_id = 'posts');

drop policy if exists "Users upload avatars" on storage.objects;
create policy "Users upload avatars"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.uid() is not null);

drop policy if exists "Users upload posts" on storage.objects;
create policy "Users upload posts"
on storage.objects for insert
with check (bucket_id = 'posts' and auth.uid() is not null);

drop policy if exists "Users update own avatars" on storage.objects;
create policy "Users update own avatars"
on storage.objects for update
using (bucket_id = 'avatars' and owner = auth.uid())
with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "Users update own posts" on storage.objects;
create policy "Users update own posts"
on storage.objects for update
using (bucket_id = 'posts' and owner = auth.uid())
with check (bucket_id = 'posts' and owner = auth.uid());

drop policy if exists "Users delete own avatars" on storage.objects;
create policy "Users delete own avatars"
on storage.objects for delete
using (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "Users delete own posts" on storage.objects;
create policy "Users delete own posts"
on storage.objects for delete
using (bucket_id = 'posts' and owner = auth.uid());
