"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { addFridgeItemAction, type AddFridgeItemState } from "@/app/app/actions";
import { ingredientKey, recognise, suggestIngredients, type CatalogIndex, type Recognition } from "@/lib/matching";
import { createClient } from "@/lib/supabase/client";
import type { CatalogIngredient, FridgeItem } from "@/lib/types";

const MAX_LENGTH = 120;
const INITIAL_ADD_STATE: AddFridgeItemState = { status: "idle", error: null, item: null, submitted: "" };
const QUICK_ADD = ["Eggs", "Rice", "Pasta", "Canned tomatoes", "Onion", "Garlic", "Cheese", "Chickpeas", "Bread"];

const RECOGNITION_STYLES: Record<Recognition, { item: string; dot: string | null; label: string }> = {
  "in-recipes": {
    item: "border-sage-200 bg-sage-50 text-sage-800",
    dot: "bg-sage-500",
    label: "Used in our recipes",
  },
  "in-swaps": {
    item: "border-sage-200 bg-sage-50 text-sage-800",
    dot: "border-2 border-sage-500 bg-sage-100",
    label: "Used in our recipes as a Smart Swap",
  },
  recognised: {
    item: "border-terracotta-100 bg-white text-ink",
    dot: "border-2 border-terracotta-400 bg-white",
    label: "Recognised ingredient, not in any recipe yet",
  },
  unknown: {
    item: "border-line bg-cream text-ink",
    dot: null,
    label: "Saved, not recognised for recipe matching",
  },
};

type Props = {
  items: FridgeItem[];
  setItems: Dispatch<SetStateAction<FridgeItem[]>>;
  catalog: CatalogIngredient[];
  catalogIndex: CatalogIndex;
  unavailable: boolean;
};

export function FridgePanel({ items, setItems, catalog, catalogIndex, unavailable }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Saving runs as a Server Action, so the form also works if it is submitted
  // before this page's JavaScript is ready (the browser POSTs and returns to /app).
  const [result, formAction, saving] = useActionState(addFridgeItemAction, INITIAL_ADD_STATE);

  // The input is uncontrolled so text typed before hydration is never wiped.
  // Pick up anything typed before this component became interactive.
  useEffect(() => {
    if (inputRef.current?.value) setValue(inputRef.current.value);
  }, []);

  function setInput(text: string) {
    if (inputRef.current) inputRef.current.value = text;
    setValue(text);
  }

  useEffect(() => {
    if (result.status === "saved" && result.item) {
      const saved = result.item;
      setItems((prev) => (prev.some((i) => i.id === saved.id) ? prev : [saved, ...prev]));
      setInput("");
      setError(null);
      setStatus(`${saved.name} added to your fridge.`);
    } else if (result.status === "error") {
      setInput(result.submitted); // React resets the form after an action; keep the user's text
      setError(result.error);
    }
    if (result.status !== "idle") inputRef.current?.focus();
  }, [result, setItems]);

  // The action's own error is rendered directly so it also shows without JavaScript.
  const shownError = error ?? (result.status === "error" ? result.error : null);

  function addIngredient(name: string) {
    const formData = new FormData();
    formData.set("ingredient", name);
    startTransition(() => formAction(formData));
  }

  // Removed from the list only after Supabase confirms, so a quick refresh can't bring it back.
  async function removeIngredient(item: FridgeItem) {
    setError(null);
    setRemoving((prev) => new Set(prev).add(item.id));
    const { error: deleteError } = await createClient().from("fridge_items").delete().eq("id", item.id);
    setRemoving((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    if (deleteError) {
      setError(`We couldn't remove ${item.name}. Please try again.`);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setStatus(`${item.name} removed from your fridge.`);
  }

  function pickSuggestion(name: string) {
    setInput(name);
    inputRef.current?.focus();
  }

  const ownedKeys = new Set(items.map((i) => ingredientKey(i.name)));
  const suggestions = suggestIngredients(value, catalog, ownedKeys);
  const quickAdd = QUICK_ADD.filter((s) => !ownedKeys.has(ingredientKey(s))).slice(0, 6);
  const hasCatalog = catalog.length > 0;

  return (
    <section id="fridge" aria-labelledby="fridge-heading" className="scroll-mt-24">
      <div className="rounded-[2rem] border border-line bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold uppercase tracking-widest text-sage-700">🧊 My Smart Fridge</p>
          <h1 id="fridge-heading" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            What&apos;s in your fridge?
          </h1>
          <p className="text-ink-soft">Add what you have and we&apos;ll show you what you can cook.</p>
        </div>

        <form action={formAction} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="ingredient-input" className="sr-only">
            Ingredient name
          </label>
          <input
            ref={inputRef}
            id="ingredient-input"
            data-testid="core-input"
            type="text"
            name="ingredient"
            autoComplete="off"
            maxLength={MAX_LENGTH}
            defaultValue={result.status === "error" ? result.submitted : ""}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. eggs, rice, spinach…"
            aria-describedby="fridge-feedback ingredient-suggestions"
            className="min-h-14 flex-1 rounded-2xl border border-line bg-cream/50 px-5 text-lg outline-none transition placeholder:text-ink-soft/70 focus:border-sage-500 focus:bg-white focus:ring-4 focus:ring-sage-100"
          />
          <button
            type="submit"
            data-testid="core-submit"
            disabled={saving}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-sage-700 px-7 text-base font-semibold text-white shadow-md shadow-sage-800/15 transition hover:bg-sage-800 disabled:cursor-wait disabled:opacity-70"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              +
            </span>
            {saving ? "Adding…" : "Add Ingredient"}
          </button>
        </form>

        <div id="ingredient-suggestions" className="mt-3 min-h-9">
          {suggestions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-soft">Did you mean:</span>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="rounded-full bg-sage-50 px-3 py-1.5 text-sm font-medium capitalize text-sage-800 ring-1 ring-sage-200 transition hover:bg-sage-100"
                >
                  {s}
                </button>
              ))}
              <span className="text-xs text-ink-soft">Or add exactly what you typed.</span>
            </div>
          ) : (
            value.trim() === "" &&
            quickAdd.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-soft">Quick add:</span>
                {quickAdd.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addIngredient(s)}
                    disabled={saving}
                    className="rounded-full border border-dashed border-sage-500/60 px-3 py-1.5 text-sm font-medium text-sage-800 transition hover:bg-sage-50 disabled:opacity-60"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        <div id="fridge-feedback" aria-live="polite" className="mt-2 min-h-6 text-sm">
          {shownError ? (
            <p role="alert" className="font-medium text-terracotta-600">
              {shownError}
            </p>
          ) : (
            <p className="sr-only">{status}</p>
          )}
        </div>

        <div className="mt-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-soft">
            In your fridge <span className="text-ink">({items.length})</span>
          </h2>

          {unavailable && (
            <p className="mt-3 rounded-xl bg-terracotta-50 px-4 py-3 text-sm text-terracotta-600">
              We couldn&apos;t load your fridge right now. Refresh the page to try again.
            </p>
          )}

          {items.length === 0 && !unavailable ? (
            <p className="mt-3 rounded-2xl border border-dashed border-line bg-cream/50 px-5 py-6 text-center text-ink-soft">
              Your fridge is empty. Add your first ingredient above. 🥕
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Saved ingredients">
              {items.map((item) => {
                const { status: recognition, ingredient } = recognise(item.name, catalogIndex);
                const style = RECOGNITION_STYLES[recognition];
                const description = ingredient ? `${style.label} (recognised as ${ingredient.name})` : style.label;
                return (
                  <li
                    key={item.id}
                    data-testid="core-item"
                    title={description}
                    className={`inline-flex max-w-full items-center gap-2 rounded-full border py-1.5 pl-4 pr-1.5 text-sm font-medium ${style.item}`}
                  >
                    {style.dot && (
                      <span role="img" aria-label={description} className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                    )}
                    <span className="whitespace-pre-wrap break-all">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => removeIngredient(item)}
                      disabled={removing.has(item.id)}
                      aria-busy={removing.has(item.id)}
                      aria-label={`Remove ${item.name}`}
                      title="Remove"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-terracotta-100 hover:text-terracotta-600 disabled:animate-pulse disabled:opacity-50"
                    >
                      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {items.length > 0 && hasCatalog && (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft" aria-label="Legend">
              {(["in-recipes", "in-swaps", "recognised", "unknown"] as const).map((key) => (
                <li key={key} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full ${RECOGNITION_STYLES[key].dot ?? "border border-line bg-cream"}`}
                  />
                  {RECOGNITION_STYLES[key].label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
