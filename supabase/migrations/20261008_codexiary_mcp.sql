-- Codexiary: private cloud journal + ChatGPT MCP storage
-- Apply to a NEW dedicated Supabase project, never to an unrelated app.
create table if not exists public.journal_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  raw text not null check (char_length(raw) between 1 and 20000),
  source text not null default 'Project',
  project text not null default '',
  category text not null default 'Learning',
  topics text[] not null default '{}',
  summary text not null default '',
  lesson text not null default '',
  angle text not null default '',
  hook text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_entries_user_recent_idx
  on public.journal_entries (user_id, created_at desc);

create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null check (char_length(content) between 1 and 20000),
  tone text not null default 'Reflective',
  status text not null default 'draft' check (status in ('draft', 'ready', 'published')),
  entry_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_drafts_user_recent_idx
  on public.content_drafts (user_id, created_at desc);

create table if not exists public.voice_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  instructions text not null default 'Write in first person, with thoughtful and clear language. Be specific and honest. Avoid generic hype, excessive emojis, invented results and corporate-sounding announcements.',
  updated_at timestamptz not null default now()
);

alter table public.journal_entries enable row level security;
alter table public.content_drafts enable row level security;
alter table public.voice_profiles enable row level security;

-- Per-account isolation for ChatGPT OAuth and browser login.
create policy "journal select owned"
on public.journal_entries for select to authenticated
using (auth.uid() = user_id);

create policy "journal insert owned"
on public.journal_entries for insert to authenticated
with check (auth.uid() = user_id);

create policy "journal update owned"
on public.journal_entries for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "journal delete owned"
on public.journal_entries for delete to authenticated
using (auth.uid() = user_id);

create policy "drafts select owned"
on public.content_drafts for select to authenticated
using (auth.uid() = user_id);

create policy "drafts insert owned"
on public.content_drafts for insert to authenticated
with check (auth.uid() = user_id);

create policy "drafts update owned"
on public.content_drafts for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "drafts delete owned"
on public.content_drafts for delete to authenticated
using (auth.uid() = user_id);

create policy "voice select owned"
on public.voice_profiles for select to authenticated
using (auth.uid() = user_id);

create policy "voice insert owned"
on public.voice_profiles for insert to authenticated
with check (auth.uid() = user_id);

create policy "voice update owned"
on public.voice_profiles for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Restrict all tables to authenticated clients. No anonymous reads/writes.
revoke all on public.journal_entries from anon;
revoke all on public.content_drafts from anon;
revoke all on public.voice_profiles from anon;
grant select, insert, update, delete on public.journal_entries to authenticated;
grant select, insert, update, delete on public.content_drafts to authenticated;
grant select, insert, update on public.voice_profiles to authenticated;
