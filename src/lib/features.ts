/**
 * Feature registry. Live features link into /app; "soon" ones are
 * placeholders so the navigation, landing page and dashboard can grow without
 * restructuring. Flip `status` to "live" and add an `href` when a feature ships.
 */
export type FeatureStatus = "live" | "soon";

export type Feature = {
  id: "smart-fridge" | "meal-finder" | "my-kitchen" | "weekly-meals" | "study-mode" | "favorites" | "grocery-list";
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
    summary: "Browse 120+ student recipes and see what you can cook right now, or what is only one or two ingredients away.",
    status: "live",
    href: "/app#meal-finder",
  },
  {
    id: "my-kitchen",
    name: "My Kitchen",
    emoji: "🍳",
    summary: "Tell us which appliances you have (air fryer, microwave, oven…) and only see recipes your kitchen can make.",
    status: "live",
    href: "/app#kitchen",
  },
  {
    id: "weekly-meals",
    name: "My Weekly Meals",
    emoji: "🗓️",
    summary: "Plan breakfast, lunch and dinner for the week around your timetable, then get a shopping list that builds itself.",
    status: "live",
    href: "/app/plan",
  },
  {
    id: "study-mode",
    name: "Study Mode",
    emoji: "📚",
    summary: "Short on time or money? Pick your minutes and budget and get the most practical meals first.",
    status: "live",
    href: "/app#study-mode",
  },
  {
    id: "favorites",
    name: "Favorites",
    emoji: "❤️",
    summary: "Save the recipes you love and find them again in one tap.",
    status: "live",
    href: "/app#favorites",
  },
  {
    id: "grocery-list",
    name: "Smart Grocery List",
    emoji: "🛒",
    summary: "Your week's meals turned into one combined shopping list, with what's already in your fridge marked.",
    status: "live",
    href: "/app/grocery",
  },
];

export const LANDING_FEATURE_IDS: Feature["id"][] = ["smart-fridge", "meal-finder", "weekly-meals"];
