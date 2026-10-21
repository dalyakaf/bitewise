import { fridgeMatch, type MatchContext } from "./matching";
import type { CatalogIngredient, GroceryRecipe, MealPlanEntry, SwapRule } from "./types";

// ── Quantities ───────────────────────────────────────────────────────────────

/** Units that can never be summed into a number. */
const AS_NEEDED_UNITS = new Set(["pinch", "to taste"]);
const PLURALS: Record<string, string> = { clove: "cloves", slice: "slices", can: "cans", handful: "handfuls" };
const FRACTIONS: Record<number, string> = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
const UNIT_ORDER = ["count", "g", "ml", "can", "clove", "slice", "handful", "tbsp", "tsp"];
const unitRank = (unit: string) => (UNIT_ORDER.includes(unit) ? UNIT_ORDER.indexOf(unit) : UNIT_ORDER.length);

function roundQuarter(n: number) {
  return Math.max(0.25, Math.round(n * 4) / 4);
}

function roundMetric(n: number) {
  return n >= 20 ? Math.round(n / 5) * 5 : Math.max(1, Math.round(n));
}

function formatNumber(n: number) {
  const whole = Math.floor(n);
  const rest = Math.round((n - whole) * 100) / 100;
  if (rest === 0) return String(whole);
  const frac = FRACTIONS[rest];
  if (frac) return whole ? `${whole}${frac}` : frac;
  return n.toFixed(1);
}

export function formatQuantity(amount: number, unit: string) {
  if (unit === "g" || unit === "ml") return `${roundMetric(amount)} ${unit}`;
  const n = roundQuarter(amount);
  if (unit === "count") return formatNumber(n);
  if (unit === "tsp" || unit === "tbsp") return `${formatNumber(n)} ${unit}`;
  return `${formatNumber(n)} ${n > 1 ? (PLURALS[unit] ?? unit) : unit}`;
}

/**
 * Sums amounts per unit. The only conversion applied is the standard
 * 1 tbsp = 3 tsp; everything else (g vs ml vs cans…) stays separate.
 */
export function combineQuantities(parts: { amount: number | null; unit: string }[]) {
  const totals = new Map<string, number>();
  let asNeeded = false;
  for (const { amount, unit } of parts) {
    if (amount === null || AS_NEEDED_UNITS.has(unit)) {
      asNeeded = true;
      continue;
    }
    totals.set(unit, (totals.get(unit) ?? 0) + amount);
  }
  const tsp = (totals.get("tsp") ?? 0) + 3 * (totals.get("tbsp") ?? 0);
  if (totals.has("tsp") || totals.has("tbsp")) {
    totals.delete("tsp");
    totals.delete("tbsp");
    if (tsp >= 3) totals.set("tbsp", tsp / 3);
    else totals.set("tsp", tsp);
  }
  const labels = [...totals.entries()]
    .sort(([a], [b]) => unitRank(a) - unitRank(b))
    .map(([unit, amount]) => formatQuantity(amount, unit));
  if (asNeeded) labels.push("as needed");
  return labels;
}

// ── Grocery list ─────────────────────────────────────────────────────────────

export type PlannedMeal = Pick<MealPlanEntry, "id" | "servings" | "swap_ids"> & { recipe: GroceryRecipe };

export type GroceryLine = {
  /** Stable key for the saved checkbox state, e.g. "ing:42". */
  key: string;
  ingredientId: number;
  name: string;
  category: string;
  /** Combined, scaled quantities (each unit kept separate). */
  quantities: string[];
  /** Guidance for substitutes chosen via Smart Swaps (no invented numbers). */
  swapGuidance: string[];
  recipes: string[];
  inFridge: boolean;
  fridgeName: string | null;
};

export type GroceryList = {
  toBuy: GroceryLine[];
  inFridge: GroceryLine[];
  staples: string[];
  optionalSkipped: number;
  mealCount: number;
};

export const CATEGORY_LABELS: Record<string, string> = {
  produce: "Vegetables",
  fruit: "Fruit",
  herbs: "Fresh herbs",
  protein: "Meat, fish, eggs & tofu",
  legumes: "Beans & legumes",
  grains: "Bread, pasta, rice & grains",
  dairy: "Dairy & alternatives",
  pantry: "Cans, jars & sauces",
  spices: "Spices & dried herbs",
  other: "Other",
};
export const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

type Accumulator = {
  ingredient: CatalogIngredient;
  parts: { amount: number | null; unit: string }[];
  swapGuidance: string[];
  recipes: Set<string>;
};

/**
 * Builds the shopping list for a set of planned meals.
 * - Scales each recipe by planned servings ÷ recipe servings.
 * - Optional extras are skipped; pantry staples are listed separately.
 * - A Smart Swap is applied only if the student chose it for that planned meal
 *   AND it is a curated swap for that recipe.
 * - Fridge items are only marked ("check quantity"): the fridge stores names,
 *   not amounts, so nothing is subtracted.
 */
export function buildGroceryList(meals: PlannedMeal[], ctx: MatchContext): GroceryList {
  const lines = new Map<number, Accumulator>();
  const staples = new Set<string>();
  let optionalSkipped = 0;

  const add = (ingredient: CatalogIngredient, part: { amount: number | null; unit: string } | null, recipe: string, guidance?: string) => {
    const acc = lines.get(ingredient.id) ?? { ingredient, parts: [], swapGuidance: [], recipes: new Set<string>() };
    if (part) acc.parts.push(part);
    if (guidance && !acc.swapGuidance.includes(guidance)) acc.swapGuidance.push(guidance);
    acc.recipes.add(recipe);
    lines.set(ingredient.id, acc);
  };

  for (const meal of meals) {
    const { recipe } = meal;
    const factor = meal.servings / Math.max(1, recipe.servings);
    const allowed = ctx.swapsByRecipe.get(recipe.id) ?? [];
    const chosen = new Map<number, SwapRule>();
    allowed
      .filter((option) => meal.swap_ids.includes(option.rule.id))
      .forEach((option) => chosen.set(option.rule.original_ingredient_id, option.rule));

    for (const ri of recipe.recipe_ingredients) {
      const catalogEntry = ctx.catalogById.get(ri.ingredient.id) ?? ri.ingredient;
      if (ri.is_staple || catalogEntry.category === "staple") {
        staples.add(ri.ingredient.name);
        continue;
      }
      if (ri.is_optional) {
        optionalSkipped += 1;
        continue;
      }
      const amount = ri.amount === null || ri.amount === undefined ? null : Number(ri.amount) * factor;
      const unit = ri.unit ?? "as needed";
      const rule = chosen.get(ri.ingredient.id);
      if (rule) {
        const substitute = ctx.catalogById.get(rule.substitute_ingredient_id);
        if (substitute) {
          const originalQty = amount === null ? ri.ingredient.name : `${formatQuantity(amount, unit)} ${ri.ingredient.name}`;
          const guidance = `Instead of ${originalQty} (${recipe.title}): ${rule.ratio_note}`;
          if (substitute.category === "staple") staples.add(substitute.name);
          else add(substitute, null, recipe.title, guidance);
          continue;
        }
      }
      add(catalogEntry, { amount, unit }, recipe.title);
    }
  }

  const all: GroceryLine[] = [...lines.values()].map((acc) => {
    const fridgeName = fridgeMatch(acc.ingredient, ctx.fridge);
    return {
      key: `ing:${acc.ingredient.id}`,
      ingredientId: acc.ingredient.id,
      name: acc.ingredient.name,
      category: acc.ingredient.category && CATEGORY_LABELS[acc.ingredient.category] ? acc.ingredient.category : "other",
      quantities: combineQuantities(acc.parts),
      swapGuidance: acc.swapGuidance,
      recipes: [...acc.recipes].sort(),
      inFridge: fridgeName !== null,
      fridgeName,
    };
  });
  const byCategoryThenName = (a: GroceryLine, b: GroceryLine) =>
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.name.localeCompare(b.name);

  return {
    toBuy: all.filter((l) => !l.inFridge).sort(byCategoryThenName),
    inFridge: all.filter((l) => l.inFridge).sort(byCategoryThenName),
    staples: [...staples].sort(),
    optionalSkipped,
    mealCount: meals.length,
  };
}

/** Plain-text version for copying or printing. */
export function groceryText(
  list: GroceryList,
  manual: { name: string; checked: boolean }[],
  checked: Set<string>,
  weekLabel: string,
) {
  const box = (done: boolean) => (done ? "[x]" : "[ ]");
  const line = (l: GroceryLine) =>
    `${box(checked.has(l.key))} ${l.name}${l.quantities.length ? ` — ${l.quantities.join(" + ")}` : ""}${
      l.swapGuidance.length ? ` (swap: ${l.swapGuidance.join("; ")})` : ""
    }`;
  const out = [`BiteWise grocery list — ${weekLabel}`, ""];
  if (list.toBuy.length) {
    out.push("TO BUY");
    for (const category of CATEGORY_ORDER) {
      const items = list.toBuy.filter((l) => l.category === category);
      if (items.length) out.push(`${CATEGORY_LABELS[category]}:`, ...items.map((l) => `  ${line(l)}`));
    }
    out.push("");
  }
  if (list.inFridge.length) {
    out.push("ALREADY IN MY FRIDGE — CHECK QUANTITY", ...list.inFridge.map((l) => `  ${line(l)}`), "");
  }
  if (manual.length) out.push("MY EXTRA ITEMS", ...manual.map((m) => `  ${box(m.checked)} ${m.name}`), "");
  if (list.staples.length) out.push(`Pantry basics assumed: ${list.staples.join(", ")}`);
  return out.join("\n").trim();
}
