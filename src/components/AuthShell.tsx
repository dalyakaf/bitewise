const plates = ["🥗", "🍝", "🍳", "🌮", "🍛", "🥞"];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 md:grid-cols-2 md:py-16">
      <div className="flex justify-center md:order-2">{children}</div>
      <div className="hidden md:block" aria-hidden="true">
        <p className="font-display text-4xl font-semibold leading-tight tracking-tight">
          Eat smart. Spend less. <span className="text-sage-700">Study more.</span>
        </p>
        <div className="mt-8 grid max-w-sm grid-cols-3 gap-4">
          {plates.map((plate, i) => (
            <div
              key={plate}
              className={`flex aspect-square items-center justify-center rounded-3xl text-4xl ${
                i % 2 === 0 ? "bg-sage-100" : "bg-terracotta-100"
              }`}
            >
              {plate}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
