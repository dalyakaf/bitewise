# BiteWise

**Eat smart. Spend less. Study more.**

BiteWise helps university students turn everyday ingredients into quick, affordable meals and weekly plans that fit their demanding academic schedules.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres with Row Level Security)

## Setup

1. Install Node.js 20 LTS or newer.
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and **publishable (anon)** key.
4. In Supabase → **SQL Editor** → **New query**, run each file below in order (paste the whole file, click **Run**):
   1. `supabase/setup.sql` (Stage 1 base schema)
   2. `supabase/migrations/002_my_kitchen.sql`
   3. `supabase/migrations/003_recipe_schema.sql`
   4. `supabase/migrations/004_ingredient_catalog.sql`
   5. `supabase/migrations/005_recipe_library.sql`
   6. `supabase/migrations/006_stage3_schema.sql` (My Favorites, Smart Swaps tables, pack prices)
   7. `supabase/migrations/007_stage3_catalog_and_swaps.sql` (generated: catalog v2 + Smart Swaps)
5. In Supabase → **Authentication → Sign In / Providers → Email**, turn **Confirm email** off.
6. `npm run dev` and open http://localhost:3000

## Scripts

| Command             | What it does                 |
| ------------------- | ---------------------------- |
| `npm run dev`       | Start the dev server         |
| `npm run build`     | Production build             |
| `npm run lint`      | ESLint                       |
| `npm run typecheck` | TypeScript type check        |
| `npm run seed:check` | Validate recipe/ingredient seed data |
| `npm run seed:build` | Validate and regenerate migrations 005 and 007 (004 is frozen) |

## Structure

```
src/
  app/                 routes: / , /signup , /login , /app , /app/recipes/[slug]
  components/          shared UI (header, auth form, logout)
  components/app/      /app features: fridge, kitchen, meal finder + Study Mode, favorites
  lib/features.ts      feature registry (Weekly Meals and Grocery List are "soon")
  lib/matching.ts      fridge ↔ recipe matching (Cook Now / Smart Swaps / Almost There), equipment
  lib/study-mode.ts    Study Mode ranking and plain-language reasons
  lib/supabase/        browser, server and middleware Supabase clients
  middleware.ts        session refresh + /app protection
supabase/setup.sql     Stage 1 schema, RLS policies and original seed data
supabase/migrations/   incremental migrations (002 kitchen, 003 recipe schema, 004–005 generated)
supabase/seed/         source of truth: ingredient catalog, appliances, pack prices, Smart Swaps, recipe batches
scripts/build-seed.mjs validates seed data (units, food safety, equipment, swap context) and generates 005/007
```

Recipes are edited in `supabase/seed/recipes/*.mjs`, never in the generated SQL.

Recipe costs are illustrative estimates, not live supermarket prices.
