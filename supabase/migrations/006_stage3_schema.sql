-- =============================================================================
-- 006 — Stage 3 schema: My Favorites, Smart Swaps tables, approximate pack prices
-- Run AFTER 005. Safe to re-run. Only ADDS a column and new tables; nothing is
-- dropped and no existing rows are changed.
-- =============================================================================
begin;

-- 1. Approximate pack price per ingredient (Study Mode budget estimates only)
alter table public.ingredients
  add column if not exists typical_pack_price_eur numeric(5, 2)
  check (typical_pack_price_eur is null or typical_pack_price_eur >= 0);


-- 2. My Favorites (private: one row per user per recipe, so no duplicates)
create table if not exists public.favorite_recipes (
  user_id     uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id   bigint not null references public.recipes (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index if not exists favorite_recipes_user_created_idx
  on public.favorite_recipes (user_id, created_at desc);

alter table public.favorite_recipes enable row level security;

drop policy if exists "favorite_recipes_select_own" on public.favorite_recipes;
drop policy if exists "favorite_recipes_insert_own" on public.favorite_recipes;
drop policy if exists "favorite_recipes_delete_own" on public.favorite_recipes;

create policy "favorite_recipes_select_own" on public.favorite_recipes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "favorite_recipes_insert_own" on public.favorite_recipes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "favorite_recipes_delete_own" on public.favorite_recipes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- No update policy: a favourite is only ever added or removed.
revoke all on public.favorite_recipes from anon;
revoke update on public.favorite_recipes from authenticated;
grant select, insert, delete on public.favorite_recipes to authenticated;


-- 3. Smart Swaps: curated substitution rules (shared, read-only for users)
create table if not exists public.ingredient_substitutions (
  id                        bigint generated always as identity primary key,
  original_ingredient_id    bigint not null references public.ingredients (id) on delete cascade,
  substitute_ingredient_id  bigint not null references public.ingredients (id) on delete cascade,
  ratio_note                text not null,
  context_note              text not null,
  adjustment_note           text not null,
  limitation_note           text not null,
  allergen_note             text not null,
  is_adapted                boolean not null default false,
  check (original_ingredient_id <> substitute_ingredient_id),
  unique (original_ingredient_id, substitute_ingredient_id)
);

-- Which rule is valid in which recipe (a rule never applies outside this list)
create table if not exists public.recipe_substitutions (
  recipe_id        bigint  not null references public.recipes (id) on delete cascade,
  substitution_id  bigint  not null references public.ingredient_substitutions (id) on delete cascade,
  extra_minutes    integer not null default 0,
  primary key (recipe_id, substitution_id)
);

create index if not exists recipe_substitutions_substitution_idx
  on public.recipe_substitutions (substitution_id);

alter table public.ingredient_substitutions enable row level security;
alter table public.recipe_substitutions     enable row level security;

drop policy if exists "ingredient_substitutions_read_authenticated" on public.ingredient_substitutions;
drop policy if exists "recipe_substitutions_read_authenticated"     on public.recipe_substitutions;

create policy "ingredient_substitutions_read_authenticated" on public.ingredient_substitutions
  for select to authenticated
  using ((select auth.uid()) is not null);

create policy "recipe_substitutions_read_authenticated" on public.recipe_substitutions
  for select to authenticated
  using ((select auth.uid()) is not null);

revoke all on public.ingredient_substitutions, public.recipe_substitutions from anon;
revoke insert, update, delete on public.ingredient_substitutions, public.recipe_substitutions from authenticated;
grant select on public.ingredient_substitutions, public.recipe_substitutions to authenticated;

commit;
