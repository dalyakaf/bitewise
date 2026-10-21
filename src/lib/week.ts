// Calendar helpers working on ISO dates ("YYYY-MM-DD") so there are no
// timezone surprises between the server (UTC) and students in Madrid.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toUtc(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(toUtc(value).getTime());
}

export function todayIso(timeZone = "Europe/Madrid") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(iso: string, days: number) {
  const date = toUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

/** Monday of the ISO week containing `iso`. */
export function mondayOf(iso: string) {
  const day = toUtc(iso).getUTCDay(); // 0 = Sunday
  return addDays(iso, day === 0 ? -6 : 1 - day);
}

/** Validates a ?week= search param, falling back to the current week. */
export function weekFromParam(param: string | string[] | undefined) {
  const value = Array.isArray(param) ? param[0] : param;
  return mondayOf(isIsoDate(value) ? value : todayIso());
}

export function weekDays(monday: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type DayFormat = { weekday?: "short" | "long"; day?: "numeric"; month?: "short" | "long"; year?: "numeric" };

/**
 * Deterministic English date labels, e.g. "Mon 19 Oct" or "Monday 19 October 2026".
 * (Not toLocaleDateString: its output can differ between server and browser,
 * which breaks React hydration.)
 */
export function formatDay(iso: string, options: DayFormat = { weekday: "short", day: "numeric", month: "short" }) {
  const date = toUtc(iso);
  const parts: string[] = [];
  if (options.weekday) {
    const name = WEEKDAYS[date.getUTCDay()];
    parts.push(options.weekday === "short" ? name.slice(0, 3) : name);
  }
  if (options.day) parts.push(String(date.getUTCDate()));
  if (options.month) {
    const name = MONTHS[date.getUTCMonth()];
    parts.push(options.month === "short" ? name.slice(0, 3) : name);
  }
  if (options.year) parts.push(String(date.getUTCFullYear()));
  return parts.join(" ");
}

export function formatWeekRange(monday: string) {
  const sunday = addDays(monday, 6);
  const sameYear = monday.slice(0, 4) === sunday.slice(0, 4);
  const start = formatDay(monday, { weekday: "short", day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
  const end = formatDay(sunday, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return `${start} – ${end}`;
}
