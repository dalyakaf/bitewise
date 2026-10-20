import { FEATURES } from "@/lib/features";

export function ComingSoon() {
  const upcoming = FEATURES.filter((f) => f.status === "soon");

  return (
    <section aria-labelledby="coming-soon-heading">
      <h2 id="coming-soon-heading" className="font-display text-2xl font-semibold tracking-tight">
        Coming soon to BiteWise
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {upcoming.map((feature) => (
          <li key={feature.id} className="rounded-3xl border border-line bg-cream-deep/50 p-5">
            <span aria-hidden="true" className="text-2xl">
              {feature.emoji}
            </span>
            <h3 className="mt-2 font-semibold">{feature.name}</h3>
            <p className="mt-1 text-sm text-ink-soft">{feature.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
