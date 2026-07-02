'use client'

import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import { type Locker, LOCKER_COLS, LOCKER_ROWS } from '@/lib/types'

interface LockerGridProps {
  lockers: Locker[]
  selectedLockerId: number | null
  onSelectLocker: (lockerId: number) => void
}

export function LockerGrid({ lockers, selectedLockerId, onSelectLocker }: LockerGridProps) {
  const getLocker = (row: number, col: string) => {
    return lockers.find((l) => l.row === row && l.col === col)
  }

  return (
    <div className="bg-[#d7d7d8] p-4 flex flex-col items-center">
      {/* Legend */}
      <div className="w-full flex justify-center gap-8 mb-4 text-xs font-bold text-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-4.5 h-4.5 bg-[#00c5ff] rounded-sm" />
          <span>DISPONIBLE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4.5 h-4.5 bg-[#4e4e4e] rounded-sm" />
          <span>OCUPADO</span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-[20px_repeat(8,1fr)] gap-2.5 w-full max-w-[620px] items-center">
        {/* Column Headers */}
        <div /> {/* Top-left empty corner */}
        {LOCKER_COLS.map((col) => (
          <div key={col} className="text-center font-bold text-sm text-zinc-900 pb-1">
            {col}
          </div>
        ))}

        {/* Rows */}
        {LOCKER_ROWS.map((row) => {
          const displayRowLabel = row + 1 // 1 to 6
          return (
            <Fragment key={row}>
              {/* Row Label */}
              <div className="text-center font-bold text-sm text-zinc-900 pr-1">
                {displayRowLabel}
              </div>

              {/* Locker Buttons */}
              {LOCKER_COLS.map((col) => {
                const locker = getLocker(row, col)
                const isOccupied = locker?.isOccupied ?? false
                const isSelected = selectedLockerId === locker?.id

                return (
                  <button
                    key={`${row}-${col}`}
                    type="button"
                    onClick={() => !isOccupied && locker && onSelectLocker(locker.id)}
                    disabled={isOccupied}
                    className={cn(
                      "aspect-square w-full rounded-sm transition-all duration-150 relative",
                      isOccupied
                        ? "bg-[#4e4e4e] cursor-not-allowed"
                        : isSelected
                        ? "bg-[#00c5ff] ring-4 ring-white border border-zinc-400 scale-[1.08] shadow-md z-10 cursor-pointer"
                        : "bg-[#00c5ff] hover:bg-[#00b4eb] cursor-pointer"
                    )}
                    title={locker ? `Casillero ${displayRowLabel}-${col}` : undefined}
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
