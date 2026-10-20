-- =============================================================================
-- 003 — Recipe schema for Stage 2: prep/cook times, meal types, tools,
-- storage notes, optional ingredients and recipe ↔ equipment links.
-- Run AFTER 002. Safe to re-run. Only adds columns/tables; nothing is dropped.
-- =============================================================================
begin;

-- Recipes: new descriptive columns (existing rows are backfilled)
alter table public.recipes add column if not exists prep_minutes integer;
alter table public.recipes add column if not exists cook_minutes integer;
alter table public.recipes add column if not exists meal_types   text[] not null default '{}';
alter table public.recipes add column if not exists tools        text[] not null default '{}';
alter table public.recipes add column if not exists storage_note text;

update public.recipes
set prep_minutes = coalesce(prep_minutes, 0),
    cook_minutes = coalesce(cook_minutes, total_minutes)
where prep_minutes is null or cook_minutes is null;

alter table public.recipes alter column prep_minutes set default 0;
alter table public.recipes alter column cook_minutes set default 0;
alter table public.recipes alter column prep_minutes set not null;
alter table public.recipes alter column cook_minutes set not null;

-- Recipe ingredients: optional extras and display order
alter table public.recipe_ingredients add column if not exists is_optional boolean not null default false;
alter table public.recipe_ingredients add column if not exists sort_order  integer not null default 0;

-- Recipe equipment. Every option_group must be satisfied by at least one of its
-- appliances; several rows in one group are explicit alternatives (the note on
-- the group explains the alternative method). is_optional = nice to have.
create table if not exists public.recipe_equipment (
  recipe_id     bigint   not null references public.recipes (id) on delete cascade,
  appliance_id  text     not null references public.appliances (id) on delete restrict,
  option_group  smallint not null default 1 check (option_group > 0),
  is_optional   boolean  not null default false,
  note          text,
  primary key (recipe_id, appliance_id)
);

create index if not exists recipe_equipment_appliance_idx on public.recipe_equipment (appliance_id);

alter table public.recipe_equipment enable row level security;

drop policy if exists "recipe_equipment_read_authenticated" on public.recipe_equipment;
create policy "recipe_equipment_read_authenticated" on public.recipe_equipment
  for select to authenticated
  using ((select auth.uid()) is not null);

revoke all on public.recipe_equipment from anon;
revoke insert, update, delete on public.recipe_equipment from authenticated;
grant select on public.recipe_equipment to authenticated;

commit;
