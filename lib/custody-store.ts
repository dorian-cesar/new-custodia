'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

interface CustodyState {
  lockers: Locker[]
  records: CustodyRecord[]
  cashRegisters: CashRegister[]
  cashTransactions: CashTransaction[]
  currentCashRegister: CashRegister | null

  // Locker actions
  initLockers: () => void
  occupyLocker: (lockerId: string, recordId: string) => void
  releaseLocker: (lockerId: string) => void

  // Record actions
  createRecord: (lockerId: string, clientDocument: string, size: LockerSize) => CustodyRecord | null
  deliverRecord: (recordId: string) => boolean

  // Cash register actions
  openCashRegister: (openingAmount: number, notes?: string) => CashRegister
  closeCashRegister: (closingAmount: number, notes?: string) => CashRegister | null
  addTransaction: (type: 'income' | 'expense', amount: number, description: string, recordId?: string) => void
  getCurrentRegisterStats: () => { totalSales: number; totalTransactions: number; balance: number }
}

export const useCustodyStore = create<CustodyState>()(
  persist(
    (set, get) => ({
      lockers: [],
      records: [],
      cashRegisters: [],
      cashTransactions: [],
      currentCashRegister: null,

      initLockers: () => {
        const { lockers } = get()
        if (lockers.length === 0) {
          set({ lockers: generateLockers() })
        }
      },

      occupyLocker: (lockerId, recordId) => {
        set((state) => ({
          lockers: state.lockers.map((l) =>
            l.id === lockerId ? { ...l, isOccupied: true, currentRecordId: recordId } : l
          ),
        }))
      },

      releaseLocker: (lockerId) => {
        set((state) => ({
          lockers: state.lockers.map((l) =>
            l.id === lockerId ? { ...l, isOccupied: false, currentRecordId: null } : l
          ),
        }))
      },

      createRecord: (lockerId, clientDocument, size) => {
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
        const record: CustodyRecord = {
          id: crypto.randomUUID(),
          code,
          lockerId,
          clientDocument,
          entryTime: new Date().toISOString(),
          exitTime: null,
          size,
          status: 'Activo',
          price: sizeOption.price,
        }

        set((state) => ({
          records: [record, ...state.records],
        }))

        get().occupyLocker(lockerId, record.id)
        get().addTransaction('income', sizeOption.price, `Custodia ${code} - ${sizeOption.label}`, record.id)

        return record
      },

      deliverRecord: (recordId) => {
        const { records, currentCashRegister } = get()
        const record = records.find((r) => r.id === recordId)
        
        if (!record || record.status !== 'Activo') {
          return false
        }

        if (!currentCashRegister || currentCashRegister.status !== 'open') {
          return false
        }

        set((state) => ({
          records: state.records.map((r) =>
            r.id === recordId
              ? { ...r, status: 'Entregado', exitTime: new Date().toISOString() }
              : r
          ),
        }))

        get().releaseLocker(record.lockerId)
        return true
      },

      openCashRegister: (openingAmount, notes = '') => {
        const newRegister: CashRegister = {
          id: crypto.randomUUID(),
          openedAt: new Date().toISOString(),
          closedAt: null,
          openingAmount,
          closingAmount: null,
          totalSales: 0,
          totalTransactions: 0,
          status: 'open',
          notes,
        }

        set((state) => ({
          cashRegisters: [newRegister, ...state.cashRegisters],
          currentCashRegister: newRegister,
        }))

        return newRegister
      },

      closeCashRegister: (closingAmount, notes = '') => {
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

        const closedRegister: CashRegister = {
          ...currentCashRegister,
          closedAt: new Date().toISOString(),
          closingAmount,
          totalSales: totalSales - totalExpenses,
          totalTransactions: registerTransactions.length,
          status: 'closed',
          notes: currentCashRegister.notes + (notes ? `\nCierre: ${notes}` : ''),
        }

        set((state) => ({
          cashRegisters: state.cashRegisters.map((r) =>
            r.id === closedRegister.id ? closedRegister : r
          ),
          currentCashRegister: null,
        }))

        return closedRegister
      },

      addTransaction: (type, amount, description, recordId) => {
        const { currentCashRegister } = get()
        
        if (!currentCashRegister) return

        const transaction: CashTransaction = {
          id: crypto.randomUUID(),
          registerId: currentCashRegister.id,
          type,
          amount,
          description,
          timestamp: new Date().toISOString(),
          recordId,
        }

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
    }),
    {
      name: 'custody-storage',
    }
  )
)
