"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await createClient().auth.signOut();
    // Full navigation so server components and middleware see the cleared session.
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      data-testid="logout"
      onClick={handleLogout}
      disabled={pending}
      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-sage-500 hover:text-sage-800 disabled:opacity-60"
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
