import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "BiteWise — Eat smart. Spend less. Study more.",
    template: "%s · BiteWise",
  },
  description:
    "BiteWise helps university students turn everyday ingredients into quick, affordable meals and weekly plans that fit their demanding academic schedules.",
};

export const viewport: Viewport = {
  themeColor: "#fbf7f0",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable}`}>
      <body className="min-h-screen font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <footer className="mt-16 border-t border-line/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-sm text-ink-soft sm:flex-row sm:justify-between sm:px-6">
            <p>© {new Date().getFullYear()} BiteWise · Eat smart. Spend less. Study more.</p>
            <p>Recipe costs are illustrative estimates, not live supermarket prices.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
