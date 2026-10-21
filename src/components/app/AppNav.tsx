const LINKS = [
  { href: "#fridge", label: "My Fridge", emoji: "🧊" },
  { href: "#meal-finder", label: "Meal Finder", emoji: "🔎" },
  { href: "#study-mode", label: "Study Mode", emoji: "📚" },
  { href: "#favorites", label: "My Favorites", emoji: "❤️" },
  { href: "#kitchen", label: "My Kitchen", emoji: "🍳" },
];

export function AppNav() {
  return (
    <nav aria-label="BiteWise sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {LINKS.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink transition hover:border-sage-500 hover:text-sage-800"
            >
              <span aria-hidden="true">{link.emoji}</span>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
