"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app#fridge", label: "My Fridge", emoji: "🧊", page: "/app" },
  { href: "/app#meal-finder", label: "Meal Finder", emoji: "🔎", page: "/app" },
  { href: "/app#study-mode", label: "Study Mode", emoji: "📚", page: "/app" },
  { href: "/app#favorites", label: "My Favorites", emoji: "❤️", page: "/app" },
  { href: "/app#kitchen", label: "My Kitchen", emoji: "🍳", page: "/app" },
  { href: "/app/plan", label: "My Weekly Meals", emoji: "🗓️", page: "/app/plan" },
  { href: "/app/grocery", label: "Grocery List", emoji: "🛒", page: "/app/grocery" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="BiteWise sections" className="-mx-4 overflow-x-auto px-4 print:hidden sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {LINKS.map((link) => {
          const current = link.page !== "/app" && pathname === link.page;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                  current
                    ? "border-sage-700 bg-sage-700 text-white"
                    : "border-line bg-white text-ink hover:border-sage-500 hover:text-sage-800"
                }`}
              >
                <span aria-hidden="true">{link.emoji}</span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
