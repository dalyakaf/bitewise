import Link from "next/link";
import { FEATURES, LANDING_FEATURE_IDS } from "@/lib/features";
import { createClient } from "@/lib/supabase/server";

const previewFridge = ["🥚 Eggs", "🍚 Rice", "🫛 Peas", "🧅 Spring onion", "🥫 Soy sauce"];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-terracotta-100 blur-2xl" />
      <div className="absolute -bottom-8 -right-4 h-36 w-36 rounded-full bg-sage-200 blur-2xl" />

      <div className="relative rounded-[2rem] border border-line bg-white p-5 shadow-xl shadow-sage-800/10">
        <p className="text-xs font-semibold uppercase tracking-widest text-sage-700">My Smart Fridge</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {previewFridge.map((item) => (
            <span key={item} className="rounded-full bg-sage-50 px-3 py-1.5 text-sm font-medium text-sage-800">
              {item}
            </span>
          ))}
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-line">
          <div className="flex h-28 items-center justify-center bg-gradient-to-br from-terracotta-100 via-cream to-sage-100 text-6xl">
            🍳
          </div>
          <div className="p-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-sage-700 px-2.5 py-1 text-xs font-semibold text-white">
              ✓ Cook Now
            </span>
            <p className="mt-2 font-display text-lg font-semibold">Egg Fried Rice</p>
            <p className="mt-1 text-sm text-ink-soft">15 min · €1–2 per serving</p>
          </div>
        </div>
      </div>

      <div className="absolute -right-3 top-24 rotate-6 rounded-2xl border border-line bg-white px-3 py-2 text-sm font-semibold shadow-lg shadow-terracotta-600/10">
        🥑 Almost there: +1
      </div>
      <div className="absolute -left-4 bottom-10 -rotate-6 rounded-2xl border border-line bg-white px-3 py-2 text-sm font-semibold shadow-lg shadow-sage-800/10">
        ⏱ Under 20 min
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const landingFeatures = LANDING_FEATURE_IDS.map((id) => FEATURES.find((f) => f.id === id)!);

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-2 md:pt-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-terracotta-50 px-3 py-1 text-sm font-semibold text-terracotta-600">
            For busy university students
          </p>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Your groceries. Your budget. <span className="text-sage-700">Your next meal.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            Discover affordable recipes from ingredients you already have, and plan meals around your busy university
            schedule.
          </p>

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {user ? (
              <Link
                href="/app"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-sage-700 px-8 text-base font-semibold text-white shadow-lg shadow-sage-800/20 transition hover:bg-sage-800"
              >
                Open my fridge
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-sage-700 px-8 text-base font-semibold text-white shadow-lg shadow-sage-800/20 transition hover:bg-sage-800"
                >
                  Sign up
                </Link>
                <p className="text-sm text-ink-soft">
                  Already a member?{" "}
                  <Link href="/login" className="font-semibold text-terracotta-600 underline underline-offset-4">
                    Log in
                  </Link>
                </p>
              </>
            )}
          </div>
          <p className="mt-4 text-sm text-ink-soft">Free · No credit card · Takes 30 seconds</p>
        </div>

        <HeroPreview />
      </section>

      <section aria-labelledby="how-it-works" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 id="how-it-works" className="font-display text-3xl font-semibold tracking-tight">
          Eat smart. Spend less. Study more.
        </h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          BiteWise helps university students turn everyday ingredients into quick, affordable meals and weekly plans that
          fit their demanding academic schedules.
        </p>

        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {landingFeatures.map((feature, index) => (
            <li key={feature.id} className="rounded-3xl border border-line bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-50 text-2xl" aria-hidden="true">
                  {feature.emoji}
                </span>
                {feature.status === "soon" ? (
                  <span className="rounded-full bg-terracotta-50 px-2.5 py-1 text-xs font-semibold text-terracotta-600">
                    Coming soon
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-ink-soft">Step {index + 1}</span>
                )}
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">{feature.name}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{feature.summary}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
