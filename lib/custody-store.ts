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
} from './types'

import {
  dbOccupyLocker,
  dbReleaseLocker,
  dbCreateRecord,
  dbDeliverRecord,
  dbOpenCashRegister,
  dbCloseCashRegister,
  dbAddTransaction,
} from '@/app/actions/db-actions'

export interface User {
  id: number;
  username: string;
  role: 'cajero' | 'supervisor';
}


interface CustodyState {
  lockers: Locker[]
  records: CustodyRecord[]
  cashRegisters: CashRegister[]
  cashTransactions: CashTransaction[]
  cashTransactions: CashTransaction[]
  currentCashRegister: CashRegister | null
  currentUser: User | null

  // Hydration
  hydrateState: (state: { lockers: Locker[], records: CustodyRecord[], cashRegisters: CashRegister[], cashTransactions: CashTransaction[] }) => void
  
  // Auth actions
  login: (user: User) => void
  logout: () => void

  // Locker actions
  occupyLocker: (lockerId: number, recordId: number) => Promise<void>
  releaseLocker: (lockerId: number) => Promise<void>

  // Record actions
  getRecordByCode: (code: string) => CustodyRecord | null
  createRecord: (lockerId: number, clientDocument: string, size: LockerSize) => Promise<CustodyRecord | null>
  deliverRecord: (recordId: number, extraCharge?: number) => Promise<boolean>

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
    cashRegisters: [],
    cashTransactions: [],
    currentCashRegister: null,
    currentUser: null,

    login: (user) => set({ currentUser: user }),
    logout: () => set({ currentUser: null }),

    hydrateState: (dbState) => {
      set({
        lockers: dbState.lockers,
        records: dbState.records,
        cashRegisters: dbState.cashRegisters,
        cashTransactions: dbState.cashTransactions,
        currentCashRegister: dbState.cashRegisters.find(r => r.status === 'open') || null
      })
    },

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

    createRecord: async (lockerId, clientDocument, size) => {
      const { currentCashRegister, lockers } = get()
      
      if (!currentCashRegister || currentCashRegister.status !== 'open') {
        return null
      }

      const locker = lockers.find((l) => l.id === lockerId)
      if (!locker || locker.isOccupied) {
        return null
      }

      const sizeOption = LOCKER_SIZES.find((s) => s.value === size)
      if (!sizeOption) return null

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
      }

      // Sync record creation to DB to get ID
      const newRecord = await dbCreateRecord(recordData)

      set((state) => ({
        records: [newRecord, ...state.records],
      }))

      await get().occupyLocker(lockerId, newRecord.id)
      await get().addTransaction('income', sizeOption.price, `Custodia ${code} - ${sizeOption.label}`, newRecord.id)

      return newRecord
    },

    getRecordByCode: (code) => {
      const { records } = get()
      return records.find((r) => r.code === code && r.status === 'Activo') || null
    },

    deliverRecord: async (recordId, extraCharge = 0) => {
      const { records, currentCashRegister } = get()
      const record = records.find((r) => r.id === recordId)
      
      if (!record || record.status !== 'Activo') {
        return false
      }

      if (!currentCashRegister || currentCashRegister.status !== 'open') {
        return false
      }

      // Sync delivery to DB
      await dbDeliverRecord(recordId, record.lockerId)

      // Apply extra charge transaction if any
      if (extraCharge > 0) {
        await get().addTransaction('income', extraCharge, `Recargo extra Custodia ${record.code}`, record.id)
      }

      set((state) => ({
        records: state.records.map((r) =>
          r.id === recordId
            ? { ...r, status: 'Entregado', exitTime: new Date().toISOString() }
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
