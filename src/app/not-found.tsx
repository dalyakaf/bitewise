import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl" aria-hidden="true">
        🍽️
      </p>
      <h1 className="mt-4 font-display text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-ink-soft">This plate is empty. Let&apos;s get you back to something tasty.</p>
      <Link href="/" className="mt-6 rounded-full bg-sage-700 px-6 py-3 font-semibold text-white hover:bg-sage-800">
        Go home
      </Link>
    </div>
  );
}
