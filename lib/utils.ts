import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useCustodyStore } from "./custody-store";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PYG_RATE = 6.4233133;

export function toOriginalCurrency(pygAmount: number): number {
  let currency = "CLP";
  try {
    const getSetting = useCustodyStore.getState().getSetting;
    if (getSetting) {
      currency = getSetting("currency") || "CLP";
    }
  } catch (err) {}

  if (currency === "PYG") {
    return pygAmount;
  }
  return pygAmount / PYG_RATE;
}

export function formatCurrency(amount: number): string {
  let currency = "CLP";
  try {
    const getSetting = useCustodyStore.getState().getSetting;
    if (getSetting) {
      currency = getSetting("currency") || "CLP";
    }
  } catch (err) {
    // Fallback if store is not initialized
  }

  if (currency === "PYG") {
    // Guaraníes: round to nearest 10
    const rounded = Math.round(amount / 10) * 10;
    return `Gs. ${rounded.toLocaleString("es-PY")}`;
  } else {
    // Chilean Pesos: round to nearest integer
    const rounded = Math.round(amount);
    return `$${rounded.toLocaleString("es-CL")}`;
  }
}
