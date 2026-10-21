import type { StudyEntry } from "@/lib/study-mode";
import type { Recipe } from "@/lib/types";
import { RecipeCard, type FavoriteControl } from "./RecipeCard";

type Props = {
  entries: StudyEntry[];
  applianceNames: Record<string, string>;
  kitchenConfigured: boolean;
  favoriteFor: (recipe: Recipe) => FavoriteControl | undefined;
  unavailable: boolean;
};

export function FavoritesPanel({ entries, applianceNames, kitchenConfigured, favoriteFor, unavailable }: Props) {
  return (
    <section id="favorites" aria-labelledby="favorites-heading" className="scroll-mt-24">
      <p className="text-sm font-semibold uppercase tracking-widest text-terracotta-600">❤️ My Favorites</p>
      <h2 id="favorites-heading" className="font-display text-3xl font-semibold tracking-tight">
        Recipes you love
      </h2>

      {unavailable ? (
        <p className="mt-4 rounded-2xl bg-white px-5 py-4 text-sm text-ink-soft">
          My Favorites isn&apos;t available right now. Everything else keeps working as usual.
        </p>
      ) : entries.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-line bg-white/60 px-6 py-10 text-center">
          <p className="text-3xl" aria-hidden="true">
            🤍
          </p>
          <p className="mt-2 font-semibold">No favorites yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Tap the heart on any recipe to save it here, so you can find it again in one tap.
          </p>
          <a
            href="#meal-finder"
            className="mt-4 inline-block rounded-full bg-sage-700 px-5 py-2 text-sm font-semibold text-white hover:bg-sage-800"
          >
            Browse recipes
          </a>
        </div>
      ) : (
        <>
          <p className="mt-1 text-ink-soft">
            {entries.length} saved recipe{entries.length === 1 ? "" : "s"}. Open one for the full instructions.
          </p>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Favorite recipes">
            {entries.map((entry) => (
              <RecipeCard
                key={entry.recipe.id}
                match={entry}
                equipment={entry.equipment}
                kitchenConfigured={kitchenConfigured}
                applianceNames={applianceNames}
                favorite={favoriteFor(entry.recipe)}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
