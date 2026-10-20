"use client";

import { useMemo, useState } from "react";
import { ALMOST_THERE_MAX_MISSING, matchRecipe, type MatchStatus } from "@/lib/matching";
import type { Recipe } from "@/lib/types";
import { RecipeCard } from "./RecipeCard";

type Tab = "cook-now" | "almost" | "all";

const TABS: { id: Tab; label: string }[] = [
  { id: "cook-now", label: "Cook Now" },
  { id: "almost", label: "Almost There" },
  { id: "all", label: "All recipes" },
];

const TIME_FILTERS: { label: string; max: number | null }[] = [
  { label: "Any time", max: null },
  { label: "≤ 10 min", max: 10 },
  { label: "≤ 20 min", max: 20 },
  { label: "≤ 30 min", max: 30 },
];

const STATUS_ORDER: Record<MatchStatus, number> = { "cook-now": 0, almost: 1, browse: 2 };

const EMPTY_MESSAGES: Record<Tab, string> = {
  "cook-now": "Nothing you can cook with everything on hand yet. Add a few more ingredients, or check Almost There.",
  almost: `No recipes are ${ALMOST_THERE_MAX_MISSING} or fewer ingredients away yet. Try adding staples like eggs, rice, pasta or onion.`,
  all: "No recipes match this time filter.",
};

type Props = {
  recipes: Recipe[];
  owned: Set<string>;
  unavailable: boolean;
};

export function MealFinder({ recipes, owned, unavailable }: Props) {
  const [tab, setTab] = useState<Tab>("cook-now");
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);

  const matches = useMemo(
    () =>
      recipes
        .map((recipe) => matchRecipe(recipe, owned))
        .filter((m) => maxMinutes === null || m.recipe.total_minutes <= maxMinutes)
        .sort(
          (a, b) =>
            STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
            a.missing.length - b.missing.length ||
            a.recipe.total_minutes - b.recipe.total_minutes,
        ),
    [recipes, owned, maxMinutes],
  );

  const counts: Record<Tab, number> = {
    "cook-now": matches.filter((m) => m.status === "cook-now").length,
    almost: matches.filter((m) => m.status === "almost").length,
    all: matches.length,
  };
  const visible = tab === "all" ? matches : matches.filter((m) => m.status === tab);

  return (
    <section id="meal-finder" aria-labelledby="meal-finder-heading" className="scroll-mt-24">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-terracotta-600">🔎 Smart Meal Finder</p>
        <h2 id="meal-finder-heading" className="font-display text-3xl font-semibold tracking-tight">
          What can I cook?
        </h2>
        <p className="text-ink-soft">
          Recipes update as your fridge changes. Salt, pepper and oil are assumed to be in your cupboard.
        </p>
      </div>

      {unavailable ? (
        <p className="mt-6 rounded-2xl bg-terracotta-50 px-5 py-4 text-terracotta-600">
          Recipes aren&apos;t available right now. If you are setting up BiteWise, run <code>supabase/setup.sql</code>{" "}
          in the Supabase SQL Editor.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div role="group" aria-label="Recipe match" className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tab === t.id ? "bg-ink text-cream" : "border border-line bg-white text-ink hover:border-sage-500"
                  }`}
                >
                  {t.label} <span className={tab === t.id ? "opacity-80" : "text-ink-soft"}>({counts[t.id]})</span>
                </button>
              ))}
            </div>

            <div role="group" aria-label="Cooking time" className="flex flex-wrap gap-2">
              {TIME_FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  aria-pressed={maxMinutes === f.max}
                  onClick={() => setMaxMinutes(f.max)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    maxMinutes === f.max
                      ? "bg-sage-100 text-sage-800 ring-1 ring-sage-500"
                      : "text-ink-soft hover:bg-white hover:text-ink"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-line bg-white/60 px-6 py-10 text-center">
              <p className="text-ink-soft">{EMPTY_MESSAGES[tab]}</p>
              {tab !== "all" && (
                <button
                  type="button"
                  onClick={() => setTab("all")}
                  className="mt-4 rounded-full bg-sage-700 px-5 py-2 text-sm font-semibold text-white hover:bg-sage-800"
                >
                  Browse all recipes
                </button>
              )}
            </div>
          ) : (
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((match) => (
                <RecipeCard key={match.recipe.id} match={match} />
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-ink-soft">Costs are illustrative estimates, not live supermarket prices.</p>
        </>
      )}
    </section>
  );
}
