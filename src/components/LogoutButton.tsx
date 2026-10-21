"use client";

import { useFormStatus } from "react-dom";
import { logOutAction } from "@/app/auth-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      data-testid="logout"
      disabled={pending}
      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-sage-500 hover:text-sage-800 disabled:opacity-60"
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}

// A form with a Server Action, so logging out also works before JavaScript loads.
export function LogoutButton() {
  return (
    <form action={logOutAction}>
      <SubmitButton />
    </form>
  );
}
