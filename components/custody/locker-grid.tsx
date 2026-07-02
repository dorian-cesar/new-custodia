'use client'

import { cn } from '@/lib/utils'
import { type Locker, type LockerSize } from '@/lib/types'
import { Grid3X3, MapPin } from 'lucide-react'

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

  // Group lockers by area
  const areas = ['A', 'B', 'C', 'D', 'Otros']
  const groupedLockers: Record<string, Locker[]> = {}
  for (const area of areas) {
    groupedLockers[area] = filteredLockers.filter((l) => (l.area || 'Otros') === area)
  }

  const activeAreas = areas.filter((a) => groupedLockers[a].length > 0)

  return (
    <div className="bg-[#d7d7d8] p-4 flex flex-col gap-6 rounded-lg border border-zinc-300 w-full max-w-[620px]">
      {/* Legend */}
      <div className="w-full flex justify-center gap-8 text-xs font-bold text-zinc-800 border-b border-zinc-300 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-4.5 h-4.5 bg-[#cef3ff] border border-zinc-300 rounded-sm" />
          <span>DISPONIBLE ({selectedSize})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4.5 h-4.5 bg-[#4e4e4e] rounded-sm" />
          <span>OCUPADO</span>
        </div>
      </div>

      {/* Areas Layout */}
      <div className="flex flex-col gap-6">
        {activeAreas.map((area) => {
          const areaLockers = groupedLockers[area]
          
          // Sort lockers by their label number (e.g. AS1, AS2, ..., AS10) to keep order
          const sortedAreaLockers = [...areaLockers].sort((a, b) => {
            const numA = parseInt((a.label || '').replace(/^[A-Za-z]+/, ''), 10) || 0
            const numB = parseInt((b.label || '').replace(/^[A-Za-z]+/, ''), 10) || 0
            return numA - numB
          })

          return (
            <div key={area} className="bg-zinc-100/60 p-3 rounded-lg border border-zinc-200">
              {/* Area Header */}
              <div className="flex items-center gap-1.5 mb-3 text-zinc-800">
                <MapPin className="w-4.5 h-4.5 text-zinc-600" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">
                  {area === 'Otros' ? 'Sector Otros / Extra' : `Sector ${area}`}
                </h3>
                <span className="text-[10px] bg-zinc-200 text-zinc-600 px-1.5 py-0.2 rounded font-bold">
                  {sortedAreaLockers.length} Casilleros
                </span>
              </div>

              {/* Locker Buttons Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 w-full">
                {sortedAreaLockers.map((locker) => {
                  const isOccupied = locker.isOccupied
                  const isSelected = selectedLockerId === locker.id
                  const displayName = locker.label || `${locker.row + 1}-${locker.col}`

                  return (
                    <button
                      key={locker.id}
                      type="button"
                      onClick={() => !isOccupied && onSelectLocker(locker.id)}
                      disabled={isOccupied}
                      className={cn(
                        "aspect-square w-full rounded-md transition-all duration-150 relative flex items-center justify-center font-black text-sm border shadow-sm select-none",
                        isOccupied
                          ? "bg-[#4e4e4e] border-zinc-600 text-zinc-400 cursor-not-allowed"
                          : isSelected
                          ? "bg-[#00c5ff] border-[#00b4eb] text-zinc-950 ring-4 ring-white scale-[1.08] shadow-md z-10 cursor-pointer"
                          : "bg-[#cef3ff] hover:bg-[#bceeff] border-zinc-300 text-zinc-800 cursor-pointer"
                      )}
                      title={`Casillero ${displayName} (${locker.size})`}
                    >
                      {displayName}
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
