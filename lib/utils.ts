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

import { DEFAULT_CURRENCIES, type CurrencyOption } from "./types";

export function formatCurrency(amount: number): string {
  let currencyCode = "CLP";
  let availableCurrencies: CurrencyOption[] = DEFAULT_CURRENCIES;

  try {
    const getSetting = useCustodyStore.getState().getSetting;
    if (getSetting) {
      currencyCode = getSetting("currency") || "CLP";
      const customCurrenciesStr = getSetting("available_currencies");
      if (customCurrenciesStr) {
        try {
          const parsed = JSON.parse(customCurrenciesStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            availableCurrencies = parsed;
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    // Fallback if store is not initialized
  }

  const activeCurrency = availableCurrencies.find((c) => c.code === currencyCode) ||
    DEFAULT_CURRENCIES.find((c) => c.code === currencyCode) || {
      code: currencyCode,
      name: currencyCode,
      symbol: "$",
    };

  const rounded = activeCurrency.code === "PYG" ? Math.round(amount / 10) * 10 : Math.round(amount);
  const formattedNumber = rounded.toLocaleString("es-CL");

  return `${activeCurrency.symbol} ${formattedNumber}`;
}
