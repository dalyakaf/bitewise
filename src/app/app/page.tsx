import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/app/Dashboard";
import { createClient } from "@/lib/supabase/server";
import { FRIDGE_ITEM_COLUMNS, RECIPE_COLUMNS, type FridgeItem, type Recipe } from "@/lib/types";

export const metadata: Metadata = { title: "My Smart Fridge" };

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [fridgeResult, recipesResult] = await Promise.all([
    supabase.from("fridge_items").select(FRIDGE_ITEM_COLUMNS).order("created_at", { ascending: false }),
    supabase.from("recipes").select(RECIPE_COLUMNS).order("total_minutes", { ascending: true }),
  ]);

  return (
    <Dashboard
      initialItems={(fridgeResult.data ?? []) as FridgeItem[]}
      fridgeUnavailable={Boolean(fridgeResult.error)}
      recipes={(recipesResult.data ?? []) as unknown as Recipe[]}
      recipesUnavailable={Boolean(recipesResult.error)}
    />
  );
}
