"use client";

import { useMemo, useState } from "react";
import { ALMOST_THERE_MAX_MISSING, TAG_LABELS, type MatchStatus } from "@/lib/matching";
import { STUDY_BUDGETS, STUDY_TIMES, studyRecommendations, type StudyEntry } from "@/lib/study-mode";
import type { Recipe } from "@/lib/types";
import { RecipeCard, type FavoriteControl } from "./RecipeCard";

type Tab = "cook-now" | "smart-swap" | "almost" | "all";

const TABS: { id: Tab; label: string }[] = [
  { id: "cook-now", label: "Cook Now" },
  { id: "smart-swap", label: "Smart Swaps" },
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

const STATUS_ORDER: Record<MatchStatus, number> = { "cook-now": 0, "smart-swap": 1, almost: 2, browse: 3 };
const PAGE_SIZE = 24;

const EMPTY_MESSAGES: Record<Tab, string> = {
  "cook-now": "Nothing you can cook with exactly what's on hand yet. Check Smart Swaps and Almost There, or add a few more ingredients.",
  "smart-swap": "No recipes can be completed with swaps from your fridge yet. Swaps appear when you own a suitable alternative for a missing ingredient.",
  almost: `No recipes are ${ALMOST_THERE_MAX_MISSING} or fewer ingredients away yet. Try adding staples like eggs, rice, pasta or onion.`,
  all: "No recipes match these filters.",
};

type Props = {
  entries: StudyEntry[];
  recipeCount: number;
  applianceNames: Record<string, string>;
  ownedAppliances: Set<string>;
  unavailable: boolean;
  favoriteFor?: (recipe: Recipe) => FavoriteControl | undefined;
  planner?: boolean;
};

function chip(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-medium transition ${
    active ? "bg-sage-100 text-sage-800 ring-1 ring-sage-500" : "text-ink-soft hover:bg-white hover:text-ink"
  }`;
}

export function MealFinder({ entries, recipeCount, applianceNames, ownedAppliances, unavailable, favoriteFor, planner }: Props) {
  const [tab, setTab] = useState<Tab>("cook-now");
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [category, setCategory] = useState("all");
  const [kitchenOnly, setKitchenOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [studyOn, setStudyOn] = useState(false);
  const [studyMinutes, setStudyMinutes] = useState<number>(20);
  const [studyBudget, setStudyBudget] = useState<number>(0);

  const kitchenConfigured = ownedAppliances.size > 0;
  const applyKitchen = kitchenOnly && kitchenConfigured;

  const matches = useMemo(
    () =>
      entries
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
            a.stillMissing.length - b.stillMissing.length ||
            a.recipe.total_minutes - b.recipe.total_minutes,
        ),
    [entries, maxMinutes, category, applyKitchen],
  );

  const study = useMemo(
    () =>
      studyOn
        ? studyRecommendations(entries, {
            maxMinutes: studyMinutes,
            budget: studyBudget,
            kitchenOnly,
            kitchenConfigured,
            applianceNames,
          })
        : [],
    [studyOn, entries, studyMinutes, studyBudget, kitchenOnly, kitchenConfigured, applianceNames],
  );

  const counts: Record<Tab, number> = {
    "cook-now": matches.filter((m) => m.status === "cook-now").length,
    "smart-swap": matches.filter((m) => m.status === "smart-swap").length,
    almost: matches.filter((m) => m.status === "almost").length,
    all: matches.length,
  };
  const filtered = tab === "all" ? matches : matches.filter((m) => m.status === tab);
  const listLength = studyOn ? study.length : filtered.length;

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
  const chooseStudy = resetPaging(setStudyOn);
  const chooseStudyMinutes = resetPaging(setStudyMinutes);
  const chooseStudyBudget = resetPaging(setStudyBudget);

  const cardProps = (entry: StudyEntry) => ({
    match: entry,
    equipment: entry.equipment,
    kitchenConfigured,
    applianceNames,
    favorite: favoriteFor?.(entry.recipe),
    planner,
  });

  return (
    <section id="meal-finder" aria-labelledby="meal-finder-heading" className="scroll-mt-24">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-terracotta-600">🔎 Smart Meal Finder</p>
        <h2 id="meal-finder-heading" className="font-display text-3xl font-semibold tracking-tight">
          What can I cook?
        </h2>
        <p className="text-ink-soft">
          {recipeCount > 0 ? `${recipeCount} student recipes. ` : ""}
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
          {/* Study Mode switch */}
          <div
            id="study-mode"
            className={`mt-6 scroll-mt-24 rounded-3xl border p-4 transition sm:p-5 ${
              studyOn ? "border-sage-500 bg-sage-50" : "border-line bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold" id="study-mode-label">
                  📚 Study Mode
                </p>
                <p className="text-sm text-ink-soft" id="study-mode-description">
                  Short on time or money? Get the most practical meals first.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={studyOn}
                aria-labelledby="study-mode-label"
                aria-describedby="study-mode-description"
                onClick={() => chooseStudy(!studyOn)}
                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${
                  studyOn ? "bg-sage-700" : "bg-line"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-6 w-6 rounded-full bg-white shadow transition ${studyOn ? "translate-x-7" : "translate-x-1"}`}
                />
              </button>
            </div>

            {studyOn && (
              <div className="mt-4 space-y-3">
                <div role="radiogroup" aria-label="Time available" className="flex flex-wrap items-center gap-2">
                  <span className="w-full text-sm font-semibold text-ink-soft sm:w-auto">I have</span>
                  {STUDY_TIMES.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      role="radio"
                      aria-checked={studyMinutes === minutes}
                      onClick={() => chooseStudyMinutes(minutes)}
                      className={chip(studyMinutes === minutes)}
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
                <div role="radiogroup" aria-label="Extra spending" className="flex flex-wrap items-center gap-2">
                  <span className="w-full text-sm font-semibold text-ink-soft sm:w-auto">and can spend</span>
                  {STUDY_BUDGETS.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      role="radio"
                      aria-checked={studyBudget === b.value}
                      onClick={() => chooseStudyBudget(b.value)}
                      title={b.hint}
                      className={chip(studyBudget === b.value)}
                    >
                      {b.label}
                      <span className="sr-only"> ({b.hint})</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-ink-soft">
                  Spending is a rough estimate of the extra shopping, based on typical small-pack supermarket prices for
                  each missing ingredient. It is not a live price and doesn&apos;t count what you might already have at
                  home. Times are total prep + cooking, including any changes from smart swaps.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-4">
            {!studyOn && (
              <>
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
                {tab === "smart-swap" && (
                  <p className="text-sm text-ink-soft">
                    🔄 Missing an ingredient? Make it work with what you&apos;ve got. These are adapted versions: each
                    card shows the swap, and the recipe page explains exactly what changes.
                  </p>
                )}
              </>
            )}

            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-6">
              {!studyOn && (
                <>
                  <div role="group" aria-label="Cooking time" className="flex flex-wrap gap-2">
                    {TIME_FILTERS.map((f) => (
                      <button
                        key={f.label}
                        type="button"
                        aria-pressed={maxMinutes === f.max}
                        onClick={() => chooseTime(f.max)}
                        className={chip(maxMinutes === f.max)}
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
                </>
              )}

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

          {studyOn ? (
            study.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-line bg-white/60 px-6 py-10 text-center">
                <p className="text-ink-soft">
                  No meals fit {studyMinutes} minutes and{" "}
                  {studyBudget === 0 ? "no extra shopping" : `up to €${studyBudget} of extra shopping`} yet. Try more
                  time, a bigger budget, or add more ingredients to your fridge.
                </p>
              </div>
            ) : (
              <>
                <p className="mt-6 text-sm font-medium text-sage-800" aria-live="polite">
                  {study.length} meal{study.length === 1 ? "" : "s"} for {studyMinutes} minutes and{" "}
                  {studyBudget === 0 ? "€0 extra" : `up to €${studyBudget} extra`}, most practical first.
                </p>
                <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Study Mode recommendations">
                  {study.slice(0, visibleCount).map(({ entry, reasons }) => (
                    <RecipeCard key={entry.recipe.id} {...cardProps(entry)} reasons={reasons} />
                  ))}
                </ul>
              </>
            )
          ) : filtered.length === 0 ? (
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
              {filtered.slice(0, visibleCount).map((entry) => (
                <RecipeCard key={entry.recipe.id} {...cardProps(entry)} />
              ))}
            </ul>
          )}

          {listLength > visibleCount && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink hover:border-sage-500"
              >
                Show more ({listLength - visibleCount} left)
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
