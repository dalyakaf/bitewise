"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildCatalogIndex, buildMatchContext, matchEquipment, matchRecipe } from "@/lib/matching";
import type { StudyEntry } from "@/lib/study-mode";
import { createClient } from "@/lib/supabase/client";
import type { Appliance, CatalogIngredient, FridgeItem, Recipe, SwapRule } from "@/lib/types";
import { AppNav } from "./AppNav";
import { ComingSoon } from "./ComingSoon";
import { FavoritesPanel } from "./FavoritesPanel";
import { FridgePanel } from "./FridgePanel";
import { KitchenPanel } from "./KitchenPanel";
import { MealFinder } from "./MealFinder";

type Props = {
  initialItems: FridgeItem[];
  fridgeUnavailable: boolean;
  recipes: Recipe[];
  recipesUnavailable: boolean;
  catalog: CatalogIngredient[];
  appliances: Appliance[];
  initialOwnedAppliances: string[];
  kitchenUnavailable: boolean;
  swapRules: SwapRule[];
  initialFavoriteIds: number[];
  favoritesUnavailable: boolean;
};

type Notice = { kind: "info" | "error"; text: string };

function toggled<T>(set: Set<T>, value: T, on: boolean) {
  const next = new Set(set);
  if (on) next.add(value);
  else next.delete(value);
  return next;
}

export function Dashboard({
  initialItems,
  fridgeUnavailable,
  recipes,
  recipesUnavailable,
  catalog,
  appliances,
  initialOwnedAppliances,
  kitchenUnavailable,
  swapRules,
  initialFavoriteIds,
  favoritesUnavailable,
}: Props) {
  const [items, setItems] = useState<FridgeItem[]>(initialItems);
  const [ownedAppliances, setOwnedAppliances] = useState<Set<string>>(() => new Set(initialOwnedAppliances));
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => new Set(initialFavoriteIds));
  const [favoritePending, setFavoritePending] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<Notice | null>(null);

  const catalogIndex = useMemo(() => buildCatalogIndex(catalog, recipes), [catalog, recipes]);
  const applianceNames = useMemo(() => Object.fromEntries(appliances.map((a) => [a.id, a.name])), [appliances]);
  const entries: StudyEntry[] = useMemo(() => {
    const ctx = buildMatchContext(items, catalog, swapRules);
    return recipes.map((recipe) => ({ ...matchRecipe(recipe, ctx), equipment: matchEquipment(recipe, ownedAppliances) }));
  }, [items, catalog, swapRules, recipes, ownedAppliances]);

  // Re-sync favorites when the dashboard mounts (e.g. after changing one on a recipe page).
  useEffect(() => {
    if (favoritesUnavailable) return;
    let cancelled = false;
    createClient()
      .from("favorite_recipes")
      .select("recipe_id")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setFavoriteIds(new Set(data.map((row) => row.recipe_id as number)));
      });
    return () => {
      cancelled = true;
    };
  }, [favoritesUnavailable]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const toggleFavorite = useCallback(
    async (recipe: Recipe) => {
      if (favoritePending.has(recipe.id)) return;
      const on = !favoriteIds.has(recipe.id);
      setFavoritePending((prev) => toggled(prev, recipe.id, true));
      setFavoriteIds((prev) => toggled(prev, recipe.id, on));

      const supabase = createClient();
      const { error } = on
        ? await supabase
            .from("favorite_recipes")
            .upsert({ recipe_id: recipe.id }, { onConflict: "user_id,recipe_id", ignoreDuplicates: true })
        : await supabase.from("favorite_recipes").delete().eq("recipe_id", recipe.id);

      setFavoritePending((prev) => toggled(prev, recipe.id, false));
      if (error) {
        setFavoriteIds((prev) => toggled(prev, recipe.id, !on));
        setNotice({ kind: "error", text: `We couldn't ${on ? "save" : "remove"} ${recipe.title}. Please try again.` });
        return;
      }
      setNotice({
        kind: "info",
        text: on ? `${recipe.title} saved to My Favorites.` : `${recipe.title} removed from My Favorites.`,
      });
    },
    [favoriteIds, favoritePending],
  );

  const favoriteFor = useCallback(
    (recipe: Recipe) =>
      favoritesUnavailable
        ? undefined
        : {
            active: favoriteIds.has(recipe.id),
            pending: favoritePending.has(recipe.id),
            onToggle: () => toggleFavorite(recipe),
          },
    [favoritesUnavailable, favoriteIds, favoritePending, toggleFavorite],
  );

  const favoriteEntries = useMemo(() => {
    const byId = new Map(entries.map((e) => [e.recipe.id, e]));
    return [...favoriteIds].map((id) => byId.get(id)).filter((e): e is StudyEntry => Boolean(e));
  }, [entries, favoriteIds]);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-6">
        <AppNav />
        <FridgePanel
          items={items}
          setItems={setItems}
          catalog={catalog}
          catalogIndex={catalogIndex}
          unavailable={fridgeUnavailable}
        />
      </div>
      <KitchenPanel
        appliances={appliances}
        owned={ownedAppliances}
        setOwned={setOwnedAppliances}
        unavailable={kitchenUnavailable}
      />
      <MealFinder
        entries={entries}
        recipeCount={recipes.length}
        applianceNames={applianceNames}
        ownedAppliances={ownedAppliances}
        unavailable={recipesUnavailable}
        favoriteFor={favoriteFor}
      />
      <FavoritesPanel
        entries={favoriteEntries}
        applianceNames={applianceNames}
        kitchenConfigured={ownedAppliances.size > 0}
        favoriteFor={favoriteFor}
        unavailable={favoritesUnavailable}
      />
      <ComingSoon />

      <div
        role={notice?.kind === "error" ? "alert" : "status"}
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
      >
        {notice && (
          <p
            className={`pointer-events-auto rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg ${
              notice.kind === "error" ? "bg-terracotta-600 text-white" : "bg-ink text-cream"
            }`}
          >
            {notice.text}
          </p>
        )}
      </div>
    </div>
  );
}
