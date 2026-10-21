import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WeeklyPlanner } from "@/components/app/WeeklyPlanner";
import { createClient } from "@/lib/supabase/server";
import { PLAN_ENTRY_COLUMNS, PLAN_RECIPE_COLUMNS, type MealPlanEntry, type PlanRecipeSummary } from "@/lib/types";
import { addDays, todayIso, weekFromParam } from "@/lib/week";

export const metadata: Metadata = { title: "My Weekly Meals" };

type Props = { searchParams: Promise<{ week?: string | string[] }> };

export default async function PlanPage({ searchParams }: Props) {
  const week = weekFromParam((await searchParams).week);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [entriesResult, recipesResult, favoritesResult, swapsResult, catalogResult] = await Promise.all([
    supabase
      .from("meal_plan_entries")
      .select(PLAN_ENTRY_COLUMNS)
      .gte("plan_date", week)
      .lte("plan_date", addDays(week, 6))
      .order("created_at", { ascending: true }),
    supabase.from("recipes").select(PLAN_RECIPE_COLUMNS).order("title"),
    supabase.from("favorite_recipes").select("recipe_id"),
    supabase.from("ingredient_substitutions").select("id, original_ingredient_id, substitute_ingredient_id"),
    supabase.from("ingredients").select("id, name"),
  ]);

  const names = new Map(((catalogResult.data ?? []) as { id: number; name: string }[]).map((c) => [c.id, c.name]));
  const swapLabels = Object.fromEntries(
    ((swapsResult.data ?? []) as { id: number; original_ingredient_id: number; substitute_ingredient_id: number }[]).map((r) => [
      r.id,
      `${names.get(r.original_ingredient_id) ?? "?"} → ${names.get(r.substitute_ingredient_id) ?? "?"}`,
    ]),
  );

  return (
    <WeeklyPlanner
      key={week}
      week={week}
      today={todayIso()}
      initialEntries={(entriesResult.data ?? []) as MealPlanEntry[]}
      recipes={(recipesResult.data ?? []) as PlanRecipeSummary[]}
      favoriteIds={((favoritesResult.data ?? []) as { recipe_id: number }[]).map((r) => r.recipe_id)}
      swapLabels={swapLabels}
      unavailable={Boolean(entriesResult.error || recipesResult.error)}
    />
  );
}
