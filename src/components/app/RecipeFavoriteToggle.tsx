"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FavoriteButton } from "./FavoriteButton";

type Props = { recipeId: number; title: string; initialActive: boolean };

export function RecipeFavoriteToggle({ recipeId, title, initialActive }: Props) {
  const [active, setActive] = useState(initialActive);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  async function toggle() {
    const on = !active;
    setPending(true);
    setMessage(null);
    setActive(on);
    const supabase = createClient();
    const { error } = on
      ? await supabase
          .from("favorite_recipes")
          .upsert({ recipe_id: recipeId }, { onConflict: "user_id,recipe_id", ignoreDuplicates: true })
      : await supabase.from("favorite_recipes").delete().eq("recipe_id", recipeId);
    setPending(false);
    if (error) {
      setActive(!on);
      setMessage({ error: true, text: `We couldn't ${on ? "save" : "remove"} this recipe. Please try again.` });
      return;
    }
    setMessage({ error: false, text: on ? "Saved to My Favorites." : "Removed from My Favorites." });
  }

  return (
    <div className="flex items-center gap-3">
      <FavoriteButton active={active} pending={pending} title={title} onToggle={toggle} size="lg" />
      <p
        role={message?.error ? "alert" : "status"}
        aria-live="polite"
        className={`text-sm font-medium ${message?.error ? "text-terracotta-600" : "text-sage-800"}`}
      >
        {pending ? (active ? "Saving…" : "Removing…") : (message?.text ?? (active ? "In My Favorites" : "Save to My Favorites"))}
      </p>
    </div>
  );
}
