-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run)

create table if not exists public.cases (
  room text primary key,
  payload jsonb not null,
  status text not null default 'filled',
  updated_at timestamptz not null default now(),
  handover_at timestamptz
);

-- Row Level Security must be enabled, then explicitly opened up below.
alter table public.cases enable row level security;

-- This is an internal handover tool with NO login system, so we allow the
-- public "anon" key full read/write access. Anyone who has the anon key
-- (visible in the deployed site's JS bundle) can read/write this table.
-- That's an acceptable trade-off for an internal tool on a private link,
-- but if you need real access control later, add Supabase Auth and swap
-- this policy for one that checks auth.uid() / hospital email domain.
drop policy if exists "cases_anon_full_access" on public.cases;
create policy "cases_anon_full_access"
  on public.cases
  for all
  to anon
  using (true)
  with check (true);

-- Enable realtime so every open dashboard/tab updates instantly on change.
alter publication supabase_realtime add table public.cases;
