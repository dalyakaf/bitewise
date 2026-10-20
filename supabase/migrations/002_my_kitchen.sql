-- =============================================================================
-- 002 — My Kitchen: appliance catalog + each user's saved appliances
-- Run AFTER supabase/setup.sql. Safe to re-run. Does not touch existing data.
-- =============================================================================
begin;

-- Shared appliance catalog (read-only for logged-in users). Add rows to extend.
create table if not exists public.appliances (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),
  name        text not null,
  emoji       text not null default '🍳',
  sort_order  integer not null default 100
);

alter table public.appliances enable row level security;

drop policy if exists "appliances_read_authenticated" on public.appliances;
create policy "appliances_read_authenticated" on public.appliances
  for select to authenticated
  using ((select auth.uid()) is not null);

revoke all on public.appliances from anon;
revoke insert, update, delete on public.appliances from authenticated;
grant select on public.appliances to authenticated;

insert into public.appliances (id, name, emoji, sort_order) values
  ('stovetop',    'Stovetop / hob',  '🔥', 10),
  ('oven',        'Oven',            '♨️', 20),
  ('air-fryer',   'Air fryer',       '🌀', 30),
  ('microwave',   'Microwave',       '📡', 40),
  ('blender',     'Blender',         '🥤', 50),
  ('toaster',     'Toaster',         '🍞', 60),
  ('rice-cooker', 'Rice cooker',     '🍚', 70),
  ('kettle',      'Electric kettle', '🫖', 80)
on conflict (id) do update
  set name = excluded.name,
      emoji = excluded.emoji,
      sort_order = excluded.sort_order;


-- Private: which appliances each user owns (one row per appliance)
create table if not exists public.user_appliances (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  appliance_id  text not null references public.appliances (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, appliance_id)
);

alter table public.user_appliances enable row level security;

drop policy if exists "user_appliances_select_own" on public.user_appliances;
drop policy if exists "user_appliances_insert_own" on public.user_appliances;
drop policy if exists "user_appliances_update_own" on public.user_appliances;
drop policy if exists "user_appliances_delete_own" on public.user_appliances;

create policy "user_appliances_select_own" on public.user_appliances
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_appliances_insert_own" on public.user_appliances
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_appliances_update_own" on public.user_appliances
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_appliances_delete_own" on public.user_appliances
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.user_appliances from anon;
grant select, insert, update, delete on public.user_appliances to authenticated;

commit;

select count(*) as appliances from public.appliances;
