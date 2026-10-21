"use client";

type Props = {
  active: boolean;
  pending?: boolean;
  title: string;
  onToggle: () => void;
  size?: "sm" | "lg";
};

export function FavoriteButton({ active, pending = false, title, onToggle, size = "sm" }: Props) {
  const dimension = size === "lg" ? "h-12 w-12" : "h-10 w-10";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={active}
      aria-busy={pending}
      aria-label={active ? `Remove ${title} from My Favorites` : `Save ${title} to My Favorites`}
      title={active ? "Remove from My Favorites" : "Save to My Favorites"}
      className={`flex ${dimension} shrink-0 items-center justify-center rounded-full border bg-white/90 shadow-sm backdrop-blur transition hover:scale-105 disabled:cursor-wait disabled:opacity-60 ${
        active ? "border-terracotta-400 text-terracotta-600" : "border-line text-ink-soft hover:text-terracotta-600"
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={`${size === "lg" ? "h-6 w-6" : "h-5 w-5"} ${pending ? "animate-pulse" : ""}`}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.2 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 5.5 3.7 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
      </svg>
    </button>
  );
}
