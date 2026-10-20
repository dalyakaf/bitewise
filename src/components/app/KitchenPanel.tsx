"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Appliance } from "@/lib/types";

type Props = {
  appliances: Appliance[];
  owned: Set<string>;
  setOwned: Dispatch<SetStateAction<Set<string>>>;
  unavailable: boolean;
};

function withToggled(set: Set<string>, id: string, on: boolean) {
  const next = new Set(set);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

export function KitchenPanel({ appliances, owned, setOwned, unavailable }: Props) {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function toggle(appliance: Appliance) {
    const on = !owned.has(appliance.id);
    setError(null);
    setOwned((prev) => withToggled(prev, appliance.id, on));
    setPending((prev) => withToggled(prev, appliance.id, true));

    const supabase = createClient();
    const { error: saveError } = on
      ? await supabase.from("user_appliances").upsert({ appliance_id: appliance.id }, { onConflict: "user_id,appliance_id" })
      : await supabase.from("user_appliances").delete().eq("appliance_id", appliance.id);

    setPending((prev) => withToggled(prev, appliance.id, false));
    if (saveError) {
      setOwned((prev) => withToggled(prev, appliance.id, !on));
      setError(`We couldn't update ${appliance.name}. Please try again.`);
      return;
    }
    setStatus(`${appliance.name} ${on ? "added to" : "removed from"} your kitchen.`);
  }

  return (
    <section id="kitchen" aria-labelledby="kitchen-heading" className="scroll-mt-24">
      <div className="rounded-[2rem] border border-line bg-cream-deep/40 p-5 sm:p-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-sage-700">🍳 My Kitchen</p>
            <h2 id="kitchen-heading" className="font-display text-2xl font-semibold tracking-tight">
              What can you cook with?
            </h2>
            <p className="text-ink-soft">
              Optional. Tap the appliances you have and we&apos;ll show recipes your kitchen can handle.
            </p>
          </div>
          {owned.size > 0 && (
            <p className="text-sm font-medium text-sage-800">
              {owned.size} appliance{owned.size === 1 ? "" : "s"} saved
            </p>
          )}
        </div>

        {unavailable || appliances.length === 0 ? (
          <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-ink-soft">
            My Kitchen isn&apos;t available right now. Your fridge and recipes still work as usual.
          </p>
        ) : (
          <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Kitchen appliances">
            {appliances.map((appliance) => {
              const selected = owned.has(appliance.id);
              return (
                <li key={appliance.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    disabled={pending.has(appliance.id)}
                    onClick={() => toggle(appliance)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition disabled:opacity-70 ${
                      selected
                        ? "border-sage-500 bg-sage-700 text-white shadow-sm"
                        : "border-line bg-white text-ink hover:border-sage-500"
                    }`}
                  >
                    <span aria-hidden="true" className="text-xl">
                      {appliance.emoji}
                    </span>
                    <span className="flex-1">{appliance.name}</span>
                    <span aria-hidden="true">{selected ? "✓" : "+"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div aria-live="polite" className="mt-3 min-h-5 text-sm">
          {error ? (
            <p role="alert" className="font-medium text-terracotta-600">
              {error}
            </p>
          ) : (
            <p className="sr-only">{status}</p>
          )}
        </div>
      </div>
    </section>
  );
}
