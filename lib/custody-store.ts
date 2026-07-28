"use client";

import { create } from "zustand";
import {
  type Locker,
  type CustodyRecord,
  type CashRegister,
  type CashTransaction,
  type LockerSize,
  generateLockers,
  generateCode,
  LOCKER_SIZES,
  type LockerSizeOption,
  type LayoutConfig,
  DEFAULT_LAYOUT,
} from "./types";

import {
  dbOccupyLocker,
  dbReleaseLocker,
  dbCreateRecord,
  dbDeliverRecord,
  dbOpenCashRegister,
  dbCloseCashRegister,
  dbAddTransaction,
  sendBoleta,
  dbUpdateSetting,
} from "@/app/actions/db-actions";

export interface User {
  id: number;
  username: string;
  email?: string;
  role: "cajero" | "supervisor";
  token?: string;
}

interface CustodyState {
  lockers: Locker[];
  records: CustodyRecord[];
  cashRegisters: CashRegister[];
  cashTransactions: CashTransaction[];
  currentCashRegister: CashRegister | null;
  currentUser: User | null;
  lockerSizes: LockerSizeOption[];
  layoutConfig: LayoutConfig;
  settings: { key: string; value: string }[];
  getSetting: (key: string) => string;
  updateSetting: (key: string, value: string) => Promise<void>;

  // Hydration
  hydrateState: (state: {
    lockers: Locker[];
    records: CustodyRecord[];
    cashRegisters: CashRegister[];
    cashTransactions: CashTransaction[];
    lockerSizes?: LockerSizeOption[];
    layoutConfig?: LayoutConfig;
    settings?: { key: string; value: string }[];
  }) => void;
  setLockerSizes: (sizes: LockerSizeOption[]) => void;
  setLayoutConfig: (config: LayoutConfig) => void;

  // Auth actions
  login: (user: User) => void;
  logout: () => void;

  // Locker actions
  occupyLocker: (lockerId: number, recordId: number) => Promise<void>;
  releaseLocker: (lockerId: number) => Promise<void>;

  // Record actions
  getRecordByCode: (code: string) => CustodyRecord | null;
  getActiveRecordsByInput: (input: string) => CustodyRecord[];
  createRecord: (
    lockerId: number,
    clientDocument: string,
    size: LockerSize,
    paymentMethod?: string,
    authCode?: string | null,
    opNumber?: string | null,
    cardNumber?: string | null,
    cardBrand?: string | null,
    cardType?: string | null,
  ) => Promise<CustodyRecord | null>;
  createMultipleRecords: (
    items: { lockerId: number; size: LockerSize }[],
    clientDocument: string,
    paymentMethod?: string,
    authCode?: string | null,
    opNumber?: string | null,
    cardNumber?: string | null,
    cardBrand?: string | null,
    cardType?: string | null,
  ) => Promise<CustodyRecord[] | null>;
  deliverRecord: (
    recordId: number,
    extraCharge?: number,
    paymentMethod?: string,
    extraFolio?: number | null,
    authCode?: string | null,
    opNumber?: string | null,
    cardNumber?: string | null,
    cardBrand?: string | null,
    cardType?: string | null,
  ) => Promise<boolean>;
  deliverMultipleRecords: (
    recordIds: number[],
    extraCharge?: number,
    paymentMethod?: string,
    extraFolio?: number | null,
    authCode?: string | null,
    opNumber?: string | null,
    cardNumber?: string | null,
    cardBrand?: string | null,
    cardType?: string | null,
  ) => Promise<boolean>;

  // Cash register actions
  openCashRegister: (
    openingAmount: number,
    notes?: string,
  ) => Promise<CashRegister>;
  closeCashRegister: (
    closingAmount: number,
    notes?: string,
  ) => Promise<CashRegister | null>;
  addTransaction: (
    type: "income" | "expense",
    amount: number,
    description: string,
    recordId?: number,
  ) => Promise<void>;
  getCurrentRegisterStats: () => {
    totalSales: number;
    totalTransactions: number;
    balance: number;
    ingresosEfectivo: number;
    ingresosTarjeta: number;
  };
}

export const useCustodyStore = create<CustodyState>()((set, get) => ({
  lockers: [],
  records: [],
  cashRegisters: [],
  cashTransactions: [],
  currentCashRegister: null,
  currentUser: null,
  lockerSizes: LOCKER_SIZES,
  layoutConfig: DEFAULT_LAYOUT,
  settings: [],

  getSetting: (key) => {
    const s = get().settings.find((item) => item.key === key);
    return s ? s.value : "";
  },

  updateSetting: async (key, value) => {
    await dbUpdateSetting(key, value);
    set((state) => {
      const exists = state.settings.some((s) => s.key === key);
      if (exists) {
        return {
          settings: state.settings.map((s) => (s.key === key ? { ...s, value } : s)),
        };
      } else {
        return {
          settings: [...state.settings, { key, value }],
        };
      }
    });
  },

  login: (user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("currentUser", JSON.stringify(user));
    }
    set({ currentUser: user });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("currentUser");
    }
    set({ currentUser: null });
  },

  hydrateState: (dbState) => {
    set({
      lockers: dbState.lockers,
      records: dbState.records,
      cashRegisters: dbState.cashRegisters,
      cashTransactions: dbState.cashTransactions,
      lockerSizes: dbState.lockerSizes || get().lockerSizes,
      layoutConfig: dbState.layoutConfig || get().layoutConfig,
      settings: dbState.settings || get().settings,
      currentCashRegister:
        dbState.cashRegisters.find((r) => r.status === "open") || null,
    });
  },

  setLockerSizes: (sizes) => set({ lockerSizes: sizes }),
  setLayoutConfig: (config) => set({ layoutConfig: config }),

  occupyLocker: async (lockerId, recordId) => {
    // Sync to DB
    await dbOccupyLocker(lockerId, recordId);

    set((state) => ({
      lockers: state.lockers.map((l) =>
        l.id === lockerId
          ? { ...l, isOccupied: true, currentRecordId: recordId }
          : l,
      ),
    }));
  },

  releaseLocker: async (lockerId) => {
    // Sync to DB
    await dbReleaseLocker(lockerId);

    set((state) => ({
      lockers: state.lockers.map((l) =>
        l.id === lockerId
          ? { ...l, isOccupied: false, currentRecordId: null }
          : l,
      ),
    }));
  },

  createRecord: async (
    lockerId,
    clientDocument,
    size,
    paymentMethod = "Efectivo",
    authCode = null,
    opNumber = null,
    cardNumber = null,
    cardBrand = null,
    cardType = null,
  ) => {
    const { currentCashRegister, lockers, currentUser } = get();

    if (!currentCashRegister || currentCashRegister.status !== "open") {
      return null;
    }

    const locker = lockers.find((l) => l.id === lockerId);
    if (!locker || locker.isOccupied) {
      return null;
    }

    const sizeOption = get().lockerSizes.find((s) => s.value === size);
    if (!sizeOption) return null;

    let folio: number | null = null;

    if (paymentMethod === "Efectivo") {
      try {
        const boletaRes = await sendBoleta(sizeOption.label, sizeOption.price);
        if (boletaRes.success && boletaRes.data) {
          folio = boletaRes.data.folio;
        }
      } catch (err) {
        console.error("Error al emitir boleta en la entrada:", err);
      }
    }

    const code = generateCode(clientDocument);

    const recordData: Omit<CustodyRecord, "id"> = {
      code,
      lockerId,
      clientDocument,
      entryTime: new Date().toISOString(),
      exitTime: null,
      size,
      status: "Activo",
      price: sizeOption.price,
      folio: folio || undefined,
      entryPaymentMethod: paymentMethod,
      authCode,
      opNumber,
      cardNumber,
      cardBrand,
      cardType,
    };

    // Sync record creation to DB to get ID
    const newRecord = await dbCreateRecord(recordData);

    set((state) => ({
      records: [newRecord, ...state.records],
    }));

    await get().occupyLocker(lockerId, newRecord.id);
    await get().addTransaction(
      "income",
      sizeOption.price,
      `Custodia ${code} - ${sizeOption.label} - ${paymentMethod}${authCode ? ` - Auth: ${authCode}` : ""}${opNumber ? ` - Op: ${opNumber}` : ""}${folio ? ` - Folio: ${folio}` : ""}`,
      newRecord.id,
    );

    return newRecord;
  },

  createMultipleRecords: async (
    items,
    clientDocument,
    paymentMethod = "Efectivo",
    authCode = null,
    opNumber = null,
    cardNumber = null,
    cardBrand = null,
    cardType = null,
  ) => {
    const { currentCashRegister, lockers, lockerSizes } = get();

    if (!currentCashRegister || currentCashRegister.status !== "open") {
      return null;
    }

    // Calcular precio total y validar casilleros
    let totalPrice = 0;
    const validatedItems = [];

    for (const item of items) {
      const locker = lockers.find((l) => l.id === item.lockerId);
      if (!locker || locker.isOccupied) {
        continue;
      }
      const sizeOption = lockerSizes.find((s) => s.value === item.size);
      if (!sizeOption) continue;
      
      totalPrice += sizeOption.price;
      validatedItems.push({ item, sizeOption });
    }

    if (validatedItems.length === 0) return null;

    let folio: number | null = null;

    if (paymentMethod === "Efectivo") {
      try {
        const boletaRes = await sendBoleta("Servicios de Custodia", totalPrice);
        if (boletaRes.success && boletaRes.data) {
          folio = boletaRes.data.folio;
        }
      } catch (err) {
        console.error("Error al emitir boleta en la entrada múltiple:", err);
      }
    }

    const createdRecords: CustodyRecord[] = [];

    for (const { item, sizeOption } of validatedItems) {
      const code = generateCode(clientDocument);

      const recordData: Omit<CustodyRecord, "id"> = {
        code,
        lockerId: item.lockerId,
        clientDocument,
        entryTime: new Date().toISOString(),
        exitTime: null,
        size: item.size,
        status: "Activo",
        price: sizeOption.price,
        folio: folio || undefined,
        entryPaymentMethod: paymentMethod,
        authCode,
        opNumber,
        cardNumber,
        cardBrand,
        cardType,
      };

      // Sync record creation to DB
      const newRecord = await dbCreateRecord(recordData);
      createdRecords.push(newRecord);

      // Local state update
      set((state) => ({
        records: [newRecord, ...state.records],
      }));
      await get().occupyLocker(item.lockerId, newRecord.id);
    }

    // Agregar una única transacción de ingreso de caja para la venta total
    const lockerNames = validatedItems.map(
      ({ item }) => {
        const l = lockers.find((lock) => lock.id === item.lockerId);
        const lName = l ? `${l.col}${l.row}` : item.lockerId;
        return `${lName}(${item.size})`;
      }
    ).join(", ");

    await get().addTransaction(
      "income",
      totalPrice,
      `Custodia Múltiple [${lockerNames}] - ${paymentMethod}${authCode ? ` - Auth: ${authCode}` : ""}${opNumber ? ` - Op: ${opNumber}` : ""}${folio ? ` - Folio: ${folio}` : ""}`,
      createdRecords[0]?.id
    );

    return createdRecords;
  },

  getRecordByCode: (code) => {
    const { records } = get();
    // 1. Buscar por código exacto de barras
    const byCode = records.find(
      (r) => r.code === code && r.status === "Activo",
    );
    if (byCode) return byCode;
    // 2. Buscar por documento del cliente (RUT/DNI/Pasaporte) — FIFO: el más antiguo primero
    const byDocument = records.filter(
      (r) => r.clientDocument === code && r.status === "Activo",
    );
    return byDocument.length > 0 ? byDocument[byDocument.length - 1] : null;
  },

  getActiveRecordsByInput: (input) => {
    const { records } = get();
    // Si es un código exacto de barras o la primera parte del código (ej: 225386)
    const byCode = records.filter(
      (r) =>
        (r.code === input || r.code.startsWith(`${input}/`)) &&
        r.status === "Activo",
    );
    if (byCode.length > 0) return byCode;

    // Si es por RUT, devolver todos los activos, ordenados por antigüedad
    const byDocument = records.filter(
      (r) => r.clientDocument === input && r.status === "Activo",
    );
    return byDocument.sort(
      (a, b) =>
        new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime(),
    );
  },

  deliverRecord: async (
    recordId,
    extraCharge = 0,
    paymentMethod = "Efectivo",
    extraFolio = null,
    authCode = null,
    opNumber = null,
    cardNumber = null,
    cardBrand = null,
    cardType = null,
  ) => {
    const { records, currentCashRegister } = get();
    const record = records.find((r) => r.id === recordId);

    if (!record || record.status !== "Activo") {
      return false;
    }

    if (!currentCashRegister || currentCashRegister.status !== "open") {
      return false;
    }

    // Sync delivery to DB
    await dbDeliverRecord(
      recordId,
      record.lockerId,
      extraFolio,
      paymentMethod,
      authCode,
      opNumber,
      cardNumber,
      cardBrand,
      cardType,
    );

    // Apply extra charge transaction if any
    if (extraCharge > 0) {
      await get().addTransaction(
        "income",
        extraCharge,
        `Recargo extra Custodia ${record.code} - ${paymentMethod}${authCode ? ` - Auth: ${authCode}` : ""}${opNumber ? ` - Op: ${opNumber}` : ""}${extraFolio ? ` - Folio: ${extraFolio}` : ""}`,
        record.id,
      );
    }

    set((state) => ({
      records: state.records.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status: "Entregado",
              exitTime: new Date().toISOString(),
              extraFolio: extraFolio || undefined,
              exitPaymentMethod: paymentMethod,
              exitAuthCode: authCode,
              exitOpNumber: opNumber,
              exitCardNumber: cardNumber,
              exitCardBrand: cardBrand,
              exitCardType: cardType,
            }
          : r,
      ),
    }));

    await get().releaseLocker(record.lockerId);
    return true;
  },

  deliverMultipleRecords: async (
    recordIds,
    extraCharge = 0,
    paymentMethod = "Efectivo",
    extraFolio = null,
    authCode = null,
    opNumber = null,
    cardNumber = null,
    cardBrand = null,
    cardType = null,
  ) => {
    const { records, currentCashRegister, lockers } = get();

    if (!currentCashRegister || currentCashRegister.status !== "open") {
      return false;
    }

    const recordsToDeliver = records.filter(
      (r) => recordIds.includes(r.id) && r.status === "Activo"
    );

    if (recordsToDeliver.length === 0) return false;

    // Process each record delivery
    for (const record of recordsToDeliver) {
      await dbDeliverRecord(
        record.id,
        record.lockerId,
        extraFolio,
        paymentMethod,
        authCode,
        opNumber,
        cardNumber,
        cardBrand,
        cardType
      );
    }

    // Apply extra charge transaction if any (single transaction for the total)
    if (extraCharge > 0) {
      const lockerNames = recordsToDeliver.map((r) => {
        const l = lockers.find((lock) => lock.id === r.lockerId);
        return l ? `${l.col}${l.row}` : r.lockerId;
      }).join(", ");

      await get().addTransaction(
        "income",
        extraCharge,
        `Recargo extra Custodia Múltiple [${lockerNames}] - ${paymentMethod}${authCode ? ` - Auth: ${authCode}` : ""}${opNumber ? ` - Op: ${opNumber}` : ""}${extraFolio ? ` - Folio: ${extraFolio}` : ""}`,
        recordsToDeliver[0].id
      );
    }

    // Update Zustand state
    set((state) => ({
      records: state.records.map((r) =>
        recordIds.includes(r.id)
          ? {
              ...r,
              status: "Entregado",
              exitTime: new Date().toISOString(),
              extraFolio: extraFolio || undefined,
              exitPaymentMethod: paymentMethod,
              exitAuthCode: authCode,
              exitOpNumber: opNumber,
              exitCardNumber: cardNumber,
              exitCardBrand: cardBrand,
              exitCardType: cardType,
            }
          : r
      ),
      lockers: state.lockers.map((l) =>
        recordsToDeliver.some((r) => r.lockerId === l.id)
          ? { ...l, isOccupied: false, currentRecordId: null }
          : l
      ),
    }));

    return true;
  },

  openCashRegister: async (openingAmount, notes = "") => {
    const newRegisterData: Omit<CashRegister, "id"> = {
      openedAt: new Date().toISOString(),
      closedAt: null,
      openingAmount,
      closingAmount: null,
      totalSales: 0,
      totalTransactions: 0,
      status: "open",
      notes,
      openedBy: get().currentUser?.username || "desconocido",
    };

    // Sync to DB
    const newRegister = await dbOpenCashRegister(newRegisterData);

    set((state) => ({
      cashRegisters: [newRegister, ...state.cashRegisters],
      currentCashRegister: newRegister,
    }));

    return newRegister;
  },

  closeCashRegister: async (closingAmount, notes = "") => {
    const { currentCashRegister, cashTransactions } = get();

    if (!currentCashRegister || currentCashRegister.status !== "open") {
      return null;
    }

    const registerTransactions = cashTransactions.filter(
      (t) => t.registerId === currentCashRegister.id,
    );

    const totalSales =
      Math.round(
        registerTransactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0) / 10,
      ) * 10;

    const totalExpenses =
      Math.round(
        registerTransactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0) / 10,
      ) * 10;

    const closedRegisterData = {
      ...currentCashRegister,
      closedAt: new Date().toISOString(),
      closingAmount,
      totalSales: totalSales - totalExpenses,
      totalTransactions: registerTransactions.length,
      status: "closed" as const,
      notes: currentCashRegister.notes + (notes ? `\nCierre: ${notes}` : ""),
    };

    // Sync to DB
    const closedRegister = await dbCloseCashRegister(currentCashRegister.id, {
      closedAt: closedRegisterData.closedAt,
      closingAmount: closedRegisterData.closingAmount,
      totalSales: closedRegisterData.totalSales,
      totalTransactions: closedRegisterData.totalTransactions,
      status: closedRegisterData.status,
      notes: closedRegisterData.notes,
    });

    if (!closedRegister) return null;

    set((state) => ({
      cashRegisters: state.cashRegisters.map((r) =>
        r.id === closedRegister.id ? closedRegister : r,
      ),
      currentCashRegister: null,
    }));

    return closedRegister;
  },

  addTransaction: async (type, amount, description, recordId) => {
    const { currentCashRegister } = get();

    if (!currentCashRegister) return;

    const transactionData: Omit<CashTransaction, "id"> = {
      registerId: currentCashRegister.id,
      type,
      amount,
      description,
      timestamp: new Date().toISOString(),
      recordId,
    };

    // Sync to DB
    const transaction = await dbAddTransaction(transactionData);

    set((state) => ({
      cashTransactions: [transaction, ...state.cashTransactions],
    }));
  },

  getCurrentRegisterStats: () => {
    const { currentCashRegister, cashTransactions } = get();

    if (!currentCashRegister) {
      return {
        totalSales: 0,
        totalTransactions: 0,
        balance: 0,
        ingresosEfectivo: 0,
        ingresosTarjeta: 0,
      };
    }

    const registerTransactions = cashTransactions.filter(
      (t) => t.registerId === currentCashRegister.id,
    );

    const incomeEfectivo =
      Math.round(
        registerTransactions
          .filter(
            (t) => t.type === "income" && !t.description.includes("Tarjeta"),
          )
          .reduce((sum, t) => sum + t.amount, 0) / 10,
      ) * 10;

    const incomeTarjeta =
      Math.round(
        registerTransactions
          .filter(
            (t) => t.type === "income" && t.description.includes("Tarjeta"),
          )
          .reduce((sum, t) => sum + t.amount, 0) / 10,
      ) * 10;

    const expenses =
      Math.round(
        registerTransactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0) / 10,
      ) * 10;

    return {
      totalSales: incomeEfectivo + incomeTarjeta,
      ingresosEfectivo: incomeEfectivo,
      ingresosTarjeta: incomeTarjeta,
      totalTransactions: registerTransactions.length,
      balance: currentCashRegister.openingAmount + incomeEfectivo - expenses,
    };
  },
}));
