"use client";

import { cn } from "@/lib/utils";
import { type Locker, type LockerSize } from "@/lib/types";

interface LockerGridProps {
  lockers: Locker[];
  selectedLockerId: number | null;
  onSelectLocker: (lockerId: number) => void;
  selectedSize: LockerSize | null;
}

export function LockerGrid({
  lockers,
  selectedLockerId,
  onSelectLocker,
  selectedSize,
}: LockerGridProps) {
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
    );
  }

  const allSectors = [
    { label: "Sector A", key: "A" },
    { label: "Sector B", key: "B" },
    { label: "Sector C", key: "C" },
    { label: "Sector D", key: "D" },
  ];

  // Si es XXL, solo mostrar el Sector B (es el único que tiene XXL)
  const sectors = selectedSize === "XXL"
    ? allSectors.filter((s) => s.key === "B")
    : allSectors;


  return (
    <div className="bg-[#d7d7d8] p-2 flex flex-col items-center w-full lg:flex-1 lg:h-full lg:min-h-0 gap-2">
      {/* Sector Cards */}
      <div className={`w-full grid gap-3 max-w-none lg:flex-1 lg:min-h-0 lg:h-full ${
        selectedSize === "XXL" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
      }`}>
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
              className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-zinc-300 shadow-sm flex flex-col gap-2 lg:flex-1 lg:min-h-0 lg:h-full"
            >
              <div className="flex justify-between items-center border-b border-zinc-200 pb-1.5">
                <span className="font-extrabold text-[11px] text-[#0a354c] tracking-widest uppercase">
                  {sector.label}
                </span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">
                  Disp: {availableCount} / {sectorLockers.length}
                </span>
              </div>
              <div
                className={cn(
                  "grid gap-1.5 content-start lg:flex-1 lg:min-h-0 lg:h-full",
                  "grid-cols-4",
                )}
              >
                {sectorLockers.map((locker) => {
                  const isOccupied = locker.isOccupied;
                  const isSelected = selectedLockerId === locker.id;
                  const label = `${locker.col}${locker.row}`;

                  return (
                    <button
                      key={locker.id}
                      type="button"
                      onClick={() => !isOccupied && onSelectLocker(locker.id)}
                      disabled={isOccupied}
                      className={cn(
                        "aspect-square w-full rounded-lg font-black text-xs md:text-sm transition-all duration-200 flex items-center justify-center border shadow-sm",
                        isOccupied
                          ? "bg-[#4e4e4e] border-zinc-600 text-zinc-400 cursor-not-allowed opacity-90"
                          : isSelected
                            ? "bg-[#00c5ff] border-[#00b4eb] text-white ring-4 ring-[#00c5ff]/20 scale-[1.05] shadow-md z-10 cursor-pointer"
                            : "bg-[#cef3ff] hover:bg-[#bceeff] border-[#aee2ff] text-[#0a354c] hover:scale-[1.02] cursor-pointer",
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
      <div className="w-full flex justify-center gap-4 text-[10px] font-extrabold text-zinc-800 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[#cef3ff] border border-[#aee2ff] rounded-sm" />
          <span>DISPONIBLE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[#4e4e4e] rounded-sm" />
          <span>OCUPADO</span>
        </div>
      </div>
    </div>
  );
}
