"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { MEAL_SLOTS, type MealSlot, type MealType } from "@/lib/types";
import { formatDay, mondayOf, todayIso } from "@/lib/week";

export type PlanSwapOption = { ruleId: number; label: string };

type Props = {
  recipe: { id: number; title: string; servings: number; meal_types: MealType[] };
  /** Smart Swaps currently available from the user's fridge for this recipe. */
  swaps?: PlanSwapOption[];
  variant?: "icon" | "full";
};

const SLOT_LABELS: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

function defaultSlot(mealTypes: MealType[]): MealSlot {
  if (mealTypes.includes("dinner")) return "dinner";
  if (mealTypes.includes("lunch")) return "lunch";
  if (mealTypes.includes("breakfast")) return "breakfast";
  return "lunch";
}

export function AddToPlanButton({ recipe, swaps = [], variant = "icon" }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<MealSlot>(defaultSlot(recipe.meal_types));
  const [servings, setServings] = useState(recipe.servings);
  const [useSwaps, setUseSwaps] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; week?: string } | null>(null);

  function open() {
    setDate(todayIso());
    setResult(null);
    dialogRef.current?.showModal();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    const { error } = await createClient()
      .from("meal_plan_entries")
      .insert({
        plan_date: date,
        meal_slot: slot,
        recipe_id: recipe.id,
        servings,
        swap_ids: useSwaps ? swaps.map((s) => s.ruleId) : [],
      });
    setPending(false);
    if (error) {
      setResult({ ok: false, text: "We couldn't add this to your plan. Please try again." });
      return;
    }
    setResult({
      ok: true,
      text: `Added to ${formatDay(date, { weekday: "long", day: "numeric", month: "short" })} · ${SLOT_LABELS[slot]}${useSwaps && swaps.length ? " (adapted with your swaps)" : ""}.`,
      week: mondayOf(date),
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={open}
          aria-label={`Add ${recipe.title} to My Weekly Meals`}
          title="Add to My Weekly Meals"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white/90 text-ink-soft shadow-sm backdrop-blur transition hover:scale-105 hover:text-sage-800"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3.5" y="5" width="17" height="15" rx="3" />
            <path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={open}
          className="inline-flex items-center gap-2 rounded-full border border-sage-500 bg-white px-4 py-2 text-sm font-semibold text-sage-800 transition hover:bg-sage-50"
        >
          <span aria-hidden="true">🗓️</span> Add to My Weekly Meals
        </button>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={`${formId}-title`}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/40"
      >
        <form onSubmit={submit} className="space-y-4 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-sage-700">🗓️ My Weekly Meals</p>
            <h2 id={`${formId}-title`} className="mt-1 font-display text-2xl font-semibold leading-tight">
              {recipe.title}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold">
              Day
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-line bg-cream/40 px-3 py-2 text-base"
              />
            </label>
            <label className="text-sm font-semibold">
              Meal
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value as MealSlot)}
                className="mt-1 block w-full rounded-xl border border-line bg-cream/40 px-3 py-2 text-base"
              >
                {MEAL_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {SLOT_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-semibold">
            Servings
            <input
              type="number"
              min={1}
              max={12}
              required
              value={servings}
              onChange={(e) => setServings(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-1 block w-24 rounded-xl border border-line bg-cream/40 px-3 py-2 text-base"
            />
            <span className="mt-1 block text-xs font-normal text-ink-soft">The recipe makes {recipe.servings}. Grocery amounts scale to your choice.</span>
          </label>

          {swaps.length > 0 && (
            <label className="flex items-start gap-3 rounded-2xl bg-sage-50 p-3 text-sm">
              <input type="checkbox" checked={useSwaps} onChange={(e) => setUseSwaps(e.target.checked)} className="mt-0.5 h-4 w-4 accent-sage-700" />
              <span>
                <span className="font-semibold text-sage-800">Use my Smart Swaps (adapted version)</span>
                <span className="block text-ink-soft">{swaps.map((s) => s.label).join(", ")}. Your grocery list will use the swapped ingredients.</span>
              </span>
            </label>
          )}

          <div aria-live="polite">
            {result && (
              <p role={result.ok ? "status" : "alert"} className={`rounded-xl px-3 py-2 text-sm font-medium ${result.ok ? "bg-sage-50 text-sage-800" : "bg-terracotta-50 text-terracotta-600"}`}>
                {result.text}{" "}
                {result.ok && result.week && (
                  <Link href={`/app/plan?week=${result.week}`} className="underline underline-offset-2">
                    View my week
                  </Link>
                )}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-sage-500"
            >
              {result?.ok ? "Done" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-sage-700 px-5 py-2 text-sm font-semibold text-white hover:bg-sage-800 disabled:opacity-60"
            >
              {pending ? "Adding…" : result?.ok ? "Add again" : "Add to plan"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
