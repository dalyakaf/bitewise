-- =============================================================================
-- 008 — Stage 4 schema: My Weekly Meals + Smart Grocery List
-- Run AFTER 007. Safe to re-run. Only ADDS tables and two nullable columns;
-- nothing is dropped and no existing rows are changed.
-- =============================================================================
begin;

-- 1. Structured quantities for grocery aggregation (filled by 009)
alter table public.recipe_ingredients add column if not exists amount numeric(8, 2) check (amount is null or amount > 0);
alter table public.recipe_ingredients add column if not exists unit   text;


-- 2. My Weekly Meals (private). Several recipes per slot are allowed.
create table if not exists public.meal_plan_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_date   date not null,
  meal_slot   text not null check (meal_slot in ('breakfast', 'lunch', 'dinner')),
  recipe_id   bigint not null references public.recipes (id) on delete cascade,
  servings    smallint not null default 1 check (servings between 1 and 12),
  -- Smart Swaps the student explicitly chose for this planned meal
  swap_ids    bigint[] not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists meal_plan_entries_user_date_idx
  on public.meal_plan_entries (user_id, plan_date);

alter table public.meal_plan_entries enable row level security;

drop policy if exists "meal_plan_entries_select_own" on public.meal_plan_entries;
drop policy if exists "meal_plan_entries_insert_own" on public.meal_plan_entries;
drop policy if exists "meal_plan_entries_update_own" on public.meal_plan_entries;
drop policy if exists "meal_plan_entries_delete_own" on public.meal_plan_entries;

create policy "meal_plan_entries_select_own" on public.meal_plan_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "meal_plan_entries_insert_own" on public.meal_plan_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "meal_plan_entries_update_own" on public.meal_plan_entries
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "meal_plan_entries_delete_own" on public.meal_plan_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.meal_plan_entries from anon;
grant select, insert, update, delete on public.meal_plan_entries to authenticated;


-- 3. Smart Grocery List: items the student adds by hand (per week, private)
create table if not exists public.grocery_manual_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start  date not null check (extract(isodow from week_start) = 1),
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  checked     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists grocery_manual_items_user_week_idx
  on public.grocery_manual_items (user_id, week_start, created_at);

alter table public.grocery_manual_items enable row level security;

drop policy if exists "grocery_manual_items_select_own" on public.grocery_manual_items;
drop policy if exists "grocery_manual_items_insert_own" on public.grocery_manual_items;
drop policy if exists "grocery_manual_items_update_own" on public.grocery_manual_items;
drop policy if exists "grocery_manual_items_delete_own" on public.grocery_manual_items;

create policy "grocery_manual_items_select_own" on public.grocery_manual_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "grocery_manual_items_insert_own" on public.grocery_manual_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "grocery_manual_items_update_own" on public.grocery_manual_items
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "grocery_manual_items_delete_own" on public.grocery_manual_items
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.grocery_manual_items from anon;
grant select, insert, update, delete on public.grocery_manual_items to authenticated;


-- 4. Smart Grocery List: checked state of GENERATED items (one row per item per
--    week, so no duplicates). The list itself is computed from the meal plan.
create table if not exists public.grocery_item_states (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start  date not null check (extract(isodow from week_start) = 1),
  item_key    text not null check (char_length(item_key) between 1 and 64),
  checked     boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, week_start, item_key)
);

alter table public.grocery_item_states enable row level security;

drop policy if exists "grocery_item_states_select_own" on public.grocery_item_states;
drop policy if exists "grocery_item_states_insert_own" on public.grocery_item_states;
drop policy if exists "grocery_item_states_update_own" on public.grocery_item_states;
drop policy if exists "grocery_item_states_delete_own" on public.grocery_item_states;

create policy "grocery_item_states_select_own" on public.grocery_item_states
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "grocery_item_states_insert_own" on public.grocery_item_states
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "grocery_item_states_update_own" on public.grocery_item_states
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "grocery_item_states_delete_own" on public.grocery_item_states
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.grocery_item_states from anon;
grant select, insert, update, delete on public.grocery_item_states to authenticated;

commit;
