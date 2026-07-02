'use client'

import { Grid3X3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Locker, type LockerSize } from '@/lib/types'

interface LockerGridProps {
  lockers: Locker[]
  selectedLockerId: number | null
  onSelectLocker: (lockerId: number) => void
  selectedSize: LockerSize | null
}

export function LockerGrid({ lockers, selectedLockerId, onSelectLocker, selectedSize }: LockerGridProps) {
  // Filter lockers by size
  const filteredLockers = selectedSize
    ? lockers.filter((l) => l.size === selectedSize)
    : []

  if (filteredLockers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-secondary/10 flex flex-col items-center justify-center gap-2">
        <Grid3X3 className="h-8 w-8 opacity-45" />
        <span className="font-medium text-sm">Seleccione un tamaño de equipaje para ver los casilleros disponibles.</span>
      </div>
    )
  }

  // Get unique sorted rows and cols for the selected locker size
  const uniqueRows = Array.from(new Set(filteredLockers.map((l) => l.row))).sort((a, b) => a - b)
  const uniqueCols = Array.from(new Set(filteredLockers.map((l) => l.col))).sort()

  const getLocker = (row: number, col: string) => {
    return filteredLockers.find((l) => l.row === row && l.col === col)
  }

  return (
    <div className="bg-secondary/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Casilleros Disponibles ({selectedSize})</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-muted" />
            <span className="text-muted-foreground">Ocupado</span>
          </div>
        </div>
      </div>

      <div className="grid gap-1.5">
        {uniqueRows.map((row) => (
          <div 
            key={row} 
            className="grid gap-1.5" 
            style={{ gridTemplateColumns: `repeat(${uniqueCols.length}, minmax(0, 1fr))` }}
          >
            {uniqueCols.map((col) => {
              const locker = getLocker(row, col)
              if (!locker) return <div key={`${row}-${col}`} className="min-h-[2.5rem]" />
              
              const isOccupied = locker.isOccupied
              const isSelected = selectedLockerId === locker.id
              
              return (
                <button
                  key={`${row}-${col}`}
                  onClick={() => !isOccupied && onSelectLocker(locker.id)}
                  disabled={isOccupied}
                  className={cn(
                    'py-2 px-2 rounded text-sm font-medium transition-all min-h-[2.5rem]',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                    isOccupied
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : isSelected
                      ? 'bg-accent text-accent-foreground ring-2 ring-accent'
                      : 'bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer'
                  )}
                >
                  {row},{col}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
