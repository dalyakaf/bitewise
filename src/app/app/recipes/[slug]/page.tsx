import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { fridgeKeySet, formatEuro, matchRecipe } from "@/lib/matching";
import { createClient } from "@/lib/supabase/server";
import { FRIDGE_ITEM_COLUMNS, RECIPE_COLUMNS, type FridgeItem, type Recipe } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Recipe" };

export default async function RecipePage({ params }: Params) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [recipeResult, fridgeResult] = await Promise.all([
    supabase.from("recipes").select(RECIPE_COLUMNS).eq("slug", slug).maybeSingle(),
    supabase.from("fridge_items").select(FRIDGE_ITEM_COLUMNS),
  ]);
  if (!recipeResult.data) notFound();

  const recipe = recipeResult.data as unknown as Recipe;
  const { status, have, missing, staples } = matchRecipe(recipe, fridgeKeySet((fridgeResult.data ?? []) as FridgeItem[]));
  const haveIds = new Set(have.map((ri) => ri.ingredient.id));
  const required = [...have, ...missing].sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name));

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
          {status === "cook-now" && (
            <span className="rounded-full bg-sage-700 px-3 py-1 text-sm font-semibold text-white">
              ✓ Cook Now: you have everything
            </span>
          )}
          {status === "almost" && (
            <span className="rounded-full bg-terracotta-600 px-3 py-1 text-sm font-semibold text-white">
              Almost There: missing {missing.length}
            </span>
          )}
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{recipe.title}</h1>
          <p className="mt-2 text-lg text-ink-soft">{recipe.description}</p>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Time", `${recipe.total_minutes} min`],
              ["Serves", String(recipe.servings)],
              ["Cost / serving", `~${formatEuro(recipe.estimated_cost_per_serving_eur)}`],
              ["Difficulty", recipe.difficulty],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-cream px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {recipe.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tags">
              {recipe.tags.map((tag) => (
                <li key={tag} className="rounded-full bg-sage-50 px-3 py-1 text-xs font-semibold text-sage-800">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_1.4fr]">
        <section aria-labelledby="ingredients-heading" className="rounded-3xl border border-line bg-white p-6">
          <h2 id="ingredients-heading" className="font-display text-xl font-semibold">
            Ingredients
          </h2>
          <ul className="mt-4 space-y-2">
            {required.map((ri) => {
              const owned = haveIds.has(ri.ingredient.id);
              return (
                <li key={ri.ingredient.id} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      owned ? "bg-sage-700 text-white" : "border-2 border-terracotta-400 text-terracotta-600"
                    }`}
                  >
                    {owned ? "✓" : "!"}
                  </span>
                  <span>
                    <span className="font-semibold capitalize">{ri.ingredient.name}</span>
                    {ri.quantity && <span className="text-ink-soft"> · {ri.quantity}</span>}
                    <span className={`block text-xs ${owned ? "text-sage-800" : "text-terracotta-600"}`}>
                      {owned ? "In your fridge" : "Missing"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

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

          {missing.length > 0 && (
            <p className="mt-6 rounded-2xl bg-terracotta-50 px-4 py-3 text-sm text-terracotta-600">
              <span className="font-semibold">Shopping list:</span> {missing.map((m) => m.ingredient.name).join(", ")}
            </p>
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
          <p className="mt-6 text-xs text-ink-soft">Cost is an illustrative estimate, not a live supermarket price.</p>
        </section>
      </div>
    </article>
  );
}
