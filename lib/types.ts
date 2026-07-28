export type LockerSize = string;

export interface LockerSizeOption {
  value: LockerSize;
  label: string;
  price: number;
}

// Estos serán los tamaños iniciales si la DB está vacía, pero ahora son dinámicos
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

export interface ShelfConfig {
  id: string; // e.g. "A"
  sizes: {
    size: LockerSize; // e.g. "S", "Mini"
    count: number;    // e.g. 12
  }[];
}

export interface LayoutConfig {
  shelves: ShelfConfig[];
}

export const DEFAULT_LAYOUT: LayoutConfig = {
  shelves: [
    { id: "A", sizes: [{ size: "S", count: 12 }, { size: "M", count: 12 }, { size: "L", count: 12 }, { size: "XL", count: 12 }] },
    { id: "B", sizes: [{ size: "S", count: 12 }, { size: "M", count: 12 }, { size: "L", count: 12 }, { size: "XL", count: 12 }, { size: "XXL", count: 12 }] },
    { id: "C", sizes: [{ size: "S", count: 12 }, { size: "M", count: 12 }, { size: "L", count: 12 }, { size: "XL", count: 12 }] },
    { id: "D", sizes: [{ size: "S", count: 12 }, { size: "M", count: 12 }, { size: "L", count: 12 }, { size: "XL", count: 12 }] },
  ]
};

export function generateLockers(config: LayoutConfig = DEFAULT_LAYOUT): Omit<Locker, "id">[] {
  const lockers: Omit<Locker, "id">[] = [];

  for (const shelf of config.shelves) {
    for (const sizeConfig of shelf.sizes) {
      for (let i = 1; i <= sizeConfig.count; i++) {
        lockers.push({
          row: i,
          col: `${shelf.id}${sizeConfig.size}`,
          isOccupied: false,
          currentRecordId: null,
        });
      }
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
