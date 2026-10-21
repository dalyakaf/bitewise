import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GroceryListView } from "@/components/app/GroceryListView";
import type { PlannedMeal } from "@/lib/grocery";
import { createClient } from "@/lib/supabase/server";
import {
  CATALOG_COLUMNS,
  FRIDGE_ITEM_COLUMNS,
  GROCERY_RECIPE_COLUMNS,
  SWAP_COLUMNS,
  type CatalogIngredient,
  type FridgeItem,
  type GroceryManualItem,
  type SwapRule,
} from "@/lib/types";
import { addDays, formatWeekRange, todayIso, weekFromParam } from "@/lib/week";

export const metadata: Metadata = { title: "Smart Grocery List" };

type Props = { searchParams: Promise<{ week?: string | string[] }> };

export default async function GroceryPage({ searchParams }: Props) {
  const week = weekFromParam((await searchParams).week);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [mealsResult, fridgeResult, catalogResult, swapsResult, manualResult, statesResult] = await Promise.all([
    supabase
      .from("meal_plan_entries")
      .select(`id, servings, swap_ids, recipe:recipes(${GROCERY_RECIPE_COLUMNS})`)
      .gte("plan_date", week)
      .lte("plan_date", addDays(week, 6)),
    supabase.from("fridge_items").select(FRIDGE_ITEM_COLUMNS),
    supabase.from("ingredients").select(CATALOG_COLUMNS),
    supabase.from("ingredient_substitutions").select(SWAP_COLUMNS),
    supabase.from("grocery_manual_items").select("id, name, checked, created_at").eq("week_start", week).order("created_at"),
    supabase.from("grocery_item_states").select("item_key").eq("week_start", week).eq("checked", true),
  ]);

  const meals = ((mealsResult.data ?? []) as unknown as PlannedMeal[]).filter((m) => m.recipe);

  return (
    <GroceryListView
      key={week}
      week={week}
      weekLabel={formatWeekRange(week)}
      thisWeek={weekFromParam(todayIso())}
      meals={meals}
      fridgeItems={(fridgeResult.data ?? []) as FridgeItem[]}
      catalog={(catalogResult.data ?? []) as CatalogIngredient[]}
      swapRules={(swapsResult.data ?? []) as unknown as SwapRule[]}
      initialManual={(manualResult.data ?? []) as GroceryManualItem[]}
      initialChecked={((statesResult.data ?? []) as { item_key: string }[]).map((s) => s.item_key)}
      unavailable={Boolean(mealsResult.error || manualResult.error || statesResult.error)}
    />
  );
}
