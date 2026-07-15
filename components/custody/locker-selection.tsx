"use client";

import { Briefcase, Backpack, Luggage, Package, Package2 } from "lucide-react";
import { LockerGrid } from "./locker-grid";
import { type Locker, type LockerSize } from "@/lib/types";
import { useCustodyStore } from "@/lib/custody-store";

interface LockerSelectionProps {
  lockers: Locker[];
  selectedLockerId: number | null;
  onSelectLocker: (lockerId: number) => void;
  selectedSize: LockerSize | null;
  onSelectSize: (size: LockerSize) => void;
  clientDocument: string;
  onChangeDocument: (document: string) => void;
  children?: React.ReactNode;
}

export function LockerSelection({
  lockers,
  selectedLockerId,
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
    S:   { label: "S Bolso Pequeño",    price: 2500 },
    M:   { label: "M Maleta Mediana",   price: 3500 },
    L:   { label: "L Maleta Grande",    price: 5000 },
    XL:  { label: "XL Equipaje Extra",  price: 6000 },
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
    S:   Briefcase,
    M:   Backpack,
    L:   Luggage,
    XL:  Package,
    XXL: Package2,
  };

  const row1 = sizesToShow.slice(0, 3); // S, M, L
  const row2 = sizesToShow.slice(3);    // XL, XXL

  return (
    <div className="bg-[#d7d7d8] px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:h-full lg:min-h-0">
      {/* Columna Izquierda: Tamaño y Registro del Cliente */}
      <div className="lg:col-span-5 flex flex-col gap-3 w-full">
        {/* TAMAÑO DEL EQUIPAJE */}
        <div>
          <div className="bg-[#242424] text-white py-1 px-4 text-xs font-bold uppercase tracking-wider mb-2">
            TAMAÑO DEL EQUIPAJE
          </div>

          {/* Fila 1: S, M, L */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {row1.map((size) => {
              const Icon = sizeIcons[size.value] ?? Luggage;
              const isSelected = selectedSize === size.value;
              return (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => onSelectSize(size.value as LockerSize)}
                  className={`
                    relative flex flex-col items-center justify-between p-3 rounded-xl border h-28 transition-all duration-250 cursor-pointer select-none
                    ${
                      isSelected
                        ? "bg-[#00c5ff] border-[#00b4eb] scale-[1.03] shadow-[0_4px_12px_rgba(0,197,255,0.3)]"
                        : "bg-[#cef3ff] hover:bg-[#bceeff] border-zinc-200 hover:scale-[1.01]"
                    }
                  `}
                >
                  <span className="absolute top-2 right-3 text-xl font-black text-zinc-900 leading-none">
                    {size.value}
                  </span>
                  <div className="flex-1 flex items-center justify-center mt-2">
                    <Icon className="w-9 h-9 text-zinc-900 stroke-[1.5]" />
                  </div>
                  <span className="text-sm font-black text-zinc-900 mt-1">
                    $ {size.price.toLocaleString("es-CL")}
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
                    relative flex flex-col items-center justify-between p-3 rounded-xl border h-28 transition-all duration-250 cursor-pointer select-none
                    ${
                      isSelected
                        ? "bg-[#00c5ff] border-[#00b4eb] scale-[1.03] shadow-[0_4px_12px_rgba(0,197,255,0.3)]"
                        : "bg-[#cef3ff] hover:bg-[#bceeff] border-zinc-200 hover:scale-[1.01]"
                    }
                  `}
                >
                  {/* Badge "Solo Sector B" para XXL */}
                  {size.isXXL && (
                    <span className="absolute top-1.5 left-2 text-[8px] font-extrabold bg-amber-400 text-amber-900 rounded px-1 py-0.5 uppercase tracking-wide leading-none">
                      Solo B
                    </span>
                  )}
                  <span className="absolute top-2 right-3 text-xl font-black text-zinc-900 leading-none">
                    {size.value}
                  </span>
                  <div className="flex-1 flex items-center justify-center mt-2">
                    <Icon className="w-9 h-9 text-zinc-900 stroke-[1.5]" />
                  </div>
                  <span className="text-sm font-black text-zinc-900 mt-1">
                    $ {size.price.toLocaleString("es-CL")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* REGISTRO DEL CLIENTE */}
        <div>
          <div className="bg-[#242424] text-white py-1 px-4 text-xs font-bold uppercase tracking-wider mb-2">
            REGISTRO DEL CLIENTE
          </div>
          <input
            type="text"
            value={clientDocument}
            onChange={(e) => onChangeDocument(e.target.value)}
            placeholder="12.345.678-k"
            className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#00c5ff] font-semibold"
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
          <div className="bg-[#242424] text-white py-1 px-4 text-xs font-bold uppercase tracking-wider mb-2">
            CASILLEROS
          </div>
          <LockerGrid
            lockers={lockers}
            selectedLockerId={selectedLockerId}
            onSelectLocker={onSelectLocker}
            selectedSize={selectedSize}
          />
        </div>
      </div>
    </div>
  );
}
