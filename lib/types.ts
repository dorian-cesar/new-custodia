export type LockerSize = "S" | "M" | "L" | "XL" | "XXL";

export interface LockerSizeOption {
  value: LockerSize;
  label: string;
  price: number;
}

export const LOCKER_SIZES: LockerSizeOption[] = [
  { value: "S", label: "S Bolso Pequeno", price: 2500 },
  { value: "M", label: "M Maleta Mediana", price: 3500 },
  { value: "L", label: "L Maleta Grande", price: 5000 },
  { value: "XL", label: "XL Equipaje Extra Grande", price: 6000 },
  { value: "XXL", label: "XXL Sacos / Fardos", price: 8000 },
];

export interface CustodyRecord {
  id: number;
  code: string;
  lockerId: number;
  clientDocument: string;
  entryTime: string;
  exitTime: string | null;
  size: LockerSize;
  status: "Activo" | "Entregado";
  price: number;
  folio?: number;
  extraFolio?: number;
}

export interface Locker {
  id: number;
  row: number;
  col: string;
  isOccupied: boolean;
  currentRecordId: number | null;
}

export interface CashRegister {
  id: number;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  closingAmount: number | null;
  totalSales: number;
  totalTransactions: number;
  status: "open" | "closed";
  notes: string;
  openedBy?: string;
}

export interface CashTransaction {
  id: number;
  registerId: number;
  type: "income" | "expense";
  amount: number;
  description: string;
  timestamp: string;
  recordId?: number;
}

export const LOCKER_COLS: string[] = [];
export const LOCKER_ROWS: number[] = [];

export function generateLockers(): Omit<Locker, "id">[] {
  const lockers: Omit<Locker, "id">[] = [];

  const config = [
    { sector: "A", S: 10, M: 8, L: 8 },
    { sector: "B", S: 12, M: 6, L: 6 },
    { sector: "C", S: 12, M: 6, L: 6 },
    { sector: "D", S: 6, M: 4, L: 4 },
  ];

  for (const item of config) {
    // S size
    for (let i = 1; i <= item.S; i++) {
      lockers.push({
        row: i,
        col: `${item.sector}S`,
        isOccupied: false,
        currentRecordId: null,
      });
    }
    // M size
    for (let i = 1; i <= item.M; i++) {
      lockers.push({
        row: i,
        col: `${item.sector}M`,
        isOccupied: false,
        currentRecordId: null,
      });
    }
    // L size
    for (let i = 1; i <= item.L; i++) {
      lockers.push({
        row: i,
        col: `${item.sector}L`,
        isOccupied: false,
        currentRecordId: null,
      });
    }
  }

  return lockers;
}

export function generateCode(document: string): string {
  const timestamp = Date.now().toString().slice(-6);
  return `${timestamp}/${document}`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
