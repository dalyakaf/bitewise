export type FridgeItem = {
  id: string;
  name: string;
  created_at: string;
};

export type CatalogIngredient = {
  id: number;
  name: string;
  aliases: string[];
  category?: string;
  /** Approximate smallest-pack price, for rough Study Mode estimates only. */
  typical_pack_price_eur?: number | null;
};

export type RecipeIngredient = {
  quantity: string | null;
  /** Structured quantity (migration 009); null for "pinch"/"to taste" or before migration. */
  amount?: number | null;
  unit?: string | null;
  is_staple: boolean;
  is_optional: boolean;
  sort_order: number;
  ingredient: CatalogIngredient;
};

export type Appliance = {
  id: string;
  name: string;
  emoji: string;
  sort_order: number;
};

export type RecipeEquipment = {
  appliance_id: string;
  option_group: number;
  is_optional: boolean;
  note: string | null;
};

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type Recipe = {
  id: number;
  slug: string;
  title: string;
  description: string;
  emoji: string;
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
  servings: number;
  estimated_cost_per_serving_eur: number;
  difficulty: "Easy" | "Medium";
  meal_types: MealType[];
  tags: string[];
  tools: string[];
  instructions: string[];
  storage_note: string | null;
  recipe_ingredients: RecipeIngredient[];
  recipe_equipment: RecipeEquipment[];
};

export const FRIDGE_ITEM_COLUMNS = "id, name, created_at";
export const APPLIANCE_COLUMNS = "id, name, emoji, sort_order";
// "*" so the app keeps working before/after migrations add columns.
export const CATALOG_COLUMNS = "*";

/** A curated substitution and the recipes it is valid in (from migration 006/007). */
export type SwapRule = {
  id: number;
  original_ingredient_id: number;
  substitute_ingredient_id: number;
  ratio_note: string;
  context_note: string;
  adjustment_note: string;
  limitation_note: string;
  allergen_note: string;
  is_adapted: boolean;
  recipe_substitutions: { recipe_id: number; extra_minutes: number }[];
};

export const SWAP_COLUMNS =
  "id, original_ingredient_id, substitute_ingredient_id, ratio_note, context_note, adjustment_note, " +
  "limitation_note, allergen_note, is_adapted, recipe_substitutions(recipe_id, extra_minutes)";

export const RECIPE_COLUMNS =
  "id, slug, title, description, emoji, prep_minutes, cook_minutes, total_minutes, servings, " +
  "estimated_cost_per_serving_eur, difficulty, meal_types, tags, tools, instructions, storage_note, " +
  "recipe_ingredients(quantity, is_staple, is_optional, sort_order, ingredient:ingredients(id, name, aliases)), " +
  "recipe_equipment(appliance_id, option_group, is_optional, note)";

// ── Stage 4: My Weekly Meals & Smart Grocery List ────────────────────────────

export type MealSlot = "breakfast" | "lunch" | "dinner";
export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];

export type PlanRecipeSummary = {
  id: number;
  slug: string;
  title: string;
  emoji: string;
  total_minutes: number;
  servings: number;
  meal_types: MealType[];
};

export type MealPlanEntry = {
  id: string;
  plan_date: string;
  meal_slot: MealSlot;
  recipe_id: number;
  servings: number;
  swap_ids: number[];
  created_at: string;
};

export type GroceryRecipe = {
  id: number;
  title: string;
  servings: number;
  recipe_ingredients: RecipeIngredient[];
};

export type GroceryManualItem = { id: string; name: string; checked: boolean; created_at: string };

export const PLAN_RECIPE_COLUMNS = "id, slug, title, emoji, total_minutes, servings, meal_types";
export const PLAN_ENTRY_COLUMNS = "id, plan_date, meal_slot, recipe_id, servings, swap_ids, created_at";
export const GROCERY_RECIPE_COLUMNS =
  "id, title, servings, recipe_ingredients(quantity, amount, unit, is_staple, is_optional, sort_order, ingredient:ingredients(id, name, aliases, category))";
