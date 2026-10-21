import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/app/Dashboard";
import { createClient } from "@/lib/supabase/server";
import {
  APPLIANCE_COLUMNS,
  CATALOG_COLUMNS,
  FRIDGE_ITEM_COLUMNS,
  RECIPE_COLUMNS,
  SWAP_COLUMNS,
  type Appliance,
  type CatalogIngredient,
  type FridgeItem,
  type Recipe,
  type SwapRule,
} from "@/lib/types";

export const metadata: Metadata = { title: "My Smart Fridge" };

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Each query degrades independently, so the fridge (the core feature) keeps
  // working even if a newer table is unavailable.
  const [fridgeResult, recipesResult, catalogResult, appliancesResult, kitchenResult, swapsResult, favoritesResult, plannerResult] =
    await Promise.all([
      supabase.from("fridge_items").select(FRIDGE_ITEM_COLUMNS).order("created_at", { ascending: false }),
      supabase.from("recipes").select(RECIPE_COLUMNS).order("total_minutes", { ascending: true }),
      supabase.from("ingredients").select(CATALOG_COLUMNS).order("name"),
      supabase.from("appliances").select(APPLIANCE_COLUMNS).order("sort_order"),
      supabase.from("user_appliances").select("appliance_id"),
      supabase.from("ingredient_substitutions").select(SWAP_COLUMNS),
      supabase.from("favorite_recipes").select("recipe_id").order("created_at", { ascending: false }),
      supabase.from("meal_plan_entries").select("id", { head: true, count: "exact" }),
    ]);

  return (
    <Dashboard
      initialItems={(fridgeResult.data ?? []) as FridgeItem[]}
      fridgeUnavailable={Boolean(fridgeResult.error)}
      recipes={(recipesResult.data ?? []) as unknown as Recipe[]}
      recipesUnavailable={Boolean(recipesResult.error)}
      catalog={(catalogResult.data ?? []) as CatalogIngredient[]}
      appliances={(appliancesResult.data ?? []) as Appliance[]}
      initialOwnedAppliances={((kitchenResult.data ?? []) as { appliance_id: string }[]).map((row) => row.appliance_id)}
      kitchenUnavailable={Boolean(appliancesResult.error || kitchenResult.error)}
      swapRules={(swapsResult.data ?? []) as unknown as SwapRule[]}
      initialFavoriteIds={((favoritesResult.data ?? []) as { recipe_id: number }[]).map((row) => row.recipe_id)}
      favoritesUnavailable={Boolean(favoritesResult.error)}
      plannerAvailable={!plannerResult.error}
    />
  );
}
