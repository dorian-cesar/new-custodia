'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/custody/header'
import { LockerSelection } from '@/components/custody/locker-selection'
import { ClientRegistration } from '@/components/custody/client-registration'
import { CashStatusBanner } from '@/components/custody/cash-status-banner'
import { useCustodyStore } from '@/lib/custody-store'
import { type LockerSize, type CustodyRecord } from '@/lib/types'

export default function CustodyPage() {
  const {
    lockers,
    records,
    currentCashRegister,
    createRecord,
    deliverRecord,
    getCurrentRegisterStats,
  } = useCustodyStore()

  const [selectedLockerId, setSelectedLockerId] = useState<number | null>(null)
  const [selectedSize, setSelectedSize] = useState<LockerSize | null>(null)
  const [clientDocument, setClientDocument] = useState('')
  const [currentRecord, setCurrentRecord] = useState<CustodyRecord | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isCashOpen = currentCashRegister?.status === 'open'
  const stats = getCurrentRegisterStats()

  const handleGenerateBarcode = async (): Promise<CustodyRecord | null> => {
    if (!selectedLockerId || !selectedSize || !clientDocument.trim()) {
      return null
    }

    const record = await createRecord(selectedLockerId, clientDocument.trim(), selectedSize)
    if (record) {
      setCurrentRecord(record)
      setSelectedLockerId(null)
      setSelectedSize(null)
      setClientDocument('')
    }
    return record
  }

  const handleDeliver = async (code: string, extraCharge?: number): Promise<boolean> => {
    const record = records.find((r) => r.code === code && r.status === 'Activo')
    if (!record) return false
    return await deliverRecord(record.id, extraCharge)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showHistory showCash />
      
      <CashStatusBanner 
        isOpen={isCashOpen} 
        balance={stats.balance}
        totalSales={stats.totalSales}
        transactions={stats.totalTransactions}
      />

      <main className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LockerSelection
              lockers={lockers}
              selectedLockerId={selectedLockerId}
              onSelectLocker={setSelectedLockerId}
              selectedSize={selectedSize}
              onSelectSize={setSelectedSize}
              clientDocument={clientDocument}
              onChangeDocument={setClientDocument}
            />
          </div>
          <div>
            <ClientRegistration
              selectedLockerId={selectedLockerId}
              onGenerateBarcode={handleGenerateBarcode}
              onDeliver={handleDeliver}
              currentRecord={currentRecord}
              isCashOpen={isCashOpen}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
