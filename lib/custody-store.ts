'use client'

import { create } from 'zustand'
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
} from './types'

import {
  dbOccupyLocker,
  dbReleaseLocker,
  dbCreateRecord,
  dbDeliverRecord,
  dbOpenCashRegister,
  dbCloseCashRegister,
  dbAddTransaction,
  sendBoleta,
} from '@/app/actions/db-actions'

export interface User {
  id: number;
  username: string;
  email?: string;
  role: 'cajero' | 'supervisor';
  token?: string;
}


interface CustodyState {
  lockers: Locker[]
  records: CustodyRecord[]
  cashRegisters: CashRegister[]
  cashTransactions: CashTransaction[]
  currentCashRegister: CashRegister | null
  currentUser: User | null
  lockerSizes: LockerSizeOption[]

  // Hydration
  hydrateState: (state: { lockers: Locker[], records: CustodyRecord[], cashRegisters: CashRegister[], cashTransactions: CashTransaction[], lockerSizes?: LockerSizeOption[] }) => void
  setLockerSizes: (sizes: LockerSizeOption[]) => void
  
  // Auth actions
  login: (user: User) => void
  logout: () => void

  // Locker actions
  occupyLocker: (lockerId: number, recordId: number) => Promise<void>
  releaseLocker: (lockerId: number) => Promise<void>

  // Record actions
  getRecordByCode: (code: string) => CustodyRecord | null
  getActiveRecordsByInput: (input: string) => CustodyRecord[]
  createRecord: (lockerId: number, clientDocument: string, size: LockerSize, paymentMethod?: string, authCode?: string | null, opNumber?: string | null) => Promise<CustodyRecord | null>
  deliverRecord: (recordId: number, extraCharge?: number, paymentMethod?: string, extraFolio?: number | null, authCode?: string | null, opNumber?: string | null) => Promise<boolean>


  // Cash register actions
  openCashRegister: (openingAmount: number, notes?: string) => Promise<CashRegister>
  closeCashRegister: (closingAmount: number, notes?: string) => Promise<CashRegister | null>
  addTransaction: (type: 'income' | 'expense', amount: number, description: string, recordId?: number) => Promise<void>
  getCurrentRegisterStats: () => { totalSales: number; totalTransactions: number; balance: number }
}

export const useCustodyStore = create<CustodyState>()(
  (set, get) => ({
    lockers: [],
    records: [],
    cashRegisters: [],
    cashTransactions: [],
    currentCashRegister: null,
    currentUser: null,
    lockerSizes: LOCKER_SIZES,

    login: (user) => set({ currentUser: user }),
    logout: () => set({ currentUser: null }),

    hydrateState: (dbState) => {
      set({
        lockers: dbState.lockers,
        records: dbState.records,
        cashRegisters: dbState.cashRegisters,
        cashTransactions: dbState.cashTransactions,
        lockerSizes: dbState.lockerSizes || get().lockerSizes,
        currentCashRegister: dbState.cashRegisters.find(r => r.status === 'open') || null
      })
    },

    setLockerSizes: (sizes) => set({ lockerSizes: sizes }),

    occupyLocker: async (lockerId, recordId) => {
      // Sync to DB
      await dbOccupyLocker(lockerId, recordId)
      
      set((state) => ({
        lockers: state.lockers.map((l) =>
          l.id === lockerId ? { ...l, isOccupied: true, currentRecordId: recordId } : l
        ),
      }))
    },

    releaseLocker: async (lockerId) => {
      // Sync to DB
      await dbReleaseLocker(lockerId)
      
      set((state) => ({
        lockers: state.lockers.map((l) =>
          l.id === lockerId ? { ...l, isOccupied: false, currentRecordId: null } : l
        ),
      }))
    },

    createRecord: async (lockerId, clientDocument, size, paymentMethod = 'Efectivo', authCode = null, opNumber = null) => {
      const { currentCashRegister, lockers, currentUser } = get()
      
      if (!currentCashRegister || currentCashRegister.status !== 'open') {
        return null
      }

      const locker = lockers.find((l) => l.id === lockerId)
      if (!locker || locker.isOccupied) {
        return null
      }

      const sizeOption = get().lockerSizes.find((s) => s.value === size)
      if (!sizeOption) return null

      // Intentar emitir boleta electrónica si tenemos token del usuario
      const token = currentUser?.token || ''
      let folio: number | null = null

      if (token) {
        try {
          const boletaRes = await sendBoleta(sizeOption.label, sizeOption.price, token)
          if (boletaRes.success && boletaRes.data) {
            folio = boletaRes.data.folio
          }
        } catch (err) {
          console.error('Error al emitir boleta en la entrada:', err)
        }
      }

      const code = generateCode(clientDocument)
      
      const recordData: Omit<CustodyRecord, 'id'> = {
        code,
        lockerId,
        clientDocument,
        entryTime: new Date().toISOString(),
        exitTime: null,
        size,
        status: 'Activo',
        price: sizeOption.price,
        folio: folio || undefined,
      }

      // Sync record creation to DB to get ID
      const newRecord = await dbCreateRecord(recordData)

      set((state) => ({
        records: [newRecord, ...state.records],
      }))

      await get().occupyLocker(lockerId, newRecord.id)
      await get().addTransaction('income', sizeOption.price, `Custodia ${code} - ${sizeOption.label} - ${paymentMethod}${folio ? ` - Folio: ${folio}` : ''}`, newRecord.id)

      return newRecord
    },

    getRecordByCode: (code) => {
      const { records } = get()
      // 1. Buscar por código exacto de barras
      const byCode = records.find((r) => r.code === code && r.status === 'Activo')
      if (byCode) return byCode
      // 2. Buscar por documento del cliente (RUT/DNI/Pasaporte) — FIFO: el más antiguo primero
      const byDocument = records.filter((r) => r.clientDocument === code && r.status === 'Activo')
      return byDocument.length > 0 ? byDocument[byDocument.length - 1] : null
    },

    getActiveRecordsByInput: (input) => {
      const { records } = get()
      // Si es un código exacto de barras o la primera parte del código (ej: 225386)
      const byCode = records.filter((r) => (r.code === input || r.code.startsWith(`${input}/`)) && r.status === 'Activo')
      if (byCode.length > 0) return byCode

      // Si es por RUT, devolver todos los activos, ordenados por antigüedad
      const byDocument = records.filter((r) => r.clientDocument === input && r.status === 'Activo')
      return byDocument.sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime())
    },

    deliverRecord: async (recordId, extraCharge = 0, paymentMethod = 'Efectivo', extraFolio = null) => {
      const { records, currentCashRegister } = get()
      const record = records.find((r) => r.id === recordId)
      
      if (!record || record.status !== 'Activo') {
        return false
      }

      if (!currentCashRegister || currentCashRegister.status !== 'open') {
        return false
      }

      // Sync delivery to DB
      await dbDeliverRecord(recordId, record.lockerId, extraFolio)

      // Apply extra charge transaction if any
      if (extraCharge > 0) {
        await get().addTransaction('income', extraCharge, `Recargo extra Custodia ${record.code} - ${paymentMethod}${extraFolio ? ` - Folio: ${extraFolio}` : ''}`, record.id)
      }

      set((state) => ({
        records: state.records.map((r) =>
          r.id === recordId
            ? { 
                ...r, 
                status: 'Entregado', 
                exitTime: new Date().toISOString(),
                extraFolio: extraFolio || undefined,
              }
            : r
        ),
      }))

      await get().releaseLocker(record.lockerId)
      return true
    },

    openCashRegister: async (openingAmount, notes = '') => {
      const newRegisterData: Omit<CashRegister, 'id'> = {
        openedAt: new Date().toISOString(),
        closedAt: null,
        openingAmount,
        closingAmount: null,
        totalSales: 0,
        totalTransactions: 0,
        status: 'open',
        notes,
        openedBy: get().currentUser?.username || 'desconocido',
      }

      // Sync to DB
      const newRegister = await dbOpenCashRegister(newRegisterData)

      set((state) => ({
        cashRegisters: [newRegister, ...state.cashRegisters],
        currentCashRegister: newRegister,
      }))

      return newRegister
    },

    closeCashRegister: async (closingAmount, notes = '') => {
      const { currentCashRegister, cashTransactions } = get()
      
      if (!currentCashRegister || currentCashRegister.status !== 'open') {
        return null
      }

      const registerTransactions = cashTransactions.filter(
        (t) => t.registerId === currentCashRegister.id
      )
      
      const totalSales = registerTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)
      
      const totalExpenses = registerTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      const closedRegisterData = {
        ...currentCashRegister,
        closedAt: new Date().toISOString(),
        closingAmount,
        totalSales: totalSales - totalExpenses,
        totalTransactions: registerTransactions.length,
        status: 'closed' as const,
        notes: currentCashRegister.notes + (notes ? `\nCierre: ${notes}` : ''),
      }

      // Sync to DB
      const closedRegister = await dbCloseCashRegister(currentCashRegister.id, {
        closedAt: closedRegisterData.closedAt,
        closingAmount: closedRegisterData.closingAmount,
        totalSales: closedRegisterData.totalSales,
        totalTransactions: closedRegisterData.totalTransactions,
        status: closedRegisterData.status,
        notes: closedRegisterData.notes,
      })

      if (!closedRegister) return null;

      set((state) => ({
        cashRegisters: state.cashRegisters.map((r) =>
          r.id === closedRegister.id ? closedRegister : r
        ),
        currentCashRegister: null,
      }))

      return closedRegister
    },

    addTransaction: async (type, amount, description, recordId) => {
      const { currentCashRegister } = get()
      
      if (!currentCashRegister) return

      const transactionData: Omit<CashTransaction, 'id'> = {
        registerId: currentCashRegister.id,
        type,
        amount,
        description,
        timestamp: new Date().toISOString(),
        recordId,
      }

      // Sync to DB
      const transaction = await dbAddTransaction(transactionData)

      set((state) => ({
        cashTransactions: [transaction, ...state.cashTransactions],
      }))
    },

    getCurrentRegisterStats: () => {
      const { currentCashRegister, cashTransactions } = get()
      
      if (!currentCashRegister) {
        return { totalSales: 0, totalTransactions: 0, balance: 0 }
      }

      const registerTransactions = cashTransactions.filter(
        (t) => t.registerId === currentCashRegister.id
      )

      const income = registerTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

      const expenses = registerTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      return {
        totalSales: income,
        totalTransactions: registerTransactions.length,
        balance: currentCashRegister.openingAmount + income - expenses,
      }
    },
  })
)
