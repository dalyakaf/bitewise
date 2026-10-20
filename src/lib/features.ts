/**
 * Feature registry. Stage 1 ships the fridge and meal finder; the rest are
 * placeholders so the navigation, landing page and dashboard can grow without
 * restructuring. Flip `status` to "live" and add an `href` when a feature ships.
 */
export type FeatureStatus = "live" | "soon";

export type Feature = {
  id: "smart-fridge" | "meal-finder" | "weekly-meals" | "study-mode" | "favorites" | "grocery-list";
  name: string;
  emoji: string;
  summary: string;
  status: FeatureStatus;
  href?: string;
};

export const FEATURES: Feature[] = [
  {
    id: "smart-fridge",
    name: "My Smart Fridge",
    emoji: "🧊",
    summary: "Keep a private list of what is in your fridge and cupboards, so you always know what you can cook.",
    status: "live",
    href: "/app#fridge",
  },
  {
    id: "meal-finder",
    name: "Smart Meal Finder",
    emoji: "🔎",
    summary: "See budget recipes you can cook right now, or that are only one or two ingredients away.",
    status: "live",
    href: "/app#meal-finder",
  },
  {
    id: "weekly-meals",
    name: "My Weekly Meals",
    emoji: "🗓️",
    summary: "Plan the week around your timetable, with quick meals on busy days and batch cooking on free ones.",
    status: "soon",
  },
  {
    id: "study-mode",
    name: "Study Mode",
    emoji: "📚",
    summary: "Exam week? Get 10-minute, brain-fuel meals and minimal washing up.",
    status: "soon",
  },
  {
    id: "favorites",
    name: "Favorites",
    emoji: "❤️",
    summary: "Save the recipes you love and find them again in one tap.",
    status: "soon",
  },
  {
    id: "grocery-list",
    name: "Smart Grocery List",
    emoji: "🛒",
    summary: "Turn missing ingredients into a shopping list that fits your budget.",
    status: "soon",
  },
];

export const LANDING_FEATURE_IDS: Feature["id"][] = ["smart-fridge", "meal-finder", "weekly-meals"];
