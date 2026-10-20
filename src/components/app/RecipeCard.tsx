import Link from "next/link";
import { formatEuro, type RecipeMatch } from "@/lib/matching";

const BADGES = {
  "cook-now": { label: "✓ Cook Now", className: "bg-sage-700 text-white" },
  almost: { label: "Almost There", className: "bg-terracotta-600 text-white" },
  browse: { label: "", className: "" },
} as const;

export function RecipeCard({ match }: { match: RecipeMatch }) {
  const { recipe, status, have, missing } = match;
  const badge = BADGES[status];
  const required = have.length + missing.length;

  return (
    <li>
      <Link
        href={`/app/recipes/${recipe.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sage-800/10"
      >
        <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-terracotta-50 via-cream to-sage-100 text-6xl">
          <span aria-hidden="true" className="transition group-hover:scale-110">
            {recipe.emoji}
          </span>
          {badge.label && (
            <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-lg font-semibold leading-snug">{recipe.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{recipe.description}</p>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-ink">
            <span>⏱ {recipe.total_minutes} min</span>
            <span>💶 ~{formatEuro(recipe.estimated_cost_per_serving_eur)}/serving</span>
          </p>
          <div className="mt-auto pt-4 text-sm">
            {status === "cook-now" && <p className="font-medium text-sage-800">You have everything you need.</p>}
            {status === "almost" && (
              <p className="text-terracotta-600">
                <span className="font-semibold">Missing:</span> {missing.map((m) => m.ingredient.name).join(", ")}
              </p>
            )}
            {status === "browse" && (
              <p className="text-ink-soft">
                You have {have.length} of {required} ingredients
              </p>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
