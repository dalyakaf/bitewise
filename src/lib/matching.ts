import { ingredientKey } from "./ingredient-key";
import type { CatalogIngredient, FridgeItem, Recipe, RecipeEquipment, RecipeIngredient } from "./types";

export { ingredientKey };

// ── Ingredient matching ──────────────────────────────────────────────────────

export type MatchStatus = "cook-now" | "almost" | "browse";

export type RecipeMatch = {
  recipe: Recipe;
  status: MatchStatus;
  have: RecipeIngredient[];
  missing: RecipeIngredient[];
  optional: RecipeIngredient[];
  staples: RecipeIngredient[];
};

/** "Almost There" means missing at most this many required ingredients. */
export const ALMOST_THERE_MAX_MISSING = 2;

function ingredientKeys(ingredient: CatalogIngredient) {
  return [ingredient.name, ...ingredient.aliases].map(ingredientKey);
}

export function fridgeKeySet(items: FridgeItem[]) {
  return new Set(items.map((item) => ingredientKey(item.name)));
}

export function ownsIngredient(ingredient: CatalogIngredient, owned: Set<string>) {
  return ingredientKeys(ingredient).some((key) => owned.has(key));
}

export function matchRecipe(recipe: Recipe, owned: Set<string>): RecipeMatch {
  const sorted = [...recipe.recipe_ingredients].sort((a, b) => a.sort_order - b.sort_order);
  const staples = sorted.filter((ri) => ri.is_staple);
  const optional = sorted.filter((ri) => !ri.is_staple && ri.is_optional);
  const required = sorted.filter((ri) => !ri.is_staple && !ri.is_optional);
  const have = required.filter((ri) => ownsIngredient(ri.ingredient, owned));
  const missing = required.filter((ri) => !have.includes(ri));

  let status: MatchStatus = "browse";
  if (required.length > 0 && missing.length === 0) status = "cook-now";
  else if (have.length > 0 && missing.length <= ALMOST_THERE_MAX_MISSING) status = "almost";

  return { recipe, status, have, missing, optional, staples };
}

// ── Ingredient recognition (catalog vs. recipe library) ──────────────────────

export type Recognition = "in-recipes" | "recognised" | "unknown";

export type CatalogIndex = {
  byKey: Map<string, CatalogIngredient>;
  usedIds: Set<number>;
};

export function buildCatalogIndex(catalog: CatalogIngredient[], recipes: Recipe[]): CatalogIndex {
  const byKey = new Map<string, CatalogIngredient>();
  catalog.forEach((ingredient) => ingredientKeys(ingredient).forEach((key) => byKey.set(key, ingredient)));
  const usedIds = new Set<number>();
  recipes.forEach((recipe) => recipe.recipe_ingredients.forEach((ri) => usedIds.add(ri.ingredient.id)));
  return { byKey, usedIds };
}

export function recognise(name: string, index: CatalogIndex): { status: Recognition; ingredient?: CatalogIngredient } {
  const ingredient = index.byKey.get(ingredientKey(name));
  if (!ingredient) return { status: "unknown" };
  return { status: index.usedIds.has(ingredient.id) ? "in-recipes" : "recognised", ingredient };
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
