// ─────────────────────────────────────────────
// Configuración regional – Paraguay
// Para cambiar de país, editar solo este archivo
// ─────────────────────────────────────────────

export const COUNTRY_CONFIG = {
  // Moneda
  currencySymbol: 'Gs.',
  locale: 'es-PY',

  // Documento de identidad
  documentLabel: 'Cédula / RUC',
  documentPlaceholder: 'Ej: 1234567 o 80012345-1',

  // Redondeo (Paraguay no tiene ley de redondeo; devuelve el valor exacto)
  roundAmount: (amount: number): number => Math.round(amount),

  // País
  country: 'Paraguay',
}

/**
 * Formatea un número como moneda local.
 * Ejemplo: 25000 → "Gs. 25.000"
 */
export function formatCurrency(amount: number): string {
  return `${COUNTRY_CONFIG.currencySymbol} ${amount.toLocaleString(COUNTRY_CONFIG.locale)}`
}
