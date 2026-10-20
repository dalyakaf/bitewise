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
  ingredient: CatalogIngredient;
};

export type Recipe = {
  id: number;
  slug: string;
  title: string;
  description: string;
  emoji: string;
  total_minutes: number;
  servings: number;
  estimated_cost_per_serving_eur: number;
  difficulty: "Easy" | "Medium";
  tags: string[];
  instructions: string[];
  recipe_ingredients: RecipeIngredient[];
};

export const FRIDGE_ITEM_COLUMNS = "id, name, created_at";

export const RECIPE_COLUMNS =
  "id, slug, title, description, emoji, total_minutes, servings, estimated_cost_per_serving_eur, difficulty, tags, instructions, " +
  "recipe_ingredients(quantity, is_staple, ingredient:ingredients(id, name, aliases))";
