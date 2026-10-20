"use client";

import { useMemo, useState } from "react";
import { buildCatalogIndex, fridgeKeySet } from "@/lib/matching";
import type { Appliance, CatalogIngredient, FridgeItem, Recipe } from "@/lib/types";
import { ComingSoon } from "./ComingSoon";
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
};

export function Dashboard({
  initialItems,
  fridgeUnavailable,
  recipes,
  recipesUnavailable,
  catalog,
  appliances,
  initialOwnedAppliances,
  kitchenUnavailable,
}: Props) {
  const [items, setItems] = useState<FridgeItem[]>(initialItems);
  const [ownedAppliances, setOwnedAppliances] = useState<Set<string>>(() => new Set(initialOwnedAppliances));
  const owned = useMemo(() => fridgeKeySet(items), [items]);
  const catalogIndex = useMemo(() => buildCatalogIndex(catalog, recipes), [catalog, recipes]);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
      <FridgePanel
        items={items}
        setItems={setItems}
        catalog={catalog}
        catalogIndex={catalogIndex}
        unavailable={fridgeUnavailable}
      />
      <KitchenPanel
        appliances={appliances}
        owned={ownedAppliances}
        setOwned={setOwnedAppliances}
        unavailable={kitchenUnavailable}
      />
      <MealFinder
        recipes={recipes}
        owned={owned}
        appliances={appliances}
        ownedAppliances={ownedAppliances}
        unavailable={recipesUnavailable}
      />
      <ComingSoon />
    </div>
  );
}
