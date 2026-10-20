import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "./env";

function isProtectedPath(path: string) {
  return path === "/app" || path.startsWith("/app/");
}

function isAuthPath(path: string) {
  return path === "/login" || path === "/signup";
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Validates the session with Supabase Auth and refreshes expired tokens.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  let redirectTo: string | null = null;
  if (!user && isProtectedPath(path)) redirectTo = "/login";
  if (user && isAuthPath(path)) redirectTo = "/app";

  if (!redirectTo) return response;

  const url = request.nextUrl.clone();
  url.pathname = redirectTo;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
