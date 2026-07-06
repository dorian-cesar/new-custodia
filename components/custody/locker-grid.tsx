'use client'

import { cn } from '@/lib/utils'
import { type Locker, type LockerSize } from '@/lib/types'

interface LockerGridProps {
  lockers: Locker[]
  selectedLockerId: number | null
  onSelectLocker: (lockerId: number) => void
  selectedSize: LockerSize | null
}

export function LockerGrid({ lockers, selectedLockerId, onSelectLocker, selectedSize }: LockerGridProps) {
  if (!selectedSize) {
    return (
      <div className="bg-white/50 backdrop-blur-sm p-8 rounded-xl border border-dashed border-zinc-400 text-center select-none my-2">
        <p className="text-zinc-600 font-extrabold text-sm uppercase tracking-wider">
          Seleccione un tamaño de equipaje primero
        </p>
        <p className="text-[10px] text-zinc-500 font-semibold mt-1">
          Los casilleros correspondientes se cargarán automáticamente.
        </p>
      </div>
    )
  }

  const sectors = [
    { label: 'Sector A', key: 'A', cols: 'grid-cols-5' },
    { label: 'Sector B', key: 'B', cols: 'grid-cols-6' },
    { label: 'Sector C', key: 'C', cols: 'grid-cols-6' },
    { label: 'Sector D', key: 'D', cols: 'grid-cols-6' },
  ]

  return (
    <div className="bg-[#d7d7d8] p-4 flex flex-col items-center w-full gap-4">
      {/* Legend */}
      <div className="w-full flex justify-center gap-8 text-xs font-bold text-zinc-800 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-4.5 h-4.5 bg-[#cef3ff] border border-[#aee2ff] rounded-sm" />
          <span>DISPONIBLE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4.5 h-4.5 bg-[#4e4e4e] rounded-sm" />
          <span>OCUPADO</span>
        </div>
      </div>

      {/* Sector Cards */}
      <div className="w-full flex flex-col gap-4 max-w-[620px]">
        {sectors.map((sector) => {
          const colCode = `${sector.key}${selectedSize}`
          const sectorLockers = lockers
            .filter((l) => l.col === colCode)
            .sort((a, b) => a.row - b.row)

          if (sectorLockers.length === 0) return null

          const availableCount = sectorLockers.filter(l => !l.isOccupied).length

          return (
            <div key={sector.key} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-zinc-300 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                <span className="font-extrabold text-xs text-[#0a354c] tracking-widest uppercase">
                  {sector.label}
                </span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">
                  Disponibles: {availableCount} / {sectorLockers.length}
                </span>
              </div>
              <div className={cn("grid gap-2", sector.cols)}>
                {sectorLockers.map((locker) => {
                  const isOccupied = locker.isOccupied
                  const isSelected = selectedLockerId === locker.id
                  const label = `${locker.col}${locker.row}`

                  return (
                    <button
                      key={locker.id}
                      type="button"
                      onClick={() => !isOccupied && onSelectLocker(locker.id)}
                      disabled={isOccupied}
                      className={cn(
                        "aspect-square rounded-lg font-black text-[10px] transition-all duration-200 flex items-center justify-center border shadow-sm",
                        isOccupied
                          ? "bg-[#4e4e4e] border-zinc-600 text-zinc-400 cursor-not-allowed opacity-90"
                          : isSelected
                          ? "bg-[#00c5ff] border-[#00b4eb] text-white ring-4 ring-[#00c5ff]/20 scale-[1.05] shadow-md z-10 cursor-pointer"
                          : "bg-[#cef3ff] hover:bg-[#bceeff] border-[#aee2ff] text-[#0a354c] hover:scale-[1.02] cursor-pointer"
                      )}
                      title={`Locker ${label}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
