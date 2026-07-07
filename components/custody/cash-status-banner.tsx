'use client'

import { DollarSign, AlertTriangle, TrendingUp, Receipt } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CashStatusBannerProps {
  isOpen: boolean
  balance: number
  totalSales: number
  transactions: number
}

export function CashStatusBanner({ isOpen, balance, totalSales, transactions }: CashStatusBannerProps) {
  return (
    <div className="bg-white px-6 py-2.5 border-b border-zinc-300">
      <div className="flex items-center justify-between text-xs font-bold text-zinc-800 select-none">
        <div>
          {isOpen ? (
            <span className="text-zinc-900">Caja Abierta</span>
          ) : (
            <span className="text-destructive">Caja Cerrada</span>
          )}
        </div>
        <div className="text-zinc-400 font-medium">
          Ventas Totales: <span className="font-bold text-zinc-600">Gs. {totalSales.toLocaleString('es-CL')}</span>
        </div>
        <div className="text-zinc-400 font-medium">
          Transacciones: <span className="font-bold text-zinc-600">{transactions}</span>
        </div>
        <div className="text-zinc-900">
          Saldo: Gs. {balance.toLocaleString('es-CL')}
        </div>
      </div>
    </div>
  )
}
