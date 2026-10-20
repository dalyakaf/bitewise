# BiteWise

**Eat smart. Spend less. Study more.**

BiteWise helps university students turn everyday ingredients into quick, affordable meals and weekly plans that fit their demanding academic schedules.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres with Row Level Security)

## Setup

1. Install Node.js 20 LTS or newer.
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and **publishable (anon)** key.
4. In Supabase → **SQL Editor** → **New query**, paste all of `supabase/setup.sql` and click **Run**.
5. In Supabase → **Authentication → Sign In / Providers → Email**, turn **Confirm email** off.
6. `npm run dev` and open http://localhost:3000

## Scripts

| Command             | What it does                 |
| ------------------- | ---------------------------- |
| `npm run dev`       | Start the dev server         |
| `npm run build`     | Production build             |
| `npm run lint`      | ESLint                       |
| `npm run typecheck` | TypeScript type check        |

## Structure

```
src/
  app/                 routes: / , /signup , /login , /app , /app/recipes/[slug]
  components/          shared UI (header, auth form, logout)
  components/app/      /app features: fridge, meal finder, coming soon
  lib/features.ts      feature registry (Study Mode, Favorites, Weekly Planner, Grocery List are "soon")
  lib/matching.ts      fridge ↔ recipe matching (Cook Now / Almost There)
  lib/supabase/        browser, server and middleware Supabase clients
  middleware.ts        session refresh + /app protection
supabase/setup.sql     schema, RLS policies and recipe seed data
```

Recipe costs are illustrative estimates, not live supermarket prices.
