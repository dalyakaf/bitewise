"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { buildGroceryList, CATEGORY_LABELS, CATEGORY_ORDER, groceryText, type GroceryLine, type PlannedMeal } from "@/lib/grocery";
import { buildMatchContext } from "@/lib/matching";
import { createClient } from "@/lib/supabase/client";
import type { CatalogIngredient, FridgeItem, GroceryManualItem, SwapRule } from "@/lib/types";
import { addDays } from "@/lib/week";

type Props = {
  week: string;
  weekLabel: string;
  thisWeek: string;
  meals: PlannedMeal[];
  fridgeItems: FridgeItem[];
  catalog: CatalogIngredient[];
  swapRules: SwapRule[];
  initialManual: GroceryManualItem[];
  initialChecked: string[];
  unavailable: boolean;
};

const MAX_LENGTH = 120;

export function GroceryListView(props: Props) {
  const { week, weekLabel, thisWeek, meals, fridgeItems, catalog, swapRules, unavailable } = props;
  const [manual, setManual] = useState<GroceryManualItem[]>(props.initialManual);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(props.initialChecked));
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  const list = useMemo(
    () => buildGroceryList(meals, buildMatchContext(fridgeItems, catalog, swapRules)),
    [meals, fridgeItems, catalog, swapRules],
  );
  const text = useMemo(() => groceryText(list, manual, checked, weekLabel), [list, manual, checked, weekLabel]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const mark = (key: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  async function toggleGenerated(line: GroceryLine) {
    const on = !checked.has(line.key);
    mark(line.key, true);
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(line.key);
      else next.delete(line.key);
      return next;
    });
    const { error } = await createClient()
      .from("grocery_item_states")
      .upsert({ week_start: week, item_key: line.key, checked: on, updated_at: new Date().toISOString() }, { onConflict: "user_id,week_start,item_key" });
    mark(line.key, false);
    if (error) {
      setChecked((prev) => {
        const next = new Set(prev);
        if (on) next.delete(line.key);
        else next.add(line.key);
        return next;
      });
      setNotice({ error: true, text: `We couldn't update ${line.name}. Please try again.` });
    }
  }

  async function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newItem.trim();
    if (!name) return setNotice({ error: true, text: "Type an item first." });
    setAdding(true);
    const { data, error } = await createClient()
      .from("grocery_manual_items")
      .insert({ week_start: week, name })
      .select("id, name, checked, created_at")
      .single();
    setAdding(false);
    if (error || !data) return setNotice({ error: true, text: "We couldn't add that item. Please try again." });
    setManual((prev) => [...prev, data as GroceryManualItem]);
    setNewItem("");
  }

  async function toggleManual(item: GroceryManualItem) {
    mark(item.id, true);
    setManual((prev) => prev.map((m) => (m.id === item.id ? { ...m, checked: !item.checked } : m)));
    const { error } = await createClient().from("grocery_manual_items").update({ checked: !item.checked }).eq("id", item.id);
    mark(item.id, false);
    if (error) {
      setManual((prev) => prev.map((m) => (m.id === item.id ? { ...m, checked: item.checked } : m)));
      setNotice({ error: true, text: `We couldn't update ${item.name}. Please try again.` });
    }
  }

  async function removeManual(item: GroceryManualItem) {
    mark(item.id, true);
    const { error } = await createClient().from("grocery_manual_items").delete().eq("id", item.id);
    mark(item.id, false);
    if (error) return setNotice({ error: true, text: `We couldn't remove ${item.name}. Please try again.` });
    setManual((prev) => prev.filter((m) => m.id !== item.id));
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ error: false, text: "Shopping list copied." });
    } catch {
      setNotice({ error: true, text: "Copy isn't available here. Select the text below and copy it instead." });
    }
  }

  const toBuyCount = list.toBuy.filter((l) => !checked.has(l.key)).length;

  const renderLine = (line: GroceryLine, fridgeSection: boolean) => {
    const done = checked.has(line.key);
    return (
      <li key={line.key} data-grocery-item={line.name} className="flex items-start gap-3 py-2.5">
        <input
          id={`g-${line.key}`}
          type="checkbox"
          checked={done}
          disabled={busy.has(line.key)}
          onChange={() => toggleGenerated(line)}
          className="mt-1 h-5 w-5 shrink-0 accent-sage-700"
        />
        <label htmlFor={`g-${line.key}`} className="min-w-0 flex-1 cursor-pointer">
          <span className={`font-semibold capitalize ${done ? "text-ink-soft line-through" : ""}`}>{line.name}</span>
          {line.quantities.length > 0 && <span className="text-ink"> — {line.quantities.join(" + ")}</span>}
          {fridgeSection && (
            <span className="block text-xs font-medium text-sage-800">
              You have “{line.fridgeName}” in My Fridge — check you have enough.
            </span>
          )}
          {line.swapGuidance.map((g) => (
            <span key={g} className="block text-xs text-sage-800">
              🔄 Smart Swap: {g}
            </span>
          ))}
          <span className="block text-xs text-ink-soft">For: {line.recipes.join(", ")}</span>
        </label>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-sage-700">🛒 Smart Grocery List</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Buy only what you need</h1>
          <p className="mt-1 font-medium">{weekLabel}</p>
        </div>
        <nav aria-label="Week" className="flex flex-wrap gap-2">
          <Link href={`/app/grocery?week=${addDays(week, -7)}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-sage-500">
            ← Previous week
          </Link>
          {thisWeek !== week && (
            <Link href="/app/grocery" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-sage-500">
              This week
            </Link>
          )}
          <Link href={`/app/grocery?week=${addDays(week, 7)}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-sage-500">
            Next week →
          </Link>
        </nav>
      </div>

      {unavailable ? (
        <p className="mt-6 rounded-2xl bg-terracotta-50 px-5 py-4 text-terracotta-600">
          The grocery list isn&apos;t available right now. Your fridge and recipes still work as usual.
        </p>
      ) : (
        <div className="print:hidden">
          <div className="mt-5 flex flex-col gap-3 rounded-3xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-soft" aria-live="polite">
              {list.mealCount === 0
                ? "No meals planned for this week yet."
                : `Built from ${list.mealCount} planned meal${list.mealCount === 1 ? "" : "s"}: ${toBuyCount} to buy, ${list.inFridge.length} already in your fridge.`}
            </p>
            <Link href={`/app/plan?week=${week}`} className="rounded-full border border-sage-500 px-4 py-2 text-center text-sm font-semibold text-sage-800 hover:bg-sage-50">
              🗓️ Edit this week&apos;s meals
            </Link>
          </div>

          {list.mealCount === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-line bg-white/60 px-6 py-10 text-center">
              <p className="text-3xl" aria-hidden="true">
                🧺
              </p>
              <p className="mt-2 font-semibold">Your list builds itself</p>
              <p className="mt-1 text-sm text-ink-soft">
                Plan some meals in My Weekly Meals and their ingredients appear here, combined and scaled to your servings.
              </p>
              <Link href={`/app/plan?week=${week}`} className="mt-4 inline-block rounded-full bg-sage-700 px-5 py-2 text-sm font-semibold text-white hover:bg-sage-800">
                Plan this week
              </Link>
            </div>
          ) : (
            <>
              <section aria-labelledby="to-buy-heading" className="mt-6 rounded-3xl border border-line bg-white p-5">
                <h2 id="to-buy-heading" className="font-display text-2xl font-semibold">
                  To Buy
                </h2>
                {list.toBuy.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-soft">Nothing to buy: everything is already in your fridge.</p>
                ) : (
                  CATEGORY_ORDER.map((category) => {
                    const lines = list.toBuy.filter((l) => l.category === category);
                    if (lines.length === 0) return null;
                    return (
                      <div key={category} className="mt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-soft">{CATEGORY_LABELS[category]}</h3>
                        <ul className="divide-y divide-line" aria-label={`To buy: ${CATEGORY_LABELS[category]}`}>
                          {lines.map((l) => renderLine(l, false))}
                        </ul>
                      </div>
                    );
                  })
                )}
              </section>

              {list.inFridge.length > 0 && (
                <section aria-labelledby="in-fridge-heading" className="mt-6 rounded-3xl border border-sage-200 bg-sage-50 p-5">
                  <h2 id="in-fridge-heading" className="font-display text-2xl font-semibold text-sage-800">
                    Already in My Fridge — check quantity
                  </h2>
                  <p className="mt-1 text-sm text-sage-800">
                    My Fridge stores ingredient names, not amounts, so check you have enough before you skip these.
                  </p>
                  <ul className="mt-2 divide-y divide-sage-200" aria-label="Already in My Fridge">
                    {list.inFridge.map((l) => renderLine(l, true))}
                  </ul>
                </section>
              )}

              {(list.staples.length > 0 || list.optionalSkipped > 0) && (
                <p className="mt-4 text-sm text-ink-soft">
                  {list.staples.length > 0 && <>Pantry basics assumed (not listed): {list.staples.join(", ")}. </>}
                  {list.optionalSkipped > 0 && <>Optional extras are left out; see each recipe if you want them.</>}
                </p>
              )}
            </>
          )}

          <section aria-labelledby="extra-heading" className="mt-6 rounded-3xl border border-line bg-white p-5">
            <h2 id="extra-heading" className="font-display text-2xl font-semibold">
              My extra items
            </h2>
            <p className="mt-1 text-sm text-ink-soft">Anything else you need this week. These stay even when your meal plan changes.</p>
            <form onSubmit={addManual} className="mt-3 flex gap-2">
              <label htmlFor="manual-item" className="sr-only">
                Extra grocery item
              </label>
              <input
                id="manual-item"
                type="text"
                maxLength={MAX_LENGTH}
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="e.g. coffee, washing-up liquid…"
                className="min-h-11 flex-1 rounded-xl border border-line bg-cream/40 px-4 text-base"
              />
              <button type="submit" disabled={adding} className="rounded-xl bg-sage-700 px-5 text-sm font-semibold text-white hover:bg-sage-800 disabled:opacity-60">
                {adding ? "Adding…" : "Add item"}
              </button>
            </form>
            {manual.length > 0 && (
              <ul className="mt-3 divide-y divide-line" aria-label="My extra items">
                {manual.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <input
                      id={`m-${item.id}`}
                      type="checkbox"
                      checked={item.checked}
                      disabled={busy.has(item.id)}
                      onChange={() => toggleManual(item)}
                      className="h-5 w-5 accent-sage-700"
                    />
                    <label htmlFor={`m-${item.id}`} className={`flex-1 cursor-pointer ${item.checked ? "text-ink-soft line-through" : ""}`}>
                      {item.name}
                    </label>
                    <button
                      type="button"
                      onClick={() => removeManual(item)}
                      disabled={busy.has(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="rounded-full px-2.5 py-1 text-sm font-semibold text-terracotta-600 hover:bg-terracotta-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <details className="mt-6 rounded-3xl border border-line bg-white p-5">
            <summary className="cursor-pointer font-semibold">📋 Copy or print as text</summary>
            <textarea readOnly value={text} aria-label="Shopping list as text" rows={12} className="mt-3 w-full rounded-xl border border-line bg-cream/40 p-3 font-mono text-sm" />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={copyText} className="rounded-full bg-sage-700 px-5 py-2 text-sm font-semibold text-white hover:bg-sage-800">
                Copy list
              </button>
              <button type="button" onClick={() => window.print()} className="rounded-full border border-line px-5 py-2 text-sm font-semibold hover:border-sage-500">
                Print
              </button>
            </div>
          </details>
        </div>
      )}

      {/* Only this plain-text version is printed. */}
      <pre className="hidden whitespace-pre-wrap font-mono text-sm print:block">{text}</pre>

      <div
        role={notice?.error ? "alert" : "status"}
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 print:hidden"
      >
        {notice && (
          <p className={`pointer-events-auto rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg ${notice.error ? "bg-terracotta-600 text-white" : "bg-ink text-cream"}`}>
            {notice.text}
          </p>
        )}
      </div>
    </div>
  );
}
