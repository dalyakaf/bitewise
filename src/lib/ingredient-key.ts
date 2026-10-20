// Shared by the app and scripts/build-seed.mjs, so it must stay dependency-free.

// Leading quantity words dropped before matching: "2 eggs", "500g mince", "a bag of spinach".
// Container words (can, tin, jar) are kept: "can of tomatoes" is canned tomatoes, not fresh ones.
const QUANTITY_WORDS = new Set([
  "a", "an", "of", "some", "x", "g", "kg", "gr", "gram", "grams", "ml", "l", "litre", "litres", "liter", "liters",
  "pack", "packs", "packet", "packets", "bag", "bags", "box", "boxes", "carton", "cartons", "bunch", "bunches",
]);

function singularize(word: string) {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(oes|ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

/**
 * Normalises free text so "Tomatoes", " cherry-tomatoes " and "2 tomato" compare equal.
 * Matching is exact on this key, so unknown text never matches a catalog ingredient.
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

  let start = 0;
  while (start < words.length - 1 && (QUANTITY_WORDS.has(words[start]) || /^\d+(g|kg|ml|l|x)?$/.test(words[start]))) {
    start += 1;
  }
  const kept = words.slice(start);
  kept[kept.length - 1] = singularize(kept[kept.length - 1]);
  return kept.join(" ");
}
