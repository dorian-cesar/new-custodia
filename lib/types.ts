export type LockerSize = 'S' | 'M' | 'L' | 'XL' | 'XXL'

export interface LockerSizeOption {
  value: LockerSize
  label: string
  price: number
}

export const LOCKER_SIZES: LockerSizeOption[] = [
  { value: 'S', label: 'S Bolso Pequeno', price: 2500 },
  { value: 'M', label: 'M Maleta Mediana', price: 3500 },
  { value: 'L', label: 'L Maleta Grande', price: 5000 },
  { value: 'XL', label: 'XL Equipaje Extra Grande', price: 6000 },
  { value: 'XXL', label: 'XXL Sacos / Fardos', price: 8000 },
]

export interface CustodyRecord {
  id: number
  code: string
  lockerId: number
  clientDocument: string
  entryTime: string
  exitTime: string | null
  size: LockerSize
  status: 'Activo' | 'Entregado'
  price: number
  folio?: number
  extraFolio?: number
}

export interface Locker {
  id: number
  row: number
  col: string
  isOccupied: boolean
  currentRecordId: number | null
  size: LockerSize
  area?: string
  label?: string
}

export interface CashRegister {
  id: number
  openedAt: string
  closedAt: string | null
  openingAmount: number
  closingAmount: number | null
  totalSales: number
  totalTransactions: number
  status: 'open' | 'closed'
  notes: string
  openedBy?: string
}

export interface CashTransaction {
  id: number
  registerId: number
  type: 'income' | 'expense'
  amount: number
  description: string
  timestamp: string
  recordId?: number
}

export const LOCKER_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
export const LOCKER_ROWS = [0, 1, 2, 3, 4, 5]

export function generateLockers(): Omit<Locker, 'id'>[] {
  const lockers: Omit<Locker, 'id'>[] = []
  
  const layout = [
    // Area A
    { area: 'A', size: 'S' as LockerSize, count: 10, prefix: 'AS' },
    { area: 'A', size: 'M' as LockerSize, count: 8, prefix: 'AM' },
    { area: 'A', size: 'L' as LockerSize, count: 8, prefix: 'AL' },

    // Area B
    { area: 'B', size: 'S' as LockerSize, count: 12, prefix: 'BS' },
    { area: 'B', size: 'M' as LockerSize, count: 6, prefix: 'BM' },
    { area: 'B', size: 'L' as LockerSize, count: 6, prefix: 'BL' },

    // Area C
    { area: 'C', size: 'S' as LockerSize, count: 12, prefix: 'CS' },
    { area: 'C', size: 'M' as LockerSize, count: 6, prefix: 'CM' },
    { area: 'C', size: 'L' as LockerSize, count: 6, prefix: 'CL' },

    // Area D
    { area: 'D', size: 'S' as LockerSize, count: 6, prefix: 'DS' },
    { area: 'D', size: 'M' as LockerSize, count: 4, prefix: 'DM' },
    { area: 'D', size: 'L' as LockerSize, count: 4, prefix: 'DL' },

    // Otros
    { area: 'Otros', size: 'S' as LockerSize, count: 60, prefix: 'ES' },
    { area: 'Otros', size: 'M' as LockerSize, count: 56, prefix: 'EM' },
    { area: 'Otros', size: 'L' as LockerSize, count: 26, prefix: 'EL' },
    { area: 'Otros', size: 'XL' as LockerSize, count: 10, prefix: 'EXL' },
    { area: 'Otros', size: 'XXL' as LockerSize, count: 10, prefix: 'EXXL' },
  ]

  const sizeCounters: Record<LockerSize, number> = {
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0
  }

  const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

  for (const group of layout) {
    for (let i = 1; i <= group.count; i++) {
      const idx = sizeCounters[group.size]
      sizeCounters[group.size]++

      const maxCols = (group.size === 'XL' || group.size === 'XXL') ? 5 : 10
      const row = Math.floor(idx / maxCols)
      const colIdx = idx % maxCols
      const col = alphabet[colIdx]

      lockers.push({
        row,
        col,
        isOccupied: false,
        currentRecordId: null,
        size: group.size,
        area: group.area,
        label: `${group.prefix}${i}`
      })
    }
  }
  
  return lockers
}

export function generateCode(document: string): string {
  const timestamp = Date.now().toString().slice(-6)
  return `${timestamp}/${document}`
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
