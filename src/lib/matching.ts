import { ingredientKey } from "./ingredient-key";
import type { CatalogIngredient, FridgeItem, Recipe, RecipeEquipment, RecipeIngredient, SwapRule } from "./types";

export { ingredientKey };

// ── Matching context ─────────────────────────────────────────────────────────

/** A curated swap that is valid for one specific recipe. */
export type RecipeSwapOption = { rule: SwapRule; extraMinutes: number };

export type MatchContext = {
  /** Normalised keys of everything in the user's fridge → the exact text they typed. */
  fridge: Map<string, string>;
  catalogById: Map<number, CatalogIngredient>;
  swapsByRecipe: Map<number, RecipeSwapOption[]>;
};

export function buildMatchContext(
  items: FridgeItem[],
  catalog: CatalogIngredient[] = [],
  swapRules: SwapRule[] = [],
): MatchContext {
  const fridge = new Map<string, string>();
  items.forEach((item) => {
    const key = ingredientKey(item.name);
    if (!fridge.has(key)) fridge.set(key, item.name);
  });
  const swapsByRecipe = new Map<number, RecipeSwapOption[]>();
  swapRules.forEach((rule) =>
    rule.recipe_substitutions.forEach(({ recipe_id, extra_minutes }) =>
      swapsByRecipe.set(recipe_id, [...(swapsByRecipe.get(recipe_id) ?? []), { rule, extraMinutes: extra_minutes }]),
    ),
  );
  return { fridge, catalogById: new Map(catalog.map((c) => [c.id, c])), swapsByRecipe };
}

function ingredientKeys(ingredient: CatalogIngredient) {
  return [ingredient.name, ...ingredient.aliases].map(ingredientKey);
}

/** The fridge text that matches this catalog ingredient, if any. */
export function fridgeMatch(ingredient: CatalogIngredient, fridge: Map<string, string>) {
  for (const key of ingredientKeys(ingredient)) {
    const name = fridge.get(key);
    if (name !== undefined) return name;
  }
  return null;
}

export function ownsIngredient(ingredient: CatalogIngredient, fridge: Map<string, string>) {
  return fridgeMatch(ingredient, fridge) !== null;
}

// ── Ingredient matching (exact first, then Smart Swaps) ──────────────────────

export type MatchStatus = "cook-now" | "smart-swap" | "almost" | "browse";

export type AppliedSwap = {
  original: RecipeIngredient;
  substitute: CatalogIngredient;
  /** Exactly what the user typed for the substitute (or "pantry staple"). */
  fridgeName: string;
  rule: SwapRule;
  extraMinutes: number;
};

export type RecipeMatch = {
  recipe: Recipe;
  status: MatchStatus;
  have: RecipeIngredient[];
  /** Required ingredients not in the fridge (before swaps). */
  missing: RecipeIngredient[];
  /** Swaps that cover some of `missing` with ingredients the user owns. */
  swaps: AppliedSwap[];
  /** Still needs buying after swaps. */
  stillMissing: RecipeIngredient[];
  optional: RecipeIngredient[];
  staples: RecipeIngredient[];
  /** Total minutes including any time added by the chosen swaps. */
  adaptedMinutes: number;
  /** Rough cost of buying `stillMissing` (typical pack prices), null if unknown. */
  extraCostEur: number | null;
};

/** "Almost There" means at most this many ingredients still to buy. */
export const ALMOST_THERE_MAX_MISSING = 2;

type SwapCandidate = { option: RecipeSwapOption; substitute: CatalogIngredient; fridgeName: string };

/** Picks at most one swap per missing ingredient, never reusing a substitute. */
function chooseSwaps(missing: RecipeIngredient[], candidates: SwapCandidate[][]) {
  // Exhaustive search is tiny in practice; fall back to greedy if it would not be.
  const combinations = candidates.reduce((n, c) => n * (c.length + 1), 1);
  if (combinations > 5000) {
    const used = new Set<number>();
    return candidates.map((list) => {
      const c = list.find((x) => !used.has(x.substitute.id)) ?? null;
      if (c) used.add(c.substitute.id);
      return c;
    });
  }

  let best: (SwapCandidate | null)[] = missing.map(() => null);
  let bestScore = [-1, Infinity];
  const pick: (SwapCandidate | null)[] = [];
  const used = new Set<number>();

  function search(i: number) {
    if (i === missing.length) {
      const covered = pick.filter(Boolean).length;
      const minutes = pick.reduce((sum, c) => sum + (c?.option.extraMinutes ?? 0), 0);
      if (covered > bestScore[0] || (covered === bestScore[0] && minutes < bestScore[1])) {
        bestScore = [covered, minutes];
        best = [...pick];
      }
      return;
    }
    for (const candidate of candidates[i]) {
      if (used.has(candidate.substitute.id)) continue;
      used.add(candidate.substitute.id);
      pick.push(candidate);
      search(i + 1);
      pick.pop();
      used.delete(candidate.substitute.id);
    }
    pick.push(null);
    search(i + 1);
    pick.pop();
  }

  search(0);
  return best;
}

export function matchRecipe(recipe: Recipe, ctx: MatchContext): RecipeMatch {
  const sorted = [...recipe.recipe_ingredients].sort((a, b) => a.sort_order - b.sort_order);
  const staples = sorted.filter((ri) => ri.is_staple);
  const optional = sorted.filter((ri) => !ri.is_staple && ri.is_optional);
  const required = sorted.filter((ri) => !ri.is_staple && !ri.is_optional);
  const have = required.filter((ri) => ownsIngredient(ri.ingredient, ctx.fridge));
  const missing = required.filter((ri) => !have.includes(ri));

  // Smart Swaps: only rules curated for THIS recipe, only substitutes the user owns.
  const options = ctx.swapsByRecipe.get(recipe.id) ?? [];
  const candidates = missing.map((ri) =>
    options.flatMap((option) => {
      if (option.rule.original_ingredient_id !== ri.ingredient.id) return [];
      const substitute = ctx.catalogById.get(option.rule.substitute_ingredient_id);
      if (!substitute) return [];
      const fridgeName = substitute.category === "staple" ? "pantry staple" : fridgeMatch(substitute, ctx.fridge);
      return fridgeName === null ? [] : [{ option, substitute, fridgeName }];
    }),
  );
  const chosen = chooseSwaps(missing, candidates);
  const swaps: AppliedSwap[] = [];
  const stillMissing: RecipeIngredient[] = [];
  missing.forEach((ri, i) => {
    const c = chosen[i];
    if (c) {
      swaps.push({ original: ri, substitute: c.substitute, fridgeName: c.fridgeName, rule: c.option.rule, extraMinutes: c.option.extraMinutes });
    } else stillMissing.push(ri);
  });

  let status: MatchStatus = "browse";
  if (required.length > 0 && missing.length === 0) status = "cook-now";
  else if (required.length > 0 && stillMissing.length === 0) status = "smart-swap";
  else if (have.length + swaps.length > 0 && stillMissing.length <= ALMOST_THERE_MAX_MISSING) status = "almost";

  const prices = stillMissing.map((ri) => ctx.catalogById.get(ri.ingredient.id)?.typical_pack_price_eur);
  const extraCostEur = prices.every((p) => typeof p === "number" || typeof p === "string")
    ? prices.reduce<number>((sum, p) => sum + Number(p), 0)
    : null;

  return {
    recipe,
    status,
    have,
    missing,
    swaps,
    stillMissing,
    optional,
    staples,
    adaptedMinutes: Math.max(1, recipe.total_minutes + swaps.reduce((sum, s) => sum + s.extraMinutes, 0)),
    extraCostEur,
  };
}

// ── Ingredient recognition (catalog vs. recipe library) ──────────────────────

export type Recognition = "in-recipes" | "in-swaps" | "recognised" | "unknown";

export type CatalogIndex = {
  byKey: Map<string, CatalogIngredient>;
  usedIds: Set<number>;
  /** Ingredients that only appear as Smart Swaps alternatives. */
  swapIds: Set<number>;
};

export function buildCatalogIndex(catalog: CatalogIngredient[], recipes: Recipe[], swapRules: SwapRule[] = []): CatalogIndex {
  const byKey = new Map<string, CatalogIngredient>();
  catalog.forEach((ingredient) => ingredientKeys(ingredient).forEach((key) => byKey.set(key, ingredient)));
  const usedIds = new Set<number>();
  recipes.forEach((recipe) => recipe.recipe_ingredients.forEach((ri) => usedIds.add(ri.ingredient.id)));
  const swapIds = new Set(
    swapRules.filter((rule) => rule.recipe_substitutions.length > 0).map((rule) => rule.substitute_ingredient_id),
  );
  return { byKey, usedIds, swapIds };
}

export function recognise(name: string, index: CatalogIndex): { status: Recognition; ingredient?: CatalogIngredient } {
  const ingredient = index.byKey.get(ingredientKey(name));
  if (!ingredient) return { status: "unknown" };
  if (index.usedIds.has(ingredient.id)) return { status: "in-recipes", ingredient };
  return { status: index.swapIds.has(ingredient.id) ? "in-swaps" : "recognised", ingredient };
}

/** Autocomplete: catalog names (and aliases) that start with or contain the typed text. */
export function suggestIngredients(input: string, catalog: CatalogIngredient[], exclude: Set<string>, limit = 6) {
  const query = input.trim().toLowerCase();
  if (query.length < 2) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const ingredient of catalog) {
    if (exclude.has(ingredientKey(ingredient.name))) continue;
    const terms = [ingredient.name, ...ingredient.aliases];
    if (terms.some((t) => t.toLowerCase().startsWith(query))) starts.push(ingredient.name);
    else if (terms.some((t) => t.toLowerCase().includes(query))) contains.push(ingredient.name);
  }
  return [...starts.sort(), ...contains.sort()].slice(0, limit);
}

// ── Equipment matching (separate from ingredients) ───────────────────────────

export type EquipmentGroup = {
  appliances: string[];
  note: string | null;
  optional: boolean;
};

export type EquipmentMatch = {
  groups: (EquipmentGroup & { ownedOptions: string[] })[];
  /** Essential groups the user has none of the appliances for. */
  missing: EquipmentGroup[];
  canMake: boolean;
};

export function equipmentGroups(rows: RecipeEquipment[]): EquipmentGroup[] {
  const byGroup = new Map<number, RecipeEquipment[]>();
  rows.forEach((row) => byGroup.set(row.option_group, [...(byGroup.get(row.option_group) ?? []), row]));
  return [...byGroup.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, members]) => ({
      appliances: members.map((m) => m.appliance_id),
      note: members.find((m) => m.note)?.note ?? null,
      optional: members.every((m) => m.is_optional),
    }));
}

export function matchEquipment(recipe: Recipe, ownedAppliances: Set<string>): EquipmentMatch {
  const groups = equipmentGroups(recipe.recipe_equipment).map((group) => ({
    ...group,
    ownedOptions: group.appliances.filter((id) => ownedAppliances.has(id)),
  }));
  const missing = groups.filter((g) => !g.optional && g.ownedOptions.length === 0);
  return { groups, missing, canMake: missing.length === 0 };
}

// ── Display helpers ──────────────────────────────────────────────────────────

/** Costs are rough estimates, so show a band rather than false precision. */
export function costBand(eurPerServing: number) {
  const n = Number(eurPerServing);
  if (n < 1) return "Under €1";
  if (n < 2) return "€1–2";
  if (n < 3) return "€2–3";
  return "€3+";
}

/** Rough shopping estimate rounded to the nearest 50 cents. */
export function approxEuro(amount: number) {
  return `about €${(Math.round(Number(amount) * 2) / 2).toFixed(2)}`;
}

export const TAG_LABELS: Record<string, string> = {
  quick: "Quick",
  budget: "Budget",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  "high-protein": "High protein",
  "meal-prep": "Meal prep",
  comfort: "Comfort food",
  "one-pan": "One pan",
  fresh: "Fresh",
  spicy: "Spicy",
  "no-cook": "No-cook",
  "air-fryer": "Air fryer",
};
