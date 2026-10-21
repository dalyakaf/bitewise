"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server Actions: these forms work (via POST) even before the page's JavaScript
// has loaded, so credentials are never sent in a URL.

export type AuthState = { error: string | null; email: string };

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Please try again.";
  if (m.includes("already registered") || m.includes("already exists")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (m.includes("password")) return message;
  if (m.includes("email")) return "Please enter a valid email address.";
  return "Something went wrong. Please try again in a moment.";
}

function readCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  return {
    email: typeof email === "string" ? email.trim() : "",
    password: typeof password === "string" ? password : "",
  };
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Please enter your email and a password.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: friendlyError(error.message), email };
  if (!data.session) {
    // Only happens if "Confirm email" is enabled in the Supabase project.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      return { error: "Your account was created, but it needs email confirmation before you can log in.", email };
    }
  }

  revalidatePath("/", "layout");
  redirect("/app");
}

export async function logInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Please enter your email and password.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendlyError(error.message), email };

  revalidatePath("/", "layout");
  redirect("/app");
}

export async function logOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
