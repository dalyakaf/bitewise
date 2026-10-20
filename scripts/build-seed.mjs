// Validates the recipe/ingredient seed data and generates the catalog migrations.
//
//   npm run seed:check                 validate everything
//   npm run seed:check -- <file.mjs>   validate one recipe batch file
//   npm run seed:build                 validate, then write migrations 004 and 005
//
// Source of truth: supabase/seed/ingredients.mjs and supabase/seed/recipes/*.mjs

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ingredientKey } from "../src/lib/ingredient-key.ts";
import { APPLIANCES, INGREDIENTS } from "../supabase/seed/ingredients.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RECIPES_DIR = join(ROOT, "supabase/seed/recipes");
const MIGRATIONS_DIR = join(ROOT, "supabase/migrations");

const args = process.argv.slice(2);
const write = args.includes("--write");
const onlyFiles = args.filter((a) => !a.startsWith("--")).map((f) => resolve(f));

// ── Rules ────────────────────────────────────────────────────────────────────
const UNITS = new Set(["", "g", "ml", "tsp", "tbsp", "clove", "slice", "can", "handful", "pinch", "to taste"]);
const NO_AMOUNT_UNITS = new Set(["pinch", "to taste"]);
const PLURAL_UNITS = { clove: "cloves", slice: "slices", can: "cans", handful: "handfuls" };
const FRACTIONS = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
const MEALS = new Set(["breakfast", "lunch", "dinner", "snack"]);
const MANUAL_TAGS = new Set(["high-protein", "meal-prep", "comfort", "one-pan", "fresh", "spicy"]);
const STAPLES = new Set(["olive oil", "vegetable oil", "salt", "black pepper"]);
const NUTRITION_CLAIMS = /\b(healthy|healthiest|nutritious|calorie|calories|low[- ]cal|protein[- ]packed|superfood|detox|guilt[- ]free|boost|immune|weight loss|macros?)\b/i;

const MEAT_FISH = new Set([
  "chicken breast", "chicken thighs", "minced beef", "beef strips", "minced turkey", "pork sausages", "bacon", "ham",
  "chorizo", "salmon", "smoked salmon", "tuna", "white fish", "prawns", "sardines",
]);
const NOT_VEGAN = new Set([
  "egg", "halloumi", "milk", "yogurt", "butter", "cheese", "mozzarella", "parmesan", "feta", "cream cheese",
  "cottage cheese", "cream", "sour cream", "creme fraiche", "honey", "pesto", "naan", "mayonnaise", "chocolate spread",
  "dark chocolate", "burger buns", "granola",
]);
const POULTRY_OR_MINCE = new Set(["chicken breast", "chicken thighs", "minced turkey", "minced beef", "pork sausages", "beef strips"]);
const RAW_SEAFOOD = new Set(["salmon", "white fish", "prawns"]);

// Appliance keywords that, if mentioned in steps, must appear in the equipment list.
const APPLIANCE_WORDS = [
  ["oven", /\boven\b/i],
  ["microwave", /\bmicrowav/i],
  ["air-fryer", /\bair[- ]?fr(y|ier|yer)/i],
  ["blender", /\bblend(er)?\b/i],
  ["toaster", /\btoaster\b/i],
  ["rice-cooker", /\brice cooker\b/i],
  ["kettle", /\bkettle\b/i],
  ["stovetop", /\b(frying pan|saucepan|wok|simmer|hob|stovetop|on the stove)\b/i],
];
const COOKING_WORDS = /\b(oven|microwav\w*|fry|fried|frying|boil\w*|simmer\w*|bake|baked|roast\w*|grill\w*|air fryer|heat\w*|toast\w*)\b/i;

const applianceIds = new Set(APPLIANCES.map(([id]) => id));
const applianceNames = Object.fromEntries(APPLIANCES.map(([id, name]) => [id, name]));

// ── Catalog validation ───────────────────────────────────────────────────────
const errors = [];
const catalog = new Map(); // name -> { category, aliases }
const keyOwner = new Map(); // matching key -> ingredient name

for (const [name, category, aliases] of INGREDIENTS) {
  if (catalog.has(name)) errors.push(`catalog: duplicate ingredient "${name}"`);
  catalog.set(name, { category, aliases });
  for (const term of [name, ...aliases]) {
    const key = ingredientKey(term);
    const owner = keyOwner.get(key);
    if (owner && owner !== name) errors.push(`catalog: "${term}" (key "${key}") is used by both "${owner}" and "${name}"`);
    keyOwner.set(key, name);
  }
}

// ── Recipe loading ───────────────────────────────────────────────────────────
const batchFiles = readdirSync(RECIPES_DIR)
  .filter((f) => f.endsWith(".mjs"))
  .sort()
  .map((f) => join(RECIPES_DIR, f));

const recipes = [];
for (const file of batchFiles) {
  const mod = await import(pathToFileURL(file).href);
  if (!Array.isArray(mod.RECIPES)) {
    errors.push(`${file}: must export a RECIPES array`);
    continue;
  }
  mod.RECIPES.forEach((recipe) => recipes.push({ ...recipe, __file: file.replace(`${ROOT}/`, "") }));
}

function formatAmount(n) {
  const whole = Math.floor(n);
  const frac = Number((n - whole).toFixed(2));
  if (frac === 0) return String(whole);
  const symbol = FRACTIONS[frac];
  if (!symbol) return String(n);
  return whole ? `${whole}${symbol}` : symbol;
}

export function formatQuantity(amount, unit, note) {
  let q;
  if (NO_AMOUNT_UNITS.has(unit)) q = unit;
  else if (unit === "") q = formatAmount(amount);
  else if (PLURAL_UNITS[unit]) q = `${formatAmount(amount)} ${amount > 1 ? PLURAL_UNITS[unit] : unit}`;
  else q = `${formatAmount(amount)} ${unit}`;
  return note ? `${q}, ${note}` : q;
}

// ── Recipe validation & derivation ───────────────────────────────────────────
const slugs = new Map();
const titles = new Map();

for (const r of recipes) {
  const where = `${r.__file} › ${r.slug ?? "(no slug)"}`;
  const err = (msg) => errors.push(`${where}: ${msg}`);

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug ?? "")) err("slug must be kebab-case");
  if (slugs.has(r.slug)) err(`duplicate slug (also in ${slugs.get(r.slug)})`);
  slugs.set(r.slug, r.__file);
  const titleKey = (r.title ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (!r.title || r.title.length > 60) err("title required, ≤ 60 chars");
  if (titles.has(titleKey)) err(`duplicate title (also ${titles.get(titleKey)})`);
  titles.set(titleKey, r.slug);
  if (!r.description || r.description.length > 140) err("description required, ≤ 140 chars");
  if (NUTRITION_CLAIMS.test(`${r.title} ${r.description} ${(r.steps ?? []).join(" ")} ${r.storage ?? ""}`)) {
    err("avoid nutrition/health claims (healthy, calories, protein-packed, boost…)");
  }
  if (!r.emoji) err("emoji required");
  if (!Array.isArray(r.meals) || r.meals.length === 0 || r.meals.some((m) => !MEALS.has(m))) {
    err(`meals must be a non-empty subset of ${[...MEALS].join(", ")}`);
  }
  for (const t of r.tags ?? []) if (!MANUAL_TAGS.has(t)) err(`unknown tag "${t}" (allowed: ${[...MANUAL_TAGS].join(", ")})`);
  if (!Number.isInteger(r.prep) || r.prep < 0 || !Number.isInteger(r.cook) || r.cook < 0 || r.prep + r.cook < 1) {
    err("prep and cook must be whole minutes ≥ 0, total ≥ 1");
  }
  if (r.prep + r.cook > 90) err("total time over 90 minutes is not student-friendly");
  if (!Number.isInteger(r.servings) || r.servings < 1 || r.servings > 6) err("servings must be 1–6");
  if (typeof r.cost !== "number" || r.cost < 0.2 || r.cost > 5 || Math.round(r.cost * 10) !== r.cost * 10) {
    err("cost must be per-serving EUR between 0.20 and 5.00, rounded to 0.10");
  }
  if (!["Easy", "Medium"].includes(r.difficulty)) err('difficulty must be "Easy" or "Medium"');
  if (!Array.isArray(r.tools)) err("tools must be an array (may be empty)");
  if (!Array.isArray(r.steps) || r.steps.length < 3 || r.steps.length > 9) err("steps must have 3–9 entries");
  for (const s of r.steps ?? []) if (s.length > 320 || !/[.!)]$/.test(s)) err(`step too long or missing final period: "${s.slice(0, 50)}…"`);

  // Ingredients
  const names = new Set();
  let requiredCount = 0;
  for (const tuple of r.ingredients ?? []) {
    const [name, amount, unit, note, flag] = tuple;
    if (!catalog.has(name)) {
      err(`ingredient "${name}" is not in the catalog`);
      continue;
    }
    if (names.has(name)) err(`ingredient "${name}" listed twice`);
    names.add(name);
    if (!UNITS.has(unit)) err(`"${name}": unit "${unit}" not allowed (use ${[...UNITS].map((u) => `"${u}"`).join(", ")})`);
    if (NO_AMOUNT_UNITS.has(unit)) {
      if (amount !== null) err(`"${name}": amount must be null for unit "${unit}"`);
    } else if (typeof amount !== "number" || amount <= 0) {
      err(`"${name}": amount must be a positive number`);
    } else if ((unit === "g" || unit === "ml") && !Number.isInteger(amount)) {
      err(`"${name}": g/ml amounts must be whole numbers`);
    } else if (!Number.isInteger(amount * 4)) {
      err(`"${name}": use whole numbers or ¼ steps`);
    }
    if (note !== undefined && note !== null && typeof note !== "string") err(`"${name}": note must be a string`);
    if (flag !== undefined && !["staple", "optional"].includes(flag)) err(`"${name}": flag must be "staple" or "optional"`);
    if (STAPLES.has(name) && flag !== "staple") err(`"${name}" must be flagged "staple"`);
    if (flag === "staple" && !STAPLES.has(name)) err(`"${name}" cannot be a staple (only ${[...STAPLES].join(", ")})`);
    if (unit === "can" && !/\d+\s?(g|ml)\b/.test(note ?? "")) err(`"${name}": cans need a size in the note, e.g. "400 g, drained"`);
    if (!flag) requiredCount += 1;
  }
  if (requiredCount < 2) err("needs at least 2 required (non-staple, non-optional) ingredients");

  // Equipment
  const equipment = r.equipment ?? [];
  if (!Array.isArray(equipment)) err("equipment must be an array");
  const listed = new Set();
  for (const group of equipment) {
    if (!Array.isArray(group.any) || group.any.length === 0) err("each equipment group needs a non-empty `any` array");
    for (const id of group.any ?? []) {
      if (!applianceIds.has(id)) err(`unknown appliance "${id}"`);
      listed.add(id);
    }
    if ((group.any ?? []).length > 1) {
      if (!group.note) err(`equipment alternatives ${group.any.join(" / ")} need a note explaining the alternative method`);
      for (const id of group.any.slice(1)) {
        const label = applianceNames[id]?.split(" / ")[0].toLowerCase();
        if (label && !(group.note ?? "").toLowerCase().includes(label)) err(`alternative note must mention "${label}"`);
      }
    }
  }
  const stepsText = (r.steps ?? []).join(" ");
  for (const [id, re] of APPLIANCE_WORDS) {
    if (re.test(stepsText) && !listed.has(id)) err(`steps mention ${id} but it is not in equipment`);
  }
  if (equipment.length === 0 && COOKING_WORDS.test(stepsText)) {
    err("recipe has no essential equipment but its steps involve cooking");
  }

  // Food safety
  const nonOptional = (r.ingredients ?? []).filter((t) => t[4] !== "optional").map((t) => t[0]);
  if (nonOptional.some((n) => POULTRY_OR_MINCE.has(n)) && !/(75\s?°C|no pink|cooked through)/i.test(stepsText)) {
    err('poultry/mince/sausage recipes must say to cook until "cooked through" / "no pink" / 75°C');
  }
  if (nonOptional.some((n) => RAW_SEAFOOD.has(n)) && !/(opaque|flakes|cooked through|turn(ed|s)? pink)/i.test(stepsText)) {
    err('raw fish/prawn recipes must give a doneness cue ("opaque", "flakes easily", "turned pink")');
  }
  if (r.tags?.includes("meal-prep")) {
    if (!r.storage || !/fridge|refrigerat/i.test(r.storage) || !/\bdays?\b|24 hours/i.test(r.storage)) {
      err("meal-prep recipes need a storage note with fridge + time limit");
    }
  }
  if (r.storage && nonOptional.includes("rice") && !/24 hours/.test(r.storage)) {
    err("storage notes for rice dishes must say to eat cooked rice within 24 hours");
  }
  if (r.storage && /reheat/i.test(r.storage) && !/piping hot/i.test(r.storage)) {
    err('storage notes that mention reheating must say "until piping hot"');
  }

  // Derived tags
  const derived = new Set(r.tags ?? []);
  const allNames = (r.ingredients ?? []).map((t) => t[0]);
  const vegetarian = !allNames.some((n) => MEAT_FISH.has(n));
  if (vegetarian) derived.add("vegetarian");
  if (vegetarian && !allNames.some((n) => NOT_VEGAN.has(n))) derived.add("vegan");
  if (r.prep + r.cook <= 20) derived.add("quick");
  if (r.cost <= 1.2) derived.add("budget");
  if (equipment.filter((g) => !g.optional).length === 0) derived.add("no-cook");
  if (equipment.some((g) => g.any?.includes("air-fryer"))) derived.add("air-fryer");
  if (derived.has("high-protein")) {
    const hasProtein = (r.ingredients ?? []).some(
      (t) => t[4] !== "optional" && ["protein", "legumes"].includes(catalog.get(t[0])?.category),
    );
    if (!hasProtein) err('"high-protein" requires a non-optional protein or legume ingredient');
  }
  r.__tags = [...derived].sort();
}

// ── Report ───────────────────────────────────────────────────────────────────
const scope = onlyFiles.length ? recipes.filter((r) => onlyFiles.includes(resolve(ROOT, r.__file))) : recipes;
const scopedErrors = onlyFiles.length
  ? errors.filter((e) => e.startsWith("catalog") || onlyFiles.some((f) => e.startsWith(f.replace(`${ROOT}/`, ""))))
  : errors;

if (scopedErrors.length) {
  console.error(`✗ ${scopedErrors.length} problem(s):\n${scopedErrors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}

const usedIngredients = new Set(recipes.flatMap((r) => r.ingredients.map((t) => t[0])));
const tagCounts = {};
for (const r of recipes) for (const t of [...r.__tags, ...r.meals]) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
console.log(
  `✓ ${INGREDIENTS.length} ingredients (${usedIngredients.size} used in recipes), ${recipes.length} recipes` +
    (onlyFiles.length ? ` (${scope.length} in checked file)` : "") +
    ` across ${batchFiles.length} file(s)`,
);
console.log(
  `  ${Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t}:${n}`)
    .join("  ")}`,
);

if (!write) process.exit(0);

// ── SQL generation ───────────────────────────────────────────────────────────
const q = (s) => (s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const arr = (items) => (items.length ? `array[${items.map(q).join(", ")}]` : "'{}'::text[]");
const HEADER = `-- GENERATED by scripts/build-seed.mjs — do not edit by hand.\n-- Edit supabase/seed/** and run \`npm run seed:build\` instead.\n`;

const ingredientSql = `${HEADER}
-- =============================================================================
-- 004 — Ingredient catalog (${INGREDIENTS.length} ingredients)
-- Run AFTER 003. Safe to re-run. Only touches the shared catalog, never user data.
-- =============================================================================
begin;

insert into public.ingredients (name, category, aliases) values
${INGREDIENTS.map(([name, category, aliases]) => `  (${q(name)}, ${q(category)}, ${arr(aliases)})`).join(",\n")}
on conflict (name) do update
  set category = excluded.category,
      aliases = excluded.aliases;

do $$
begin
  if (select count(*) from public.ingredients where name = any(${arr(INGREDIENTS.map(([n]) => n))})) <> ${INGREDIENTS.length} then
    raise exception 'Ingredient catalog import incomplete';
  end if;
end $$;

commit;

select count(*) as ingredients_in_catalog from public.ingredients;
`;

const seededSlugs = arr(recipes.map((r) => r.slug));
const ingredientRows = [];
const equipmentRows = [];
for (const r of recipes) {
  r.ingredients.forEach(([name, amount, unit, note, flag], index) => {
    ingredientRows.push(
      `  (${q(r.slug)}, ${q(name)}, ${q(formatQuantity(amount, unit, note))}, ${flag === "staple"}, ${flag === "optional"}, ${index + 1})`,
    );
  });
  (r.equipment ?? []).forEach((group, groupIndex) => {
    group.any.forEach((id, i) => {
      equipmentRows.push(`  (${q(r.slug)}, ${q(id)}, ${groupIndex + 1}, ${Boolean(group.optional)}, ${q(i === 0 ? group.note ?? null : null)})`);
    });
  });
}

const recipeSql = `${HEADER}
-- =============================================================================
-- 005 — Recipe library (${recipes.length} recipes, ${ingredientRows.length} ingredient links, ${equipmentRows.length} equipment links)
-- Run AFTER 004. Safe to re-run: recipes are upserted by slug and their
-- ingredient/equipment links are rebuilt. Never touches user data.
-- Costs are illustrative per-serving estimates, not live prices.
-- =============================================================================
begin;

insert into public.recipes
  (slug, title, description, emoji, prep_minutes, cook_minutes, total_minutes, servings,
   estimated_cost_per_serving_eur, difficulty, meal_types, tags, tools, instructions, storage_note)
values
${recipes
  .map(
    (r) =>
      `  (${q(r.slug)}, ${q(r.title)}, ${q(r.description)}, ${q(r.emoji)}, ${r.prep}, ${r.cook}, ${r.prep + r.cook}, ${r.servings},\n` +
      `   ${r.cost.toFixed(2)}, ${q(r.difficulty)}, ${arr(r.meals)}, ${arr(r.__tags)}, ${arr(r.tools)},\n` +
      `   ${arr(r.steps)},\n   ${q(r.storage ?? null)})`,
  )
  .join(",\n")}
on conflict (slug) do update
  set title = excluded.title,
      description = excluded.description,
      emoji = excluded.emoji,
      prep_minutes = excluded.prep_minutes,
      cook_minutes = excluded.cook_minutes,
      total_minutes = excluded.total_minutes,
      servings = excluded.servings,
      estimated_cost_per_serving_eur = excluded.estimated_cost_per_serving_eur,
      difficulty = excluded.difficulty,
      meal_types = excluded.meal_types,
      tags = excluded.tags,
      tools = excluded.tools,
      instructions = excluded.instructions,
      storage_note = excluded.storage_note;

-- Rebuild ingredient links for seeded recipes
delete from public.recipe_ingredients ri
using public.recipes r
where ri.recipe_id = r.id and r.slug = any(${seededSlugs});

insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, is_staple, is_optional, sort_order)
select r.id, i.id, v.quantity, v.is_staple, v.is_optional, v.sort_order
from (values
${ingredientRows.join(",\n")}
) as v (slug, ingredient, quantity, is_staple, is_optional, sort_order)
join public.recipes r on r.slug = v.slug
join public.ingredients i on i.name = v.ingredient;

-- Rebuild equipment links for seeded recipes
delete from public.recipe_equipment re
using public.recipes r
where re.recipe_id = r.id and r.slug = any(${seededSlugs});

insert into public.recipe_equipment (recipe_id, appliance_id, option_group, is_optional, note)
select r.id, v.appliance_id, v.option_group, v.is_optional, v.note
from (values
${equipmentRows.join(",\n")}
) as v (slug, appliance_id, option_group, is_optional, note)
join public.recipes r on r.slug = v.slug;

do $$
begin
  if (select count(*) from public.recipe_ingredients ri join public.recipes r on r.id = ri.recipe_id
      where r.slug = any(${seededSlugs})) <> ${ingredientRows.length} then
    raise exception 'Recipe ingredient links incomplete. Did you run 004_ingredient_catalog.sql first?';
  end if;
  if (select count(*) from public.recipe_equipment re join public.recipes r on r.id = re.recipe_id
      where r.slug = any(${seededSlugs})) <> ${equipmentRows.length} then
    raise exception 'Recipe equipment links incomplete. Did you run 002_my_kitchen.sql first?';
  end if;
end $$;

commit;

select
  (select count(*) from public.recipes)            as recipes,
  (select count(*) from public.recipe_ingredients) as recipe_ingredient_links,
  (select count(*) from public.recipe_equipment)   as recipe_equipment_links;
`;

// Appliance rows in 002 are hand-written; make sure they agree with the seed list.
const kitchenSql = readFileSync(join(MIGRATIONS_DIR, "002_my_kitchen.sql"), "utf8");
for (const [id] of APPLIANCES) {
  if (!kitchenSql.includes(`'${id}'`)) {
    console.error(`✗ appliance "${id}" is missing from 002_my_kitchen.sql`);
    process.exit(1);
  }
}

writeFileSync(join(MIGRATIONS_DIR, "004_ingredient_catalog.sql"), ingredientSql);
writeFileSync(join(MIGRATIONS_DIR, "005_recipe_library.sql"), recipeSql);
console.log(`✓ wrote supabase/migrations/004_ingredient_catalog.sql and 005_recipe_library.sql`);
