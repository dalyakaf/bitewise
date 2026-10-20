"use client";

import { useMemo, useState } from "react";
import { catalogKeySet, fridgeKeySet } from "@/lib/matching";
import type { FridgeItem, Recipe } from "@/lib/types";
import { ComingSoon } from "./ComingSoon";
import { FridgePanel } from "./FridgePanel";
import { MealFinder } from "./MealFinder";

type Props = {
  initialItems: FridgeItem[];
  fridgeUnavailable: boolean;
  recipes: Recipe[];
  recipesUnavailable: boolean;
};

export function Dashboard({ initialItems, fridgeUnavailable, recipes, recipesUnavailable }: Props) {
  const [items, setItems] = useState<FridgeItem[]>(initialItems);
  const owned = useMemo(() => fridgeKeySet(items), [items]);
  const catalogKeys = useMemo(() => catalogKeySet(recipes), [recipes]);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
      <FridgePanel items={items} setItems={setItems} catalogKeys={catalogKeys} unavailable={fridgeUnavailable} />
      <MealFinder recipes={recipes} owned={owned} unavailable={recipesUnavailable} />
      <ComingSoon />
    </div>
  );
}
