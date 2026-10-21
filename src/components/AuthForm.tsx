"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logInAction, signUpAction, type AuthState } from "@/app/auth-actions";

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

const INITIAL_STATE: AuthState = { error: null, email: "" };

export function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  // Server Action: the form POSTs to the server even before hydration, so
  // credentials never end up in a URL. On success the action redirects to /app.
  const [state, formAction, pending] = useActionState(mode === "signup" ? signUpAction : logInAction, INITIAL_STATE);

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-line bg-white p-6 shadow-xl shadow-sage-800/5 sm:p-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-2 text-ink-soft">{copy.subtitle}</p>

      <form action={formAction} className="mt-6 space-y-4">
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
            defaultValue={state.email}
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
          {state.error && (
            <p role="alert" className="rounded-xl bg-terracotta-50 px-4 py-3 text-sm font-medium text-terracotta-600">
              {state.error}
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
