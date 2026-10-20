"use client";

import { useMemo, useState } from "react";
import { ALMOST_THERE_MAX_MISSING, matchEquipment, matchRecipe, TAG_LABELS, type MatchStatus } from "@/lib/matching";
import type { Appliance, Recipe } from "@/lib/types";
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

const MEAL_CATEGORIES = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

const TAG_CATEGORIES = [
  "budget",
  "high-protein",
  "vegetarian",
  "vegan",
  "meal-prep",
  "comfort",
  "no-cook",
  "air-fryer",
  "one-pan",
  "fresh",
  "spicy",
];

const STATUS_ORDER: Record<MatchStatus, number> = { "cook-now": 0, almost: 1, browse: 2 };
const PAGE_SIZE = 24;

const EMPTY_MESSAGES: Record<Tab, string> = {
  "cook-now": "Nothing you can cook with everything on hand yet. Add a few more ingredients, or check Almost There.",
  almost: `No recipes are ${ALMOST_THERE_MAX_MISSING} or fewer ingredients away yet. Try adding staples like eggs, rice, pasta or onion.`,
  all: "No recipes match these filters.",
};

type Props = {
  recipes: Recipe[];
  owned: Set<string>;
  appliances: Appliance[];
  ownedAppliances: Set<string>;
  unavailable: boolean;
};

export function MealFinder({ recipes, owned, appliances, ownedAppliances, unavailable }: Props) {
  const [tab, setTab] = useState<Tab>("cook-now");
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [category, setCategory] = useState("all");
  const [kitchenOnly, setKitchenOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const kitchenConfigured = ownedAppliances.size > 0;
  const applyKitchen = kitchenOnly && kitchenConfigured;
  const applianceNames = useMemo(() => Object.fromEntries(appliances.map((a) => [a.id, a.name])), [appliances]);

  const matches = useMemo(
    () =>
      recipes
        .map((recipe) => ({ ...matchRecipe(recipe, owned), equipment: matchEquipment(recipe, ownedAppliances) }))
        .filter((m) => maxMinutes === null || m.recipe.total_minutes <= maxMinutes)
        .filter(
          (m) =>
            category === "all" ||
            m.recipe.meal_types?.includes(category as Recipe["meal_types"][number]) ||
            m.recipe.tags.includes(category),
        )
        .filter((m) => !applyKitchen || m.equipment.canMake)
        .sort(
          (a, b) =>
            STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
            a.missing.length - b.missing.length ||
            a.recipe.total_minutes - b.recipe.total_minutes,
        ),
    [recipes, owned, ownedAppliances, maxMinutes, category, applyKitchen],
  );

  const counts: Record<Tab, number> = {
    "cook-now": matches.filter((m) => m.status === "cook-now").length,
    almost: matches.filter((m) => m.status === "almost").length,
    all: matches.length,
  };
  const filtered = tab === "all" ? matches : matches.filter((m) => m.status === tab);
  const visible = filtered.slice(0, visibleCount);

  function resetPaging<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setVisibleCount(PAGE_SIZE);
    };
  }
  const chooseTab = resetPaging(setTab);
  const chooseTime = resetPaging(setMaxMinutes);
  const chooseCategory = resetPaging(setCategory);
  const chooseKitchenOnly = resetPaging(setKitchenOnly);

  return (
    <section id="meal-finder" aria-labelledby="meal-finder-heading" className="scroll-mt-24">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-terracotta-600">🔎 Smart Meal Finder</p>
        <h2 id="meal-finder-heading" className="font-display text-3xl font-semibold tracking-tight">
          What can I cook?
        </h2>
        <p className="text-ink-soft">
          {recipes.length > 0 ? `${recipes.length} student recipes. ` : ""}
          Matches update as your fridge changes. Salt, pepper and oil are assumed to be in your cupboard.
        </p>
      </div>

      {unavailable ? (
        <p className="mt-6 rounded-2xl bg-terracotta-50 px-5 py-4 text-terracotta-600">
          Recipes aren&apos;t available right now. If you are setting up BiteWise, run the SQL files in{" "}
          <code>supabase/</code> in the Supabase SQL Editor.
        </p>
      ) : (
        <>
          <div className="mt-6 space-y-4">
            <div role="group" aria-label="Ingredient match" className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={tab === t.id}
                  onClick={() => chooseTab(t.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tab === t.id ? "bg-ink text-cream" : "border border-line bg-white text-ink hover:border-sage-500"
                  }`}
                >
                  {t.label} <span className={tab === t.id ? "opacity-80" : "text-ink-soft"}>({counts[t.id]})</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-6">
              <div role="group" aria-label="Cooking time" className="flex flex-wrap gap-2">
                {TIME_FILTERS.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    aria-pressed={maxMinutes === f.max}
                    onClick={() => chooseTime(f.max)}
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

              <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                Category
                <select
                  value={category}
                  onChange={(e) => chooseCategory(e.target.value)}
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink outline-none focus:border-sage-500"
                >
                  <option value="all">All categories</option>
                  <optgroup label="Meal">
                    {MEAL_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Style">
                    {TAG_CATEGORIES.map((id) => (
                      <option key={id} value={id}>
                        {TAG_LABELS[id] ?? id}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>

              <div className="flex flex-col gap-1">
                <label
                  className={`flex items-center gap-2 text-sm font-medium ${kitchenConfigured ? "text-ink" : "text-ink-soft"}`}
                >
                  <input
                    type="checkbox"
                    checked={applyKitchen}
                    disabled={!kitchenConfigured}
                    onChange={(e) => chooseKitchenOnly(e.target.checked)}
                    className="h-4 w-4 accent-sage-700"
                  />
                  🍳 Only recipes my kitchen can make
                </label>
                {!kitchenConfigured && (
                  <a href="#kitchen" className="pl-6 text-xs text-terracotta-600 underline underline-offset-2">
                    Pick your appliances in My Kitchen to use this filter
                  </a>
                )}
              </div>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-line bg-white/60 px-6 py-10 text-center">
              <p className="text-ink-soft">{EMPTY_MESSAGES[tab]}</p>
              {tab !== "all" && (
                <button
                  type="button"
                  onClick={() => chooseTab("all")}
                  className="mt-4 rounded-full bg-sage-700 px-5 py-2 text-sm font-semibold text-white hover:bg-sage-800"
                >
                  Browse all recipes
                </button>
              )}
            </div>
          ) : (
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((match) => (
                <RecipeCard
                  key={match.recipe.id}
                  match={match}
                  equipment={match.equipment}
                  kitchenConfigured={kitchenConfigured}
                  applianceNames={applianceNames}
                />
              ))}
            </ul>
          )}

          {filtered.length > visible.length && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink hover:border-sage-500"
              >
                Show more ({filtered.length - visible.length} left)
              </button>
            </div>
          )}
          <p className="mt-4 text-xs text-ink-soft">
            Costs are rough per-serving estimates, not live supermarket prices.
          </p>
        </>
      )}
    </section>
  );
}
