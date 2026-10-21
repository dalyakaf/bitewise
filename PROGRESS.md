# BiteWise — Progress

_Last updated: 22 October 2026_

**Status:** Stage 1 is done and working. Stage 2 code is done and committed, but needs **4 Supabase migrations** before recipes and My Kitchen work. Nothing has been pushed to GitHub or deployed to Vercel yet.

The grading contract in `CLAUDE.md` is unchanged and still met. Core checks passed against the real Supabase project on 21 Oct 2026.

---

## ✅ Done

### Setup
- **Node.js 22** is installed in `~/.local/node` (no admin needed). It's on the PATH through `~/.zprofile`, so new terminals have `node` and `npm`.
- **Dependencies:** installed, with versions pinned in `package-lock.json`.
- **Git:** initialised locally on branch `main`. `.gitignore` excludes `.env.local`, all other `.env*` files, `node_modules` and `.next`. There's no GitHub remote yet.
- **Supabase:**
  - `supabase/setup.sql` has been run (25 recipes, 47 ingredients, 159 links).
  - **Confirm email** is off.
  - `.env.local` contains only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

### Stage 1 (commits `495e771`, `6e72a57`)
- **Pages:** `/` landing page, `/signup`, `/login`, and `/app`, which only logged-in users can open.
- **Auth:** Supabase email and password. Sign-up and login go straight to `/app`, with no email confirmation, CAPTCHA or onboarding.
- **Contract testids:**
  - `signup-email`, `signup-password`, `signup-submit`
  - `login-email`, `login-password`, `login-submit`
  - `logout`, in the header on every logged-in page
  - `core-input`, `core-submit`, `core-item`
- **My Smart Fridge:** ingredients are saved in Supabase and private to each user. Any text is accepted, and items can be deleted.
- **Smart Meal Finder:** Cook Now, Almost There (missing 1–2 ingredients), All recipes, time filters, and a details page for each recipe.

### Stage 2 (commit `7f5d193`) — code done; database migrations pending
- **Ingredient catalog:** 157 ingredients, with plurals, spelling variants and leading amounts ("2 eggs") recognised. Synonyms only, never substitutes.
- **Fridge:**
  - Autocomplete suggestions, with free text still allowed.
  - Each item shows one of three states: used in recipes, recognised but not in any recipe yet, or not recognised.
  - The text the user types is saved exactly as entered.
- **Recipe library:** 123 recipes (the original 25 plus 98 new). Each has prep and cook time, servings, a cost band, metric quantities, equipment, tools and steps.
- **Automatic recipe checks:** `npm run seed:check` checks every recipe for:
  - catalog ingredients and metric units only
  - poultry and mince cooked to "75°C / no pink"
  - a doneness cue for fish
  - storage notes for leftovers: 2 days, and cooked rice within 24 hours
  - equipment alternatives that come with written instructions
- **My Kitchen:** an optional section on `/app` for 8 appliances, saved per user.
- **Equipment:**
  - An "Only recipes my kitchen can make" filter.
  - Ingredient match and equipment match are shown on separate lines.
  - Every recipe page has an "Equipment needed" section.
- **Browsing:** a category filter (meal type and style) and a "Show more" button.
- **Checks:** lint, the type check and the production build pass. The end-to-end check (19 checks) passed before the migrations:
  - anonymous users are blocked from every table
  - sign-up gives a session straight away
  - the bot-style text saves exactly
  - saved items are still there after logging in again
  - users can't see or change each other's data
  - logged-in `/app` shows all four testids and the saved text
- **Test accounts:** the check created `bitewise.qa.a.1p8sjg@example.com` and `bitewise.qa.b.1p8sjg@example.com`. They can be deleted in Supabase under **Authentication → Users**.

---

## ⏳ Pending: 4 Supabase migrations (not run yet)

Run them **in this order** in Supabase **SQL Editor → New query**. For each one, paste the whole file and click **Run**.

| # | File | Expected result |
|---|------|-----------------|
| 1 | `supabase/migrations/002_my_kitchen.sql` | `appliances: 8` |
| 2 | `supabase/migrations/003_recipe_schema.sql` | "Success. No rows returned" |
| 3 | `supabase/migrations/004_ingredient_catalog.sql` | `ingredients_in_catalog: 157` |
| 4 | `supabase/migrations/005_recipe_library.sql` | `recipes: 123`, `recipe_ingredient_links: 1099`, `recipe_equipment_links: 155` |

- **Nothing is dropped:** existing users and fridge items are untouched, and every file is safe to run again.
- **If a file errors:** it rolls back completely. Copy the error message for Claude.
- **File 005 is about 218 KB:** if pasting is awkward, open it in a text editor and copy everything.
- **Until these run,** `/app` still works for the fridge but shows "Recipes aren't available right now." That's expected.

---

## 📋 Tomorrow, step by step

1. Open Terminal and go to the project with `cd ~/Desktop/bitewise`. Check Node with `node -v`; it should print v22.x.
2. Run the 4 migrations above in order, and check each result matches the table.
3. Start the app with `npm run dev`, then open http://localhost:3000.
4. Ask Claude to re-run the end-to-end checks with the My Kitchen checks included. They cover appliances, privacy between accounts, ≥ 100 recipes and ≥ 150 ingredients.
5. Test by hand:
   - [ ] Sign up and land on `/app`.
   - [ ] Type `QA-7F3K2A grading bot test` and click **Add Ingredient**. It appears, and is still there after a refresh.
   - [ ] Type `tom`: suggestions appear, and you can still add your own text.
   - [ ] Add `eggs`, `rice`, `frozen peas`, `spring onion` and `soy sauce`. Egg Fried Rice appears under **Cook Now**.
   - [ ] In My Kitchen, select only **Microwave**, then tick "Only recipes my kitchen can make". Only microwave or no-cook recipes remain.
   - [ ] Open a recipe and check its "Equipment needed" section.
   - [ ] Log out and back in: the fridge and appliances are still there.
   - [ ] A second account sees an empty fridge and kitchen.
6. When everything passes, decide on deployment: create the GitHub repo, push, import it to Vercel, and add the two environment variables. Claude will only push or deploy when you ask.

---

## 🚧 Stage 3 (local commit, NOT deployed): My Favorites, Study Mode, Smart Swaps

Production (https://bitewise-plum.vercel.app) still runs Stage 2 (`df5e452`).

- **My Favorites:**
  - A heart on every recipe card and on each recipe page, plus a My Favorites section on `/app` with an empty state and loading/error feedback.
  - Stored in `favorite_recipes` with a primary key on (user, recipe), so there are no duplicates. Each user can only read, add and delete their own favourites (RLS).
- **Study Mode:**
  - An optional switch in Smart Meal Finder: time (10/15/20/30 min, total prep + cook including swap changes) and extra spending (€0 / ≤ €5 / ≤ €10).
  - Ranked by: nothing to buy → fewer swaps → lower cost → shorter time. Each card shows plain-language reasons.
  - Costs are rough estimates from approximate pack prices; they're labelled as such and aren't live prices.
- **Smart Swaps:**
  - 52 curated rules give 234 swaps, each approved for a specific recipe. The generator checks recipe context, diet and double-counting.
  - A new Smart Swaps tab sits between Cook Now and Almost There, and swaps never count as Cook Now.
  - Recipe pages explain each swap: original ingredient, your alternative, quantity, method changes, limitations and allergens.
- **Brown rice** is now its own ingredient (a swap for white rice), not a synonym.
- **Ingredient deletion:** an item now disappears only after Supabase confirms the delete.
- **Migrations to run, in order:**
  1. `supabase/migrations/006_stage3_schema.sql`
  2. `supabase/migrations/007_stage3_catalog_and_swaps.sql`
- **Migrations 006 and 007 were run on 22 Oct 2026.** Database counts confirmed: 158 ingredients, 52 swap rules, 234 recipe swaps.
- **Tests passed locally on 22 Oct 2026** (production build + real Supabase):
  - database: 48/48
  - Stage 3 browser: 58/58, twice
  - contract/regression browser: 46/46
  - lint, type check, recipe validation and build all pass
- **Next:** push (with approval), then Vercel deploys. Re-run the contract checks on the live URL.

---

## 🛡️ Form interactivity fix (local commit, NOT deployed yet)
- **The problem:** clicks in the ~0.3 s before React became interactive did a plain browser form submit. Sign-up and login put the email and password in the URL. The fridge form reloaded `/app?ingredient=…` and saved nothing. Text typed before React took over was wiped.
- **The fix:**
  - Sign-up, login, logout and the fridge form use Next.js Server Actions, so they always POST and work before or without JavaScript.
  - A fridge save made before interactivity redirects back to `/app`, so a refresh can't save it twice.
  - The fridge input keeps text typed before React takes over.
- **Tested locally:**
  - early-click + JavaScript-disabled: 53/53, twice
  - typed-before-interactive: 4/4
  - contract: 46/46, twice
  - Stage 3: 58/58, twice
  - database: 48/48
  - grader-style bot: 5/5
  - lint, type check and build all pass
- Needs push approval; there are no database changes.

---

## 🗓️ Stage 4 (local commit, NOT deployed): My Weekly Meals + Smart Grocery List
- **`/app/plan`:**
  - Monday–Sunday with breakfast, lunch and dinner, up to 3 recipes per slot.
  - Add, change and remove meals; adjust servings (1–12); move between weeks.
  - The 🗓️ button on Meal Finder cards, Favorites and recipe pages can plan the adapted Smart Swaps version.
- **`/app/grocery`:**
  - Built from that week's plan and scaled by servings.
  - Amounts combine only when the units match (the one conversion is 1 tbsp = 3 tsp).
  - Items in My Fridge are marked "check quantity"; nothing is subtracted.
  - Chosen swaps use the substitute with its guidance text.
  - Manual items; checkboxes saved per week; copy/print as plain text; grouped by category.
- **Migrations to run, in order:**
  1. `supabase/migrations/008_planner_grocery_schema.sql`
  2. `supabase/migrations/009_recipe_ingredient_amounts.sql`
- **Already verified before the migrations:** the contract suite 46/46, early-click/no-JS 53/53 and Stage 3 58/58 still pass, and the new pages degrade gracefully.
- **Migrations 008 and 009 were run on 22 Oct 2026:** 1099 ingredients with units, 947 with amounts.
- **Tested after the migrations** (local production build + real Supabase):
  - Stage 4 browser: 43/43, twice
  - database (stages 1–4): 64/64
  - contract: 46/46, twice
  - immediate-click + no-JS: 53/53, twice
  - slow-JS: 4/4
  - Stage 3: 58/58
  - grader-style bot: 5/5
  - no browser errors on 9 pages
  - lint, type check, recipe validation, unit tests (27) and build all pass
- **Next:** push (with approval), then Vercel deploys (use Create Deployment if it doesn't start), then re-run the suites on the live URL.

---

## 🔮 Remaining features (not started)
Each is listed in `src/lib/features.ts` as `status: "soon"`:
- All originally planned features are now built (Stage 4 pending deployment).

## ⚠️ Known notes
- **Security warning:** `npm audit` flags the copy of PostCSS that Next.js 15 ships with. It only processes our own CSS at build time, so it doesn't affect the running app. The fix requires Next.js 16, which changes how the login protection is set up, so it's deferred.
- **Recipe costs:** rough per-serving estimates shown as bands, not live supermarket prices.
- **Before any public launch:** have the IE Communications team review the landing page and other public copy.
