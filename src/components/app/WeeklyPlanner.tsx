"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MEAL_SLOTS, PLAN_ENTRY_COLUMNS, type MealPlanEntry, type MealSlot, type PlanRecipeSummary } from "@/lib/types";
import { addDays, formatDay, formatWeekRange, mondayOf, weekDays } from "@/lib/week";

const SLOT_LABELS: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
const MAX_PER_SLOT = 3;

type Picker = { mode: "add"; date: string; slot: MealSlot } | { mode: "replace"; entry: MealPlanEntry };

type Props = {
  week: string;
  today: string;
  initialEntries: MealPlanEntry[];
  recipes: PlanRecipeSummary[];
  favoriteIds: number[];
  swapLabels: Record<number, string>;
  unavailable: boolean;
};

export function WeeklyPlanner({ week, today, initialEntries, recipes, favoriteIds, swapLabels, unavailable }: Props) {
  const [entries, setEntries] = useState<MealPlanEntry[]>(initialEntries);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [search, setSearch] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const favorites = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const days = weekDays(week);
  const plannedCount = entries.length;

  const setBusyFor = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  function openPicker(p: Picker) {
    setPicker(p);
    setSearch("");
    dialogRef.current?.showModal();
  }

  async function choose(recipe: PlanRecipeSummary) {
    if (!picker) return;
    const supabase = createClient();
    dialogRef.current?.close();
    if (picker.mode === "add") {
      const { data, error } = await supabase
        .from("meal_plan_entries")
        .insert({ plan_date: picker.date, meal_slot: picker.slot, recipe_id: recipe.id, servings: recipe.servings, swap_ids: [] })
        .select(PLAN_ENTRY_COLUMNS)
        .single();
      if (error || !data) return setNotice({ error: true, text: `We couldn't add ${recipe.title}. Please try again.` });
      setEntries((prev) => [...prev, data as MealPlanEntry]);
      setNotice({ error: false, text: `${recipe.title} added to ${formatDay(picker.date)} · ${SLOT_LABELS[picker.slot]}.` });
    } else {
      const entry = picker.entry;
      setBusyFor(entry.id, true);
      const { error } = await supabase.from("meal_plan_entries").update({ recipe_id: recipe.id, swap_ids: [] }).eq("id", entry.id);
      setBusyFor(entry.id, false);
      if (error) return setNotice({ error: true, text: "We couldn't change that meal. Please try again." });
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, recipe_id: recipe.id, swap_ids: [] } : e)));
      setNotice({ error: false, text: `Replaced with ${recipe.title}.` });
    }
  }

  async function setServings(entry: MealPlanEntry, servings: number) {
    const value = Math.min(12, Math.max(1, servings));
    if (value === entry.servings) return;
    setBusyFor(entry.id, true);
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, servings: value } : e)));
    const { error } = await createClient().from("meal_plan_entries").update({ servings: value }).eq("id", entry.id);
    setBusyFor(entry.id, false);
    if (error) {
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, servings: entry.servings } : e)));
      setNotice({ error: true, text: "We couldn't update the servings. Please try again." });
    }
  }

  async function remove(entry: MealPlanEntry) {
    setBusyFor(entry.id, true);
    const { error } = await createClient().from("meal_plan_entries").delete().eq("id", entry.id);
    setBusyFor(entry.id, false);
    if (error) return setNotice({ error: true, text: "We couldn't remove that meal. Please try again." });
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setNotice({ error: false, text: `${recipeById.get(entry.recipe_id)?.title ?? "Meal"} removed.` });
  }

  const pickerSlot = picker?.mode === "add" ? picker.slot : picker?.entry.meal_slot;
  const query = search.trim().toLowerCase();
  const options = recipes
    .filter((r) => !query || r.title.toLowerCase().includes(query))
    .sort(
      (a, b) =>
        Number(favorites.has(b.id)) - Number(favorites.has(a.id)) ||
        Number(pickerSlot ? b.meal_types.includes(pickerSlot) : 0) - Number(pickerSlot ? a.meal_types.includes(pickerSlot) : 0) ||
        a.title.localeCompare(b.title),
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-sage-700">🗓️ My Weekly Meals</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Plan your week</h1>
          <p className="mt-1 font-medium text-ink" aria-live="polite">
            {formatWeekRange(week)}
          </p>
        </div>
        <nav aria-label="Week" className="flex flex-wrap gap-2">
          <Link href={`/app/plan?week=${addDays(week, -7)}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-sage-500">
            ← Previous week
          </Link>
          {mondayOf(today) !== week && (
            <Link href="/app/plan" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-sage-500">
              This week
            </Link>
          )}
          <Link href={`/app/plan?week=${addDays(week, 7)}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-sage-500">
            Next week →
          </Link>
        </nav>
      </div>

      {unavailable ? (
        <p className="mt-6 rounded-2xl bg-terracotta-50 px-5 py-4 text-terracotta-600">
          My Weekly Meals isn&apos;t available right now. Your fridge and recipes still work as usual.
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-3 rounded-3xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-soft">
              {plannedCount === 0
                ? "Nothing planned yet. Add meals with the + buttons below, or use the 🗓️ button on any recipe."
                : `${plannedCount} meal${plannedCount === 1 ? "" : "s"} planned this week.`}
            </p>
            <Link
              href={`/app/grocery?week=${week}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sage-700 px-5 py-2 text-sm font-semibold text-white hover:bg-sage-800"
            >
              🛒 Grocery list for this week
            </Link>
          </div>

          <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Days of the week">
            {days.map((date) => {
              const isToday = date === today;
              return (
                <li
                  key={date}
                  aria-label={formatDay(date, { weekday: "long", day: "numeric", month: "long" })}
                  className={`rounded-3xl border bg-white p-4 ${isToday ? "border-sage-500 ring-2 ring-sage-100" : "border-line"}`}
                >
                  <h2 className="flex items-baseline justify-between font-display text-lg font-semibold">
                    {formatDay(date, { weekday: "long", day: "numeric", month: "short" })}
                    {isToday && <span className="rounded-full bg-sage-100 px-2 py-0.5 font-sans text-xs font-semibold text-sage-800">Today</span>}
                  </h2>
                  <div className="mt-3 space-y-3">
                    {MEAL_SLOTS.map((slot) => {
                      const slotEntries = entries.filter((e) => e.plan_date === date && e.meal_slot === slot);
                      return (
                        <section key={slot} aria-label={`${formatDay(date, { weekday: "long" })} ${SLOT_LABELS[slot]}`} className="rounded-2xl bg-cream/60 p-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-soft">{SLOT_LABELS[slot]}</h3>
                            {slotEntries.length < MAX_PER_SLOT && (
                              <button
                                type="button"
                                onClick={() => openPicker({ mode: "add", date, slot })}
                                aria-label={`Add a recipe to ${formatDay(date, { weekday: "long" })} ${SLOT_LABELS[slot].toLowerCase()}`}
                                className="rounded-full px-2.5 py-1 text-sm font-semibold text-sage-800 hover:bg-sage-50"
                              >
                                + Add
                              </button>
                            )}
                          </div>
                          {slotEntries.length === 0 ? (
                            <p className="mt-1 text-sm text-ink-soft/80">Nothing planned</p>
                          ) : (
                            <ul className="mt-2 space-y-2">
                              {slotEntries.map((entry) => {
                                const recipe = recipeById.get(entry.recipe_id);
                                const pending = busy.has(entry.id);
                                return (
                                  <li key={entry.id} data-plan-entry={entry.id} className={`rounded-xl bg-white p-3 shadow-sm ${pending ? "opacity-60" : ""}`}>
                                    <div className="flex items-start gap-2">
                                      <span aria-hidden="true" className="text-xl">
                                        {recipe?.emoji ?? "🍽️"}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <Link href={`/app/recipes/${recipe?.slug ?? ""}`} className="font-semibold leading-snug hover:underline">
                                          {recipe?.title ?? "Recipe"}
                                        </Link>
                                        {recipe && <p className="text-xs text-ink-soft">⏱ {recipe.total_minutes} min · recipe serves {recipe.servings}</p>}
                                        {entry.swap_ids.length > 0 && (
                                          <p className="mt-1 text-xs font-medium text-sage-800">
                                            🔄 Adapted: {entry.swap_ids.map((id) => swapLabels[id]).filter(Boolean).join(", ")}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-1" role="group" aria-label={`Servings for ${recipe?.title ?? "meal"}`}>
                                        <button
                                          type="button"
                                          onClick={() => setServings(entry, entry.servings - 1)}
                                          disabled={pending || entry.servings <= 1}
                                          aria-label="Fewer servings"
                                          className="h-8 w-8 rounded-full border border-line text-lg leading-none disabled:opacity-40"
                                        >
                                          −
                                        </button>
                                        <span className="min-w-[5.5rem] text-center text-sm font-semibold" aria-live="polite">
                                          {entry.servings} serving{entry.servings === 1 ? "" : "s"}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setServings(entry, entry.servings + 1)}
                                          disabled={pending || entry.servings >= 12}
                                          aria-label="More servings"
                                          className="h-8 w-8 rounded-full border border-line text-lg leading-none disabled:opacity-40"
                                        >
                                          +
                                        </button>
                                      </div>
                                      <div className="flex gap-1">
                                        <button
                                          type="button"
                                          onClick={() => openPicker({ mode: "replace", entry })}
                                          disabled={pending}
                                          className="rounded-full px-2.5 py-1 text-sm font-semibold text-sage-800 hover:bg-sage-50"
                                        >
                                          Change
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => remove(entry)}
                                          disabled={pending}
                                          aria-label={`Remove ${recipe?.title ?? "meal"}`}
                                          className="rounded-full px-2.5 py-1 text-sm font-semibold text-terracotta-600 hover:bg-terracotta-50"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </section>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <div
        role={notice?.error ? "alert" : "status"}
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
      >
        {notice && (
          <p className={`pointer-events-auto rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg ${notice.error ? "bg-terracotta-600 text-white" : "bg-ink text-cream"}`}>
            {notice.text}
          </p>
        )}
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="picker-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-3xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/40"
      >
        <div className="p-5">
          <h2 id="picker-title" className="font-display text-xl font-semibold">
            {picker?.mode === "replace"
              ? "Change this meal"
              : picker
                ? `Add to ${formatDay(picker.date, { weekday: "long" })} · ${SLOT_LABELS[picker.slot]}`
                : "Choose a recipe"}
          </h2>
          <label className="mt-3 block text-sm font-semibold">
            Search recipes
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. pasta, curry, oats…"
              className="mt-1 block w-full rounded-xl border border-line bg-cream/40 px-3 py-2 text-base"
            />
          </label>
          <p className="mt-2 text-xs text-ink-soft">❤️ Favorites first. To plan an adapted Smart Swaps version, use the 🗓️ button on the recipe.</p>
          <ul className="mt-3 max-h-[50vh] space-y-1 overflow-y-auto" aria-label="Recipes">
            {options.slice(0, 60).map((recipe) => (
              <li key={recipe.id}>
                <button
                  type="button"
                  onClick={() => choose(recipe)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-sage-50"
                >
                  <span aria-hidden="true" className="text-xl">
                    {recipe.emoji}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium">{recipe.title}</span>
                    <span className="block text-xs text-ink-soft">⏱ {recipe.total_minutes} min</span>
                  </span>
                  {favorites.has(recipe.id) && <span aria-label="Favorite">❤️</span>}
                </button>
              </li>
            ))}
            {options.length === 0 && <li className="px-3 py-4 text-sm text-ink-soft">No recipes match “{search}”.</li>}
          </ul>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-sage-500">
              Cancel
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
