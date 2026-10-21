import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RecipeFavoriteToggle } from "@/components/app/RecipeFavoriteToggle";
import { buildMatchContext, costBand, matchEquipment, matchRecipe, TAG_LABELS } from "@/lib/matching";
import { createClient } from "@/lib/supabase/server";
import {
  APPLIANCE_COLUMNS,
  CATALOG_COLUMNS,
  FRIDGE_ITEM_COLUMNS,
  RECIPE_COLUMNS,
  type Appliance,
  type CatalogIngredient,
  type FridgeItem,
  type Recipe,
  type RecipeIngredient,
  type SwapRule,
} from "@/lib/types";

type Params = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Recipe" };

function IngredientRow({ ri, owned, swapName }: { ri: RecipeIngredient; owned: boolean; swapName?: string }) {
  const state = owned ? "owned" : swapName ? "swap" : "missing";
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          state === "owned"
            ? "bg-sage-700 text-white"
            : state === "swap"
              ? "bg-sage-100 text-sage-800 ring-1 ring-sage-500"
              : "border-2 border-terracotta-400 text-terracotta-600"
        }`}
      >
        {state === "owned" ? "✓" : state === "swap" ? "↺" : "!"}
      </span>
      <span>
        <span className="font-semibold capitalize">{ri.ingredient.name}</span>
        {ri.quantity && <span className="text-ink-soft"> · {ri.quantity}</span>}
        <span className={`block text-xs ${state === "missing" ? "text-terracotta-600" : "text-sage-800"}`}>
          {state === "owned" ? "In your fridge" : state === "swap" ? `Swap: use your ${swapName}` : "Missing"}
        </span>
      </span>
    </li>
  );
}

export default async function RecipePage({ params }: Params) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [recipeResult, fridgeResult, appliancesResult, kitchenResult, catalogResult] = await Promise.all([
    supabase.from("recipes").select(RECIPE_COLUMNS).eq("slug", slug).maybeSingle(),
    supabase.from("fridge_items").select(FRIDGE_ITEM_COLUMNS),
    supabase.from("appliances").select(APPLIANCE_COLUMNS).order("sort_order"),
    supabase.from("user_appliances").select("appliance_id"),
    supabase.from("ingredients").select(CATALOG_COLUMNS),
  ]);
  if (!recipeResult.data) notFound();

  const recipe = recipeResult.data as unknown as Recipe;
  const [swapsResult, favoriteResult] = await Promise.all([
    supabase
      .from("recipe_substitutions")
      .select(
        "extra_minutes, rule:ingredient_substitutions(id, original_ingredient_id, substitute_ingredient_id, ratio_note, context_note, adjustment_note, limitation_note, allergen_note, is_adapted)",
      )
      .eq("recipe_id", recipe.id),
    supabase.from("favorite_recipes").select("recipe_id").eq("recipe_id", recipe.id).maybeSingle(),
  ]);
  const swapRules: SwapRule[] = ((swapsResult.data ?? []) as unknown as { extra_minutes: number; rule: Omit<SwapRule, "recipe_substitutions"> | null }[])
    .filter((row) => row.rule)
    .map((row) => ({ ...row.rule!, recipe_substitutions: [{ recipe_id: recipe.id, extra_minutes: row.extra_minutes }] }));
  const catalog = (catalogResult.data ?? []) as CatalogIngredient[];
  const catalogById = new Map(catalog.map((c) => [c.id, c]));
  const appliances = (appliancesResult.data ?? []) as Appliance[];
  const applianceById = Object.fromEntries(appliances.map((a) => [a.id, a]));
  const ownedAppliances = new Set(((kitchenResult.data ?? []) as { appliance_id: string }[]).map((r) => r.appliance_id));
  const kitchenConfigured = ownedAppliances.size > 0;

  const match = matchRecipe(recipe, buildMatchContext((fridgeResult.data ?? []) as FridgeItem[], catalog, swapRules));
  const { status, have, missing, optional, staples, swaps, stillMissing } = match;
  const appliedRuleIds = new Set(swaps.map((s) => s.rule.id));
  const otherSwaps = swapRules.filter((rule) => !appliedRuleIds.has(rule.id));
  const ingredientName = (id: number) => catalogById.get(id)?.name ?? "ingredient";
  const equipment = matchEquipment(recipe, ownedAppliances);
  const haveIds = new Set(have.map((ri) => ri.ingredient.id));
  const swapByIngredient = new Map(swaps.map((s) => [s.original.ingredient.id, s]));
  const required = [...have, ...missing].sort((a, b) => a.sort_order - b.sort_order);
  const essentialGroups = equipment.groups.filter((g) => !g.optional);
  const optionalGroups = equipment.groups.filter((g) => g.optional);
  const applianceLabel = (id: string) => `${applianceById[id]?.emoji ?? ""} ${applianceById[id]?.name ?? id}`.trim();

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/app#meal-finder" className="text-sm font-semibold text-sage-800 hover:underline">
        ← Back to Meal Finder
      </Link>

      <header className="mt-4 overflow-hidden rounded-[2rem] border border-line bg-white">
        <div className="flex h-44 items-center justify-center bg-gradient-to-br from-terracotta-100 via-cream to-sage-100 text-8xl sm:h-56">
          <span aria-hidden="true">{recipe.emoji}</span>
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-2">
            {status === "cook-now" && (
              <span className="rounded-full bg-sage-700 px-3 py-1 text-sm font-semibold text-white">
                ✓ Cook Now: all ingredients in your fridge
              </span>
            )}
            {status === "smart-swap" && (
              <span className="rounded-full bg-sage-100 px-3 py-1 text-sm font-semibold text-sage-800 ring-1 ring-sage-500">
                🔄 Smart Swaps: possible with {swaps.length} swap{swaps.length === 1 ? "" : "s"} from your fridge
              </span>
            )}
            {status === "almost" && (
              <span className="rounded-full bg-terracotta-600 px-3 py-1 text-sm font-semibold text-white">
                Almost There: {stillMissing.length} ingredient{stillMissing.length === 1 ? "" : "s"} to buy
              </span>
            )}
            {kitchenConfigured &&
              (equipment.canMake ? (
                <span className="rounded-full border border-sage-500 px-3 py-1 text-sm font-semibold text-sage-800">
                  🍳 Your kitchen has the equipment
                </span>
              ) : (
                <span className="rounded-full border border-terracotta-400 px-3 py-1 text-sm font-semibold text-terracotta-600">
                  🍳 Your kitchen is missing equipment
                </span>
              ))}
          </div>
          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{recipe.title}</h1>
            {!favoriteResult.error && (
              <RecipeFavoriteToggle recipeId={recipe.id} title={recipe.title} initialActive={Boolean(favoriteResult.data)} />
            )}
          </div>
          <p className="mt-2 text-lg text-ink-soft">{recipe.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Prep", `${recipe.prep_minutes} min`],
              ["Cook", `${recipe.cook_minutes} min`],
              ...(match.adaptedMinutes !== recipe.total_minutes ? [["With your swaps", `≈ ${match.adaptedMinutes} min total`]] : []),
              ["Serves", String(recipe.servings)],
              ["Cost / serving", costBand(recipe.estimated_cost_per_serving_eur)],
              ["Difficulty", recipe.difficulty],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-cream px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {(recipe.meal_types.length > 0 || recipe.tags.length > 0) && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Categories">
              {[...recipe.meal_types, ...recipe.tags].map((tag) => (
                <li key={tag} className="rounded-full bg-sage-50 px-3 py-1 text-xs font-semibold capitalize text-sage-800">
                  {TAG_LABELS[tag] ?? tag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {swaps.length > 0 && (
        <section aria-labelledby="swaps-heading" className="mt-8 rounded-3xl border border-sage-500 bg-sage-50 p-6">
          <h2 id="swaps-heading" className="font-display text-xl font-semibold text-sage-800">
            🔄 Smart Swaps for your fridge
          </h2>
          <p className="mt-1 text-sm text-sage-800">
            Missing an ingredient? Make it work with what you&apos;ve got. This is an adapted version of the recipe: read
            the changes below before you start. The method further down is the original recipe.
          </p>
          <ul className="mt-4 space-y-4">
            {swaps.map((swap) => (
              <li key={swap.rule.id} className="rounded-2xl bg-white p-4 text-sm">
                <dl className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                  <dt className="font-semibold text-ink-soft">Original ingredient</dt>
                  <dd>
                    <span className="capitalize">{swap.original.ingredient.name}</span>
                    {swap.original.quantity && ` · ${swap.original.quantity}`}
                  </dd>
                  <dt className="font-semibold text-ink-soft">Your alternative</dt>
                  <dd className="font-semibold text-sage-800">
                    <span className="capitalize">{swap.substitute.name}</span>
                    {swap.substitute.category === "staple"
                      ? " (pantry staple)"
                      : swap.fridgeName.toLowerCase() !== swap.substitute.name.toLowerCase() && ` (“${swap.fridgeName}” in your fridge)`}
                  </dd>
                  <dt className="font-semibold text-ink-soft">Quantity</dt>
                  <dd>{swap.rule.ratio_note}</dd>
                  <dt className="font-semibold text-ink-soft">What changes</dt>
                  <dd>
                    {swap.rule.adjustment_note}
                    {swap.extraMinutes !== 0 &&
                      ` (${swap.extraMinutes > 0 ? `about ${swap.extraMinutes} min longer` : `about ${-swap.extraMinutes} min quicker`})`}
                  </dd>
                  <dt className="font-semibold text-ink-soft">Good to know</dt>
                  <dd>
                    {swap.rule.limitation_note}
                    {swap.rule.is_adapted && " The finished dish will be noticeably different from the original."}
                  </dd>
                  <dt className="font-semibold text-ink-soft">Allergens</dt>
                  <dd>{swap.rule.allergen_note}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="equipment-heading" className="mt-8 rounded-3xl border border-line bg-white p-6">
        <h2 id="equipment-heading" className="font-display text-xl font-semibold">
          Equipment needed
        </h2>
        {essentialGroups.length === 0 ? (
          <p className="mt-3 text-ink-soft">No cooking appliance needed.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {essentialGroups.map((group) => {
              const ok = group.ownedOptions.length > 0;
              return (
                <li key={group.appliances.join("|")} className="rounded-2xl bg-cream px-4 py-3">
                  <p className="font-semibold">
                    {group.appliances.map(applianceLabel).join(" or ")}
                    {kitchenConfigured && (
                      <span className={`ml-2 text-sm font-medium ${ok ? "text-sage-800" : "text-terracotta-600"}`}>
                        {ok ? "✓ in your kitchen" : "✗ not in your kitchen"}
                      </span>
                    )}
                  </p>
                  {group.note && (
                    <p className="mt-1 text-sm text-ink-soft">
                      <span className="font-semibold">Alternative method: </span>
                      {group.note}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {optionalGroups.length > 0 && (
          <p className="mt-3 text-sm text-ink-soft">
            <span className="font-semibold">Nice to have:</span>{" "}
            {optionalGroups.map((g) => g.appliances.map(applianceLabel).join(" or ")).join(", ")}
          </p>
        )}
        {recipe.tools.length > 0 && (
          <p className="mt-3 text-sm text-ink-soft">
            <span className="font-semibold">Tools:</span> {recipe.tools.join(", ")}
          </p>
        )}
        {!kitchenConfigured && (
          <p className="mt-3 text-sm">
            <Link href="/app#kitchen" className="font-semibold text-terracotta-600 underline underline-offset-4">
              Set up My Kitchen
            </Link>{" "}
            <span className="text-ink-soft">to check this against your appliances.</span>
          </p>
        )}
      </section>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_1.4fr]">
        <section aria-labelledby="ingredients-heading" className="rounded-3xl border border-line bg-white p-6">
          <h2 id="ingredients-heading" className="font-display text-xl font-semibold">
            Ingredients
          </h2>
          <ul className="mt-4 space-y-2">
            {required.map((ri) => (
              <IngredientRow
                key={ri.ingredient.id}
                ri={ri}
                owned={haveIds.has(ri.ingredient.id)}
                swapName={swapByIngredient.get(ri.ingredient.id)?.substitute.name}
              />
            ))}
          </ul>

          {optional.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-ink-soft">Optional extras</h3>
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {optional.map((ri) => (
                  <li key={ri.ingredient.id}>
                    <span className="capitalize">{ri.ingredient.name}</span>
                    {ri.quantity && ` · ${ri.quantity}`}
                  </li>
                ))}
              </ul>
            </>
          )}

          {staples.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-ink-soft">Pantry basics (assumed)</h3>
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                {staples.map((ri) => (
                  <li key={ri.ingredient.id}>
                    <span className="capitalize">{ri.ingredient.name}</span>
                    {ri.quantity && ` · ${ri.quantity}`}
                  </li>
                ))}
              </ul>
            </>
          )}

          {stillMissing.length > 0 && (
            <p className="mt-6 rounded-2xl bg-terracotta-50 px-4 py-3 text-sm text-terracotta-600">
              <span className="font-semibold">Shopping list:</span> {stillMissing.map((m) => m.ingredient.name).join(", ")}
            </p>
          )}

          {otherSwaps.length > 0 && (
            <details className="mt-6 text-sm">
              <summary className="cursor-pointer font-semibold text-sage-800">
                Possible swaps for this recipe ({otherSwaps.length})
              </summary>
              <ul className="mt-2 space-y-2 text-ink-soft">
                {otherSwaps.map((rule) => (
                  <li key={rule.id}>
                    <span className="font-medium capitalize text-ink">{ingredientName(rule.original_ingredient_id)}</span> →{" "}
                    <span className="font-medium text-ink">{ingredientName(rule.substitute_ingredient_id)}</span>:{" "}
                    {rule.adjustment_note}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section aria-labelledby="method-heading" className="rounded-3xl border border-line bg-white p-6">
          <h2 id="method-heading" className="font-display text-xl font-semibold">
            Method
          </h2>
          <ol className="mt-4 space-y-4">
            {recipe.instructions.map((step, index) => (
              <li key={index} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-100 font-semibold text-sage-800"
                >
                  {index + 1}
                </span>
                <p className="pt-1 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
          {recipe.storage_note && (
            <p className="mt-6 rounded-2xl bg-sage-50 px-4 py-3 text-sm text-sage-800">
              <span className="font-semibold">Storage & food safety: </span>
              {recipe.storage_note}
            </p>
          )}
          <p className="mt-6 text-xs text-ink-soft">Cost is a rough estimate, not a live supermarket price.</p>
        </section>
      </div>
    </article>
  );
}
