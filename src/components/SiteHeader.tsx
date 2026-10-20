import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "./Logo";
import { LogoutButton } from "./LogoutButton";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={user ? "/app" : "/"} aria-label="BiteWise home" className="rounded-lg">
          <Logo />
        </Link>
        <nav aria-label="Account" className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link
                href="/app"
                className="hidden rounded-full px-3 py-2 text-sm font-semibold text-ink-soft hover:text-sage-800 sm:inline-block"
              >
                My Fridge
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-ink-soft hover:text-sage-800">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
