'use client'

import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import { type Locker, type LockerSize } from '@/lib/types'
import { Grid3X3 } from 'lucide-react'

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
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-zinc-400 rounded-lg bg-white/50 flex flex-col items-center justify-center gap-2">
        <Grid3X3 className="h-8 w-8 opacity-45 text-zinc-900" />
        <span className="font-bold text-sm text-zinc-900">Seleccione un tamaño de equipaje para ver los casilleros disponibles.</span>
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
    <div className="bg-[#d7d7d8] p-4 flex flex-col items-center rounded-lg border border-zinc-300">
      {/* Legend */}
      <div className="w-full flex justify-center gap-8 mb-4 text-xs font-bold text-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-4.5 h-4.5 bg-[#00c5ff] rounded-sm" />
          <span>DISPONIBLE ({selectedSize})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4.5 h-4.5 bg-[#4e4e4e] rounded-sm" />
          <span>OCUPADO</span>
        </div>
      </div>

      {/* Grid Container */}
      <div 
        className="grid gap-2.5 w-full max-w-[620px] items-center"
        style={{ gridTemplateColumns: `20px repeat(${uniqueCols.length}, minmax(0, 1fr))` }}
      >
        {/* Column Headers */}
        <div /> {/* Top-left empty corner */}
        {uniqueCols.map((col) => (
          <div key={col} className="text-center font-bold text-sm text-zinc-900 pb-1">
            {col}
          </div>
        ))}

        {/* Rows */}
        {uniqueRows.map((row) => {
          const displayRowLabel = row + 1 // 1 to N
          return (
            <Fragment key={row}>
              {/* Row Label */}
              <div className="text-center font-bold text-sm text-zinc-900 pr-1">
                {displayRowLabel}
              </div>

              {/* Locker Buttons */}
              {uniqueCols.map((col) => {
                const locker = getLocker(row, col)
                if (!locker) return <div key={`${row}-${col}`} className="aspect-square w-full" />
                
                const isOccupied = locker.isOccupied
                const isSelected = selectedLockerId === locker.id
                
                return (
                  <button
                    key={`${row}-${col}`}
                    type="button"
                    onClick={() => !isOccupied && onSelectLocker(locker.id)}
                    disabled={isOccupied}
                    className={cn(
                      "aspect-square w-full rounded-sm transition-all duration-150 relative",
                      isOccupied
                        ? "bg-[#4e4e4e] cursor-not-allowed"
                        : isSelected
                        ? "bg-[#00c5ff] ring-4 ring-white border border-zinc-400 scale-[1.08] shadow-md z-10 cursor-pointer"
                        : "bg-[#00c5ff] hover:bg-[#00b4eb] cursor-pointer"
                    )}
                    title={`Casillero ${displayRowLabel}-${col}`}
                  />
                )
              })}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
