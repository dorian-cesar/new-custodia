'use client'

import { Grid3X3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Locker, LOCKER_COLS, LOCKER_ROWS } from '@/lib/types'

interface LockerGridProps {
  lockers: Locker[]
  selectedLockerId: string | null
  onSelectLocker: (lockerId: string) => void
}

export function LockerGrid({ lockers, selectedLockerId, onSelectLocker }: LockerGridProps) {
  const getLocker = (row: number, col: string) => {
    return lockers.find((l) => l.row === row && l.col === col)
  }

  return (
    <div className="bg-secondary/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Casilleros Disponibles</span>
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
        {LOCKER_ROWS.map((row) => (
          <div key={row} className="grid grid-cols-8 gap-1.5">
            {LOCKER_COLS.map((col) => {
              const locker = getLocker(row, col)
              const isOccupied = locker?.isOccupied ?? false
              const isSelected = selectedLockerId === locker?.id
              
              return (
                <button
                  key={`${row}-${col}`}
                  onClick={() => !isOccupied && locker && onSelectLocker(locker.id)}
                  disabled={isOccupied}
                  className={cn(
                    'py-2 px-3 rounded text-xs font-medium transition-all',
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
