'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/custody/header'
import { LockerSelection } from '@/components/custody/locker-selection'
import { ClientRegistration } from '@/components/custody/client-registration'
import { CashStatusBanner } from '@/components/custody/cash-status-banner'
import { OverdueAlert } from '@/components/custody/overdue-alert'
import { useCustodyStore } from '@/lib/custody-store'
import { type LockerSize, type CustodyRecord } from '@/lib/types'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CustodyPage() {
  const router = useRouter()
  const {
    lockers,
    records,
    currentCashRegister,
    currentUser,
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

  // Redirect supervisors to admin panel
  useEffect(() => {
    if (mounted && currentUser?.role === 'supervisor') {
      router.replace('/admin')
    }
  }, [mounted, currentUser, router])

  const isCashOpen = currentCashRegister?.status === 'open'
  const stats = getCurrentRegisterStats()

  const handleGenerateBarcode = async (paymentMethod: string): Promise<CustodyRecord | null> => {
    if (!selectedLockerId || !selectedSize || !clientDocument.trim()) {
      return null
    }

    const record = await createRecord(selectedLockerId, clientDocument.trim(), selectedSize, paymentMethod)
    if (record) {
      setCurrentRecord(record)
      setSelectedLockerId(null)
      setSelectedSize(null)
      setClientDocument('')
    }
    return record
  }

  const handleDeliver = async (code: string, extraCharge?: number, paymentMethod?: string, extraFolio?: number | null): Promise<boolean> => {
    const record = records.find((r) => r.code === code && r.status === 'Activo')
    if (!record) return false
    return await deliverRecord(record.id, extraCharge, paymentMethod, extraFolio)
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
        {stats.balance >= 30000 && (
          <div className="mb-6 bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-full">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-600 dark:text-amber-500">
                  Límite de Caja Alcanzado
                </h3>
                <p className="text-sm text-amber-600/80 dark:text-amber-500/80 mt-1">
                  La caja actual ha alcanzado o superado los $30.000 (Saldo actual: ${stats.balance.toLocaleString()}). Por favor, realice un giro de caja a la brevedad.
                </p>
              </div>
            </div>
            <Button variant="outline" className="border-amber-500/20 text-amber-600 dark:text-amber-500 hover:bg-amber-500/10" onClick={() => router.push('/caja')}>
              Ir a Caja
            </Button>
          </div>
        )}

        <OverdueAlert />
        
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
              selectedSize={selectedSize}
              clientDocument={clientDocument}
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
