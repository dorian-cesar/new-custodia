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
    <div
      className={cn(
        'px-6 py-3 border-b',
        isOpen ? 'bg-primary/10 border-primary/20' : 'bg-destructive/10 border-destructive/20'
      )}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isOpen ? (
            <>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">Caja Abierta</span>
              </div>
              <div className="hidden sm:flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>Ventas: ${totalSales.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Receipt className="h-4 w-4" />
                  <span>{transactions} transacciones</span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <span>Saldo: ${balance.toLocaleString()}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-medium text-foreground">Caja Cerrada</span>
              <span className="text-sm text-muted-foreground">- Debe abrir la caja para operar</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
