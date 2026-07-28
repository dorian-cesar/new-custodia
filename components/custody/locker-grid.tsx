"use client";

import { cn } from "@/lib/utils";
import { type Locker, type LockerSize } from "@/lib/types";
import { useCustodyStore } from "@/lib/custody-store";
import { useState } from "react";

interface LockerGridProps {
  lockers: Locker[];
  selectedItems: { lockerId: number; size: LockerSize }[];
  onSelectLocker: (lockerId: number) => void;
  selectedSize: LockerSize | null;
}

export function LockerGrid({
  lockers,
  selectedItems,
  onSelectLocker,
  selectedSize,
}: LockerGridProps) {
  const records = useCustodyStore((state) => state.records);
  const layoutConfig = useCustodyStore((state) => state.layoutConfig);
  const [activeTooltipLockerId, setActiveTooltipLockerId] = useState<number | null>(null);

  if (!selectedSize) {
    return (
      <div className="bg-white/50 backdrop-blur-sm p-8 rounded-xl border border-dashed border-zinc-400 text-center select-none my-2 flex-1 flex flex-col justify-center items-center">
        <p className="text-zinc-600 font-extrabold text-sm uppercase tracking-wider">
          Seleccione un tamaño de equipaje primero
        </p>
        <p className="text-[10px] text-zinc-500 font-semibold mt-1">
          Los casilleros correspondientes se cargarán automáticamente.
        </p>
      </div>
    );
  }

  // Filtrar estantes que tienen casilleros configurados para la medida seleccionada
  const sectors = layoutConfig?.shelves
    .filter(shelf => shelf.sizes.some(s => s.size === selectedSize && s.count > 0))
    .map(shelf => ({ label: `Sector ${shelf.id}`, key: shelf.id })) || [];

  return (
    <div onClick={() => setActiveTooltipLockerId(null)} className="bg-[#e6e6e7] dark:bg-zinc-900 p-2 flex flex-col items-center w-full lg:flex-1 lg:h-full lg:min-h-0 gap-2 transition-colors duration-300">
      {/* Grid de Sectores */}
      <div className={cn(
        "w-full grid gap-3 max-w-none lg:flex-1 lg:h-full lg:min-h-0",
        sectors.length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
      )}>
        {sectors.map((sector) => {
          const colCode = `${sector.key}${selectedSize}`;
          const sectorLockers = lockers
            .filter((l) => l.col === colCode)
            .sort((a, b) => a.row - b.row);

          if (sectorLockers.length === 0) return null;

          const availableCount = sectorLockers.filter(
            (l) => !l.isOccupied,
          ).length;

          return (
            <div
              key={sector.key}
              className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-sm flex flex-col gap-2 lg:flex-1 lg:h-full lg:min-h-0 transition-colors duration-300"
            >
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-700 pb-1.5">
                <span className="font-extrabold text-[11px] text-[#0a354c] dark:text-[#00c5ff] tracking-widest uppercase">
                  {sector.label}
                </span>
                <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Disp: {availableCount} / {sectorLockers.length}
                </span>
              </div>
              <div className="grid gap-1.5 content-start lg:flex-1 lg:h-full lg:min-h-0 grid-cols-6">
                {sectorLockers.map((locker) => {
                  const isOccupied = locker.isOccupied;
                  const isSelected = selectedItems.some((item) => item.lockerId === locker.id);
                  const label = `${locker.col}${locker.row}`;

                  const currentRecord = records.find((r) => r.id === locker.currentRecordId);
                  const clientDoc = currentRecord?.clientDocument || "Desconocido";
                  const entryTimeStr = currentRecord 
                    ? new Date(currentRecord.entryTime).toLocaleString("es-PY") 
                    : "N/A";

                  return (
                    <div key={locker.id} className="relative group w-full">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isOccupied) {
                            setActiveTooltipLockerId((prev) => (prev === locker.id ? null : locker.id));
                          } else {
                            onSelectLocker(locker.id);
                          }
                        }}
                        tabIndex={isOccupied ? -1 : 0}
                        className={cn(
                          "aspect-square w-full rounded-lg font-black text-xs md:text-sm transition-all duration-200 flex items-center justify-center border shadow-sm select-none",
                          isOccupied
                            ? "bg-[#4e4e4e] dark:bg-zinc-700 border-zinc-600 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500 cursor-pointer opacity-90"
                            : isSelected
                              ? "bg-[#00c5ff] border-[#00b4eb] text-white ring-4 ring-[#00c5ff]/20 scale-[1.05] shadow-md z-10 cursor-pointer"
                              : "bg-[#cef3ff]/20 hover:bg-[#cef3ff]/55 dark:bg-zinc-800 dark:hover:bg-zinc-800/80 border-[#aee2ff] dark:border-zinc-700 text-[#0a354c] dark:text-[#00c5ff] hover:scale-[1.02] cursor-pointer",
                        )}
                      >
                        {label}
                      </button>

                      {/* Custom Instant Tooltip */}
                      <div className={cn(
                        "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden flex-col items-center z-30 pointer-events-none w-max max-w-[220px] group-hover:flex",
                        activeTooltipLockerId === locker.id && "flex"
                      )}>
                        {isOccupied ? (
                          <div className="bg-[#242424] text-white text-[10px] py-2 px-3 rounded-lg shadow-xl border border-zinc-750 text-left font-semibold space-y-0.5 leading-tight select-none">
                            <p className="font-extrabold text-amber-400 text-[11px] mb-0.5">Locker {label}</p>
                            <p><span className="opacity-70">Cliente:</span> {clientDoc}</p>
                            <p><span className="opacity-70">Código:</span> {currentRecord?.code || "N/A"}</p>
                            <p className="text-[9px] opacity-50 mt-1">{entryTimeStr}</p>
                          </div>
                        ) : (
                          <div className="bg-[#242424] text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl border border-zinc-750 text-center font-bold select-none">
                            <span className="text-emerald-400">Disponible</span>
                          </div>
                        )}
                        {/* Tooltip Arrow */}
                        <div className="w-1.5 h-1.5 bg-[#242424] rotate-45 -mt-1 border-r border-b border-zinc-750" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="w-full flex justify-center gap-4 text-[10px] font-extrabold text-zinc-800 dark:text-zinc-200 mt-1 select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[#cef3ff]/50 dark:bg-[#00c5ff]/10 border border-[#aee2ff] dark:border-zinc-700 rounded-sm" />
          <span>DISPONIBLE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[#4e4e4e] dark:bg-zinc-700 rounded-sm" />
          <span>OCUPADO</span>
        </div>
      </div>
    </div>
  );
}
