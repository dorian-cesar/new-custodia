"use client";

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

  // Orden fijo de tamaños
  const SIZE_ORDER: LockerSize[] = ["S", "M", "L", "XL", "XXL"];

  // Fallback de etiquetas si la BD no tiene el tamaño
  const DEFAULT_LABELS: Record<string, { label: string; price: number }> = {
    S: { label: "S Bolso Pequeño", price: 2500 },
    M: { label: "M Maleta Mediana", price: 3500 },
    L: { label: "L Maleta Grande", price: 5000 },
    XL: { label: "XL Equipaje Extra", price: 6000 },
    XXL: { label: "XXL Sacos / Fardos", price: 8000 },
  };

  const sizesToShow = SIZE_ORDER.map((val) => {
    const dbSize = lockerSizes.find((s) => s.value === val);
    return {
      value: val,
      label: dbSize ? dbSize.label : DEFAULT_LABELS[val].label,
      price: dbSize ? dbSize.price : DEFAULT_LABELS[val].price,
      isXXL: val === "XXL",
    };
  });

  // Íconos por tamaño
  const sizeIcons: Record<string, React.ElementType> = {
    S: Briefcase,
    M: Backpack,
    L: Luggage,
    XL: Package,
    XXL: Package2,
  };

  const row1 = sizesToShow.slice(0, 3); // S, M, L
  const row2 = sizesToShow.slice(3); // XL, XXL

  return (
    <div className="bg-[#e6e6e7] dark:bg-zinc-900 px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:h-full lg:min-h-0 transition-colors duration-300">
      {/* Columna Izquierda: Tamaño y Registro del Cliente */}
      <div className="lg:col-span-5 flex flex-col gap-3 w-full">
        {/* TAMAÑO DEL EQUIPAJE */}
        <div>
          <div className="bg-[#242424] dark:bg-zinc-800 text-white py-1 px-4 text-xs font-bold uppercase tracking-wider mb-2">
            TAMAÑO DEL EQUIPAJE
          </div>

          {/* Fila 1: S, M, L */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {row1.map((size) => {
              const Icon = sizeIcons[size.value] ?? Package;
              const isSelected = selectedSize === size.value;
              return (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => onSelectSize(size.value as LockerSize)}
                  className={`
                    relative flex flex-col items-center justify-between p-3 rounded-xl border-2 h-28 transition-all duration-250 cursor-pointer select-none
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
                  <div className="flex-1 flex items-center justify-center mt-2">
                    <Icon className={`w-9 h-9 stroke-[1.5] ${isSelected ? "text-white" : "text-[#1588b3] dark:text-zinc-400"}`} />
                  </div>
                  <span className={`text-sm font-black mt-1 ${isSelected ? "text-white" : "text-zinc-900 dark:text-zinc-100"}`}>
                    {formatCurrency(size.price)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Fila 2: XL, XXL centrados */}
          <div className="grid grid-cols-2 gap-2">
            {row2.map((size) => {
              const Icon = sizeIcons[size.value] ?? Package;
              const isSelected = selectedSize === size.value;
              return (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => onSelectSize(size.value as LockerSize)}
                  className={`
                    relative flex flex-col items-center justify-between p-3 rounded-xl border-2 h-28 transition-all duration-250 cursor-pointer select-none
                    ${
                      isSelected
                        ? "bg-[#00c5ff] border-[#0089b3] text-white scale-[1.03] shadow-[0_4px_12px_rgba(0,197,255,0.3)] font-black"
                        : "bg-[#cef3ff]/30 hover:bg-[#cef3ff]/60 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border-[#1588b3]/50 dark:border-zinc-500 text-[#0a354c] dark:text-zinc-200 hover:scale-[1.01]"
                    }
                  `}
                >
                  {/* Badge "Solo Sector B" para XXL */}
                  {size.isXXL && (
                    <span className="absolute top-1.5 left-2 text-[8px] font-extrabold bg-amber-400 text-amber-900 rounded px-1 py-0.5 uppercase tracking-wide leading-none">
                      Solo Sector B
                    </span>
                  )}
                  <span className={`absolute top-2 right-3 text-xl font-black leading-none ${isSelected ? "text-white" : "text-zinc-900 dark:text-zinc-300"}`}>
                    {size.value}
                  </span>
                  <div className="flex-1 flex items-center justify-center mt-2">
                    <Icon className={`w-9 h-9 stroke-[1.5] ${isSelected ? "text-white" : "text-[#1588b3] dark:text-zinc-400"}`} />
                  </div>
                  <span className={`text-sm font-black mt-1 ${isSelected ? "text-white" : "text-zinc-900 dark:text-zinc-100"}`}>
                    {formatCurrency(size.price)}
                  </span>
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
