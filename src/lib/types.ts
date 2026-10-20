export type FridgeItem = {
  id: string;
  name: string;
  created_at: string;
};

export type CatalogIngredient = {
  id: number;
  name: string;
  aliases: string[];
};

export type RecipeIngredient = {
  quantity: string | null;
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
export const CATALOG_COLUMNS = "id, name, aliases";

export const RECIPE_COLUMNS =
  "id, slug, title, description, emoji, prep_minutes, cook_minutes, total_minutes, servings, " +
  "estimated_cost_per_serving_eur, difficulty, meal_types, tags, tools, instructions, storage_note, " +
  "recipe_ingredients(quantity, is_staple, is_optional, sort_order, ingredient:ingredients(id, name, aliases)), " +
  "recipe_equipment(appliance_id, option_group, is_optional, note)";
