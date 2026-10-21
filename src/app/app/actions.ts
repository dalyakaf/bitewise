"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FRIDGE_ITEM_COLUMNS, type FridgeItem } from "@/lib/types";

const MAX_LENGTH = 120;

export type AddFridgeItemState = {
  status: "idle" | "saved" | "error";
  error: string | null;
  item: FridgeItem | null;
  /** What was submitted, so the field can be refilled after an error. */
  submitted: string;
};

/**
 * Saves exactly what was typed (only whitespace-only input is refused).
 * Works with or without client-side JavaScript: before hydration the browser
 * POSTs the form and is redirected back to /app (no resubmission on refresh).
 */
export async function addFridgeItemAction(_prev: AddFridgeItemState, formData: FormData): Promise<AddFridgeItemState> {
  const raw = formData.get("ingredient");
  const name = typeof raw === "string" ? raw : "";
  if (!name.trim()) return { status: "error", error: "Type an ingredient first, for example “eggs”.", item: null, submitted: name };
  if (name.length > MAX_LENGTH) {
    return { status: "error", error: `Please keep it under ${MAX_LENGTH} characters.`, item: null, submitted: name };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.from("fridge_items").insert({ name }).select(FRIDGE_ITEM_COLUMNS).single();
  if (error || !data) {
    return {
      status: "error",
      error: "We couldn't save that ingredient. Please check your connection and try again.",
      item: null,
      submitted: name,
    };
  }

  // A plain form POST (page not yet interactive) has no Next-Action header:
  // redirect so the refreshed page shows the item and a reload can't re-submit.
  if (!(await headers()).has("next-action")) redirect("/app");

  return { status: "saved", error: null, item: data as FridgeItem, submitted: name };
}
