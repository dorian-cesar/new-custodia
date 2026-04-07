'use client'

import { Box, History, ArrowLeft, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface HeaderProps {
  showHistory?: boolean
  showBack?: boolean
  showCash?: boolean
}

export function Header({ showHistory = false, showBack = false, showCash = false }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent rounded-lg">
          <Box className="h-6 w-6 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Custodia</h1>
          <p className="text-sm text-muted-foreground">Sistema de Control de Casilleros</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {showCash && (
          <Button asChild variant="default" className="bg-primary hover:bg-primary/90">
            <Link href="/caja">
              <DollarSign className="h-4 w-4 mr-2" />
              Caja
            </Link>
          </Button>
        )}
        {showHistory && (
          <Button asChild variant="default" className="bg-primary hover:bg-primary/90">
            <Link href="/historial">
              <History className="h-4 w-4 mr-2" />
              Ver Historial
            </Link>
          </Button>
        )}
        {showBack && (
          <Button asChild variant="secondary">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}
