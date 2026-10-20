import type { FridgeItem, Recipe, RecipeIngredient } from "./types";

export type MatchStatus = "cook-now" | "almost" | "browse";

export type RecipeMatch = {
  recipe: Recipe;
  status: MatchStatus;
  have: RecipeIngredient[];
  missing: RecipeIngredient[];
  staples: RecipeIngredient[];
};

/** "Almost There" means missing at most this many required ingredients. */
export const ALMOST_THERE_MAX_MISSING = 2;

function singularize(word: string) {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("oes")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) return word.slice(0, -1);
  return word;
}

/**
 * Normalises free text so "Tomatoes", " cherry-tomatoes " and "tomato" compare equal.
 * Matching is exact on the normalised key, so unknown text never matches a recipe.
 */
export function ingredientKey(raw: string) {
  const words = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");
  words[words.length - 1] = singularize(words[words.length - 1]);
  return words.join(" ");
}

function ingredientKeys(item: RecipeIngredient) {
  return [item.ingredient.name, ...item.ingredient.aliases].map(ingredientKey);
}

export function fridgeKeySet(items: FridgeItem[]) {
  return new Set(items.map((item) => ingredientKey(item.name)));
}

export function matchRecipe(recipe: Recipe, owned: Set<string>): RecipeMatch {
  const staples = recipe.recipe_ingredients.filter((ri) => ri.is_staple);
  const required = recipe.recipe_ingredients.filter((ri) => !ri.is_staple);
  const have = required.filter((ri) => ingredientKeys(ri).some((key) => owned.has(key)));
  const missing = required.filter((ri) => !have.includes(ri));

  let status: MatchStatus = "browse";
  if (required.length > 0 && missing.length === 0) status = "cook-now";
  else if (have.length > 0 && missing.length <= ALMOST_THERE_MAX_MISSING) status = "almost";

  return { recipe, status, have, missing, staples };
}

/** Keys for every ingredient the catalog knows, used to badge recognised fridge items. */
export function catalogKeySet(recipes: Recipe[]) {
  const keys = new Set<string>();
  recipes.forEach((recipe) => recipe.recipe_ingredients.forEach((ri) => ingredientKeys(ri).forEach((k) => keys.add(k))));
  return keys;
}

export function formatEuro(amount: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number(amount));
}
