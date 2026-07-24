import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PYG_RATE = 6.4233133;

export function toOriginalCurrency(pygAmount: number): number {
  return pygAmount / PYG_RATE;
}

export function formatCurrency(amount: number): string {
  // Conversión a Guaraníes Paraguayos (Gs. X.XXX) redondeado a la decena más cercana
  const converted = amount * PYG_RATE;
  const rounded = Math.round(converted / 10) * 10;
  return `Gs. ${rounded.toLocaleString("es-PY")}`;
}
