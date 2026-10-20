"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signup" | "login";

const COPY = {
  signup: {
    title: "Create your account",
    subtitle: "Start your smart fridge and find meals you can cook tonight.",
    submit: "Sign up",
    pending: "Creating account…",
    switchText: "Already have an account?",
    switchLink: "Log in",
    switchHref: "/login",
    passwordAutoComplete: "new-password",
    testIds: { email: "signup-email", password: "signup-password", submit: "signup-submit" },
  },
  login: {
    title: "Welcome back",
    subtitle: "Log in to see your fridge and today's meal ideas.",
    submit: "Log in",
    pending: "Logging in…",
    switchText: "New to BiteWise?",
    switchLink: "Sign up",
    switchHref: "/signup",
    passwordAutoComplete: "current-password",
    testIds: { email: "login-email", password: "login-password", submit: "login-submit" },
  },
} as const;

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

export function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const credentials = { email: email.trim(), password };

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp(credentials);
      if (signUpError) {
        setError(friendlyError(signUpError.message));
        setPending(false);
        return;
      }
      if (!data.session) {
        // Only happens if "Confirm email" is still enabled in the Supabase project.
        const { error: signInError } = await supabase.auth.signInWithPassword(credentials);
        if (signInError) {
          setError("Your account was created, but it needs email confirmation before you can log in.");
          setPending(false);
          return;
        }
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword(credentials);
      if (signInError) {
        setError(friendlyError(signInError.message));
        setPending(false);
        return;
      }
    }

    // Full navigation so the middleware and server components see the new session cookie.
    window.location.assign("/app");
  }

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-line bg-white p-6 shadow-xl shadow-sage-800/5 sm:p-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-2 text-ink-soft">{copy.subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor={`${mode}-email`} className="block text-sm font-semibold">
            Email
          </label>
          <input
            id={`${mode}-email`}
            data-testid={copy.testIds.email}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 block w-full rounded-xl border border-line bg-cream/40 px-4 py-3 text-base outline-none transition focus:border-sage-500 focus:bg-white focus:ring-4 focus:ring-sage-100"
            placeholder="you@university.edu"
          />
        </div>

        <div>
          <label htmlFor={`${mode}-password`} className="block text-sm font-semibold">
            Password
          </label>
          <input
            id={`${mode}-password`}
            data-testid={copy.testIds.password}
            type="password"
            name="password"
            autoComplete={copy.passwordAutoComplete}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={mode === "signup" ? "password-hint" : undefined}
            className="mt-1.5 block w-full rounded-xl border border-line bg-cream/40 px-4 py-3 text-base outline-none transition focus:border-sage-500 focus:bg-white focus:ring-4 focus:ring-sage-100"
          />
          {mode === "signup" && (
            <p id="password-hint" className="mt-1.5 text-sm text-ink-soft">
              At least 6 characters.
            </p>
          )}
        </div>

        <div aria-live="polite">
          {error && (
            <p role="alert" className="rounded-xl bg-terracotta-50 px-4 py-3 text-sm font-medium text-terracotta-600">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          data-testid={copy.testIds.submit}
          disabled={pending}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-sage-700 px-6 text-base font-semibold text-white transition hover:bg-sage-800 disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? copy.pending : copy.submit}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {copy.switchText}{" "}
        <Link href={copy.switchHref} className="font-semibold text-terracotta-600 underline underline-offset-4">
          {copy.switchLink}
        </Link>
      </p>
    </div>
  );
}
