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
  entryPaymentMethod?: string;
  authCode?: string | null;
  opNumber?: string | null;
  cardNumber?: string | null;
  cardBrand?: string | null;
  cardType?: string | null;
  exitPaymentMethod?: string | null;
  exitAuthCode?: string | null;
  exitOpNumber?: string | null;
  exitCardNumber?: string | null;
  exitCardBrand?: string | null;
  exitCardType?: string | null;
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

  // Sectores A, B, C, D: 12 casilleros de cada tamaño S, M, L, XL
  const sectors = ["A", "B", "C", "D"];
  const sizes = ["S", "M", "L", "XL"];

  for (const sector of sectors) {
    for (const size of sizes) {
      for (let i = 1; i <= 12; i++) {
        lockers.push({
          row: i,
          col: `${sector}${size}`,
          isOccupied: false,
          currentRecordId: null,
        });
      }
    }
  }

  // Sector B también tiene 12 casilleros XXL (sacos / fardos)
  for (let i = 1; i <= 12; i++) {
    lockers.push({
      row: i,
      col: "BXXL",
      isOccupied: false,
      currentRecordId: null,
    });
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
