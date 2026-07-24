"use client";

import { cn } from "@/lib/utils";
import { type Locker, type LockerSize } from "@/lib/types";

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

  const allSectors = [
    { label: "Sector A", key: "A" },
    { label: "Sector B", key: "B" },
    { label: "Sector C", key: "C" },
    { label: "Sector D", key: "D" },
  ];

  // Si es XXL, solo mostrar el Sector B (es el único que tiene XXL en la base de datos)
  const sectors = selectedSize === "XXL"
    ? allSectors.filter((s) => s.key === "B")
    : allSectors;

  return (
    <div className="bg-[#e6e6e7] dark:bg-zinc-900 p-2 flex flex-col items-center w-full md:flex-1 md:h-full md:min-h-0 gap-2 transition-colors duration-300">
      {/* Grid de Sectores */}
      <div className={cn(
        "w-full grid gap-3 max-w-none md:flex-1 md:min-h-0 md:h-full",
        selectedSize === "XXL" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
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
              className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-sm flex flex-col gap-2 md:flex-1 md:min-h-0 md:h-full transition-colors duration-300"
            >
              <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-700 pb-1.5">
                <span className="font-extrabold text-[11px] text-[#0a354c] dark:text-[#00c5ff] tracking-widest uppercase">
                  {sector.label}
                </span>
                <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Disp: {availableCount} / {sectorLockers.length}
                </span>
              </div>
              <div className="grid gap-1.5 content-start md:flex-1 md:min-h-0 md:h-full grid-cols-6">
                {sectorLockers.map((locker) => {
                  const isOccupied = locker.isOccupied;
                  const isSelected = selectedItems.some((item) => item.lockerId === locker.id);
                  const label = `${locker.col}${locker.row}`;

                  return (
                    <button
                      key={locker.id}
                      type="button"
                      onClick={() => !isOccupied && onSelectLocker(locker.id)}
                      disabled={isOccupied}
                      className={cn(
                        "aspect-square w-full rounded-lg font-black text-xs md:text-sm transition-all duration-200 flex items-center justify-center border shadow-sm select-none",
                        isOccupied
                          ? "bg-[#4e4e4e] dark:bg-zinc-700 border-zinc-600 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-90"
                          : isSelected
                            ? "bg-[#00c5ff] border-[#00b4eb] text-white ring-4 ring-[#00c5ff]/20 scale-[1.05] shadow-md z-10 cursor-pointer"
                            : "bg-[#cef3ff]/20 hover:bg-[#cef3ff]/55 dark:bg-zinc-800 dark:hover:bg-zinc-800/80 border-[#aee2ff] dark:border-zinc-700 text-[#0a354c] dark:text-[#00c5ff] hover:scale-[1.02] cursor-pointer",
                      )}
                      title={`Locker ${label}`}
                    >
                      {label}
                    </button>
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
