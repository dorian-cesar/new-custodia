'use client'

import { useCustodyStore } from '@/lib/custody-store'
import { AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'

export function OverdueAlert() {
  const { records } = useCustodyStore()
  const [overdueCount, setOverdueCount] = useState(0)

  useEffect(() => {
    const checkOverdue = () => {
      const now = Date.now()
      const count = records.filter(r => {
        if (r.status !== 'Activo') return false
        const diffMs = now - new Date(r.entryTime).getTime()
        const diffHours = diffMs / (1000 * 60 * 60)
        return diffHours >= 24
      }).length
      setOverdueCount(count)
    }

    checkOverdue()
    // Revisar cada minuto por si un casillero acaba de cumplir las 24 hrs
    const interval = setInterval(checkOverdue, 60000)
    return () => clearInterval(interval)
  }, [records])

  if (overdueCount === 0) return null

  return (
    <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
      <div className="p-2 bg-amber-500/20 rounded-full animate-pulse">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
      </div>
      <div>
        <h3 className="text-amber-800 dark:text-amber-400 font-semibold text-sm">
          Alerta de Equipaje Excedido
        </h3>
        <p className="text-amber-700/80 dark:text-amber-500/80 text-xs mt-0.5">
          Hay {overdueCount} casillero{overdueCount > 1 ? 's' : ''} con más de 24 horas de custodia. Pendiente{overdueCount > 1 ? 's' : ''} de cobro por recargo extra.
        </p>
      </div>
    </div>
  )
}
