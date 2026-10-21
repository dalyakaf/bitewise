import { approxEuro, type EquipmentMatch, type RecipeMatch } from "./matching";

export const STUDY_TIMES = [10, 15, 20, 30] as const;

export const STUDY_BUDGETS = [
  { value: 0, label: "€0", hint: "Only what I have" },
  { value: 5, label: "Up to €5", hint: "Small top-up shop" },
  { value: 10, label: "Up to €10", hint: "Bigger top-up shop" },
] as const;

export type StudyEntry = RecipeMatch & { equipment: EquipmentMatch };

export type StudyOptions = {
  maxMinutes: number;
  budget: number;
  /** Only applied when the user ticked "Only recipes my kitchen can make". */
  kitchenOnly: boolean;
  kitchenConfigured: boolean;
  applianceNames: Record<string, string>;
};

const DIFFICULTY_ORDER = { Easy: 0, Medium: 1 } as const;

function listNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Plain-language reasons, limited to facts we actually know. */
export function studyReasons(entry: StudyEntry, opts: StudyOptions) {
  const reasons = [`Ready in ${entry.adaptedMinutes} minutes.`];
  const toBuy = entry.stillMissing.map((ri) => ri.ingredient.name);
  const cost = entry.extraCostEur === null ? "" : ` (${approxEuro(entry.extraCostEur)})`;

  if (toBuy.length === 0 && entry.swaps.length === 0) reasons.push("You already have every ingredient.");
  else if (toBuy.length === 0) reasons.push(`You have everything with ${entry.swaps.length === 1 ? "one smart swap" : `${entry.swaps.length} smart swaps`}.`);
  else if (toBuy.length === 1) reasons.push(`Only one additional ingredient needed: ${toBuy[0]}${cost}.`);
  else if (toBuy.length === 2) reasons.push(`Only two additional ingredients needed: ${listNames(toBuy)}${cost}.`);
  else reasons.push(`${toBuy.length} ingredients to buy${cost}.`);

  const essential = entry.equipment.groups.filter((g) => !g.optional);
  if (essential.length === 0) reasons.push("No cooking appliance needed.");
  else if (opts.kitchenConfigured && entry.equipment.canMake) {
    const used = [...new Set(essential.map((g) => g.ownedOptions[0]))].map((id) => (opts.applianceNames[id] ?? id).toLowerCase());
    reasons.push(`Compatible with your ${listNames(used)}.`);
  }
  return reasons;
}

/** Filters and ranks recipes for a student with limited time and money. */
export function studyRecommendations(entries: StudyEntry[], opts: StudyOptions) {
  return entries
    .filter((e) => e.adaptedMinutes <= opts.maxMinutes)
    .filter((e) =>
      e.stillMissing.length === 0 || (opts.budget > 0 && e.extraCostEur !== null && e.extraCostEur <= opts.budget),
    )
    .filter((e) => !opts.kitchenOnly || !opts.kitchenConfigured || e.equipment.canMake)
    .sort(
      (a, b) =>
        a.stillMissing.length - b.stillMissing.length ||
        a.swaps.length - b.swaps.length ||
        (a.extraCostEur ?? 0) - (b.extraCostEur ?? 0) ||
        a.adaptedMinutes - b.adaptedMinutes ||
        DIFFICULTY_ORDER[a.recipe.difficulty] - DIFFICULTY_ORDER[b.recipe.difficulty],
    )
    .map((entry) => ({ entry, reasons: studyReasons(entry, opts) }));
}
