"use client";

import { useMemo } from "react";
import { Briefcase, Backpack, Luggage, Package, Package2 } from "lucide-react";
import { LockerGrid } from "./locker-grid";
import { type Locker, type LockerSize } from "@/lib/types";
import { useCustodyStore } from "@/lib/custody-store";
import { formatCurrency } from "@/lib/utils";

interface LockerSelectionProps {
  lockers: Locker[];
  selectedItems: { lockerId: number; size: LockerSize }[];
  onSelectLocker: (lockerId: number) => void;
  selectedSize: LockerSize | null;
  onSelectSize: (size: LockerSize) => void;
  clientDocument: string;
  onChangeDocument: (document: string) => void;
  children?: React.ReactNode;
}

export function LockerSelection({
  lockers,
  selectedItems,
  onSelectLocker,
  selectedSize,
  onSelectSize,
  clientDocument,
  onChangeDocument,
  children,
}: LockerSelectionProps) {
  const lockerSizes = useCustodyStore((state) => state.lockerSizes);
  const layoutConfig = useCustodyStore((state) => state.layoutConfig);

  // Medidas verdaderamente configuradas con casilleros activos en el Layout del Admin
  const configuredSizeCodes = useMemo(() => {
    if (!layoutConfig?.shelves) return [];
    const set = new Set<string>();
    layoutConfig.shelves.forEach((shelf) => {
      shelf.sizes.forEach((s) => {
        if (s.count > 0) set.add(s.size);
      });
    });
    return Array.from(set);
  }, [layoutConfig]);

  // Mapeamos solo las medidas activas según el diseño del Admin
  const sizesToShow = lockerSizes
    .filter((dbSize) => configuredSizeCodes.length === 0 || configuredSizeCodes.includes(dbSize.value))
    .map((dbSize) => {
      const sizeLockers = lockers.filter((l) => l.col.endsWith(dbSize.value));
      const availableCount = sizeLockers.filter((l) => !l.isOccupied).length;
      return {
        value: dbSize.value,
        label: dbSize.label,
        price: dbSize.price,
        isXXL: dbSize.value.toUpperCase() === "XXL",
        total: sizeLockers.length,
        available: availableCount,
      };
    });

  // Íconos por tamaño (fallback a un ícono genérico si es un tamaño nuevo)
  const getIconForSize = (size: string) => {
    const s = size.toUpperCase();
    if (s.includes("S")) return Briefcase;
    if (s.includes("M")) return Backpack;
    if (s.includes("XXL")) return Package2;
    if (s.includes("L")) return Luggage;
    if (s.includes("XL")) return Package;
    return Package; // Default
  };

  return (
    <div className="bg-[#e6e6e7] dark:bg-zinc-900 px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:h-full lg:min-h-0 transition-colors duration-300">
      {/* Columna Izquierda: Tamaño y Registro del Cliente */}
      <div className="lg:col-span-5 flex flex-col gap-3 w-full">
        {/* TAMAÑO DEL EQUIPAJE */}
        <div>
          <div className="bg-[#242424] dark:bg-zinc-800 text-white py-1 px-4 text-xs font-bold uppercase tracking-wider mb-2">
            TAMAÑO DEL EQUIPAJE
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
            {sizesToShow.map((size) => {
              const Icon = getIconForSize(size.value);
              const isSelected = selectedSize === size.value;
              return (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => onSelectSize(size.value as LockerSize)}
                  className={`
                    relative flex flex-col items-center justify-between p-2.5 rounded-xl border-2 h-28 transition-all duration-250 cursor-pointer select-none
                    ${
                      isSelected
                        ? "bg-[#00c5ff] border-[#0089b3] text-white scale-[1.03] shadow-[0_4px_12px_rgba(0,197,255,0.3)] font-black"
                        : "bg-[#cef3ff]/30 hover:bg-[#cef3ff]/60 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border-[#1588b3]/50 dark:border-zinc-500 text-[#0a354c] dark:text-zinc-200 hover:scale-[1.01]"
                    }
                  `}
                >
                  <span className={`absolute top-2 right-3 text-xl font-black leading-none ${isSelected ? "text-white" : "text-zinc-900 dark:text-zinc-300"}`}>
                    {size.value}
                  </span>
                  <div className="flex-1 flex items-center justify-center mt-1">
                    <Icon className={`w-8 h-8 stroke-[1.5] ${isSelected ? "text-white" : "text-[#1588b3] dark:text-zinc-400"}`} />
                  </div>
                  <div className="flex flex-col items-center leading-tight">
                    <span className={`text-xs font-black ${isSelected ? "text-white" : "text-zinc-900 dark:text-zinc-100"}`}>
                      {formatCurrency(size.price)}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase mt-0.5 ${isSelected ? "text-white/90" : "text-zinc-500 dark:text-zinc-400"}`}>
                      Disp: {size.available}/{size.total}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="bg-[#242424] dark:bg-zinc-800 text-white py-1 px-4 text-xs font-bold uppercase tracking-wider mb-2">
            REGISTRO DEL CLIENTE
          </div>
          <input
            type="text"
            value={clientDocument}
            onChange={(e) => onChangeDocument(e.target.value)}
            placeholder="12.345.678-k"
            className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#00c5ff] font-semibold transition-colors"
          />
        </div>

        {/* Children (botón de registro) */}
        {children && (
          <div className="flex-1 flex flex-col justify-center items-center w-full min-h-0 py-2">
            {children}
          </div>
        )}
      </div>

      {/* Columna Derecha: Casilleros */}
      <div className="lg:col-span-7 flex flex-col gap-4 w-full lg:h-full lg:min-h-0">
        <div className="flex-1 flex flex-col min-h-0 lg:h-full">
          <div className="bg-[#242424] dark:bg-zinc-800 text-white py-1 px-4 text-xs font-bold uppercase tracking-wider mb-2">
            CASILLEROS
          </div>
          <LockerGrid
            lockers={lockers}
            selectedItems={selectedItems}
            onSelectLocker={onSelectLocker}
            selectedSize={selectedSize}
          />
        </div>
      </div>
    </div>
  );
}
