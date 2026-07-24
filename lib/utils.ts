import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  // Formato para Guaraníes Paraguayos (Gs. X.XXX)
  // Generalmente los Guaraníes no llevan decimales, redondeamos a entero.
  const rounded = Math.round(amount);
  return `Gs. ${rounded.toLocaleString("es-PY")}`;
}
