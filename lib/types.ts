export type LockerSize = 'S' | 'M' | 'L' | 'XL' | 'XXL'

export interface LockerSizeOption {
  value: LockerSize
  label: string
  price: number
}

export const LOCKER_SIZES: LockerSizeOption[] = [
  { value: 'S', label: 'S Bolso Pequeno', price: 1500 },
  { value: 'M', label: 'M Maleta Mediana', price: 2500 },
  { value: 'L', label: 'L Maleta Grande', price: 3500 },
  { value: 'XL', label: 'XL Equipaje Extra Grande', price: 4500 },
  { value: 'XXL', label: 'XXL Sacos / Fardos', price: 6000 },
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
}

export interface Locker {
  id: number
  row: number
  col: string
  isOccupied: boolean
  currentRecordId: number | null
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
  for (const row of LOCKER_ROWS) {
    for (const col of LOCKER_COLS) {
      lockers.push({
        row,
        col,
        isOccupied: false,
        currentRecordId: null,
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
