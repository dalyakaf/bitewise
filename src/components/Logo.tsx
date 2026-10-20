export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 64 64" className="h-8 w-8 shrink-0">
        <rect width="64" height="64" rx="16" fill="#44694b" />
        <path d="M20 44c0-14 9-24 26-26-1 17-11 26-24 26h-2z" fill="#fbf7f0" />
        <path d="M22 42c6-7 12-12 20-18" stroke="#d9805f" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
      <span className="font-display text-xl font-semibold tracking-tight text-ink">BiteWise</span>
    </span>
  );
}
