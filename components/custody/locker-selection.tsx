"use client";

import { Briefcase, Backpack, Luggage } from "lucide-react";
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

  // Ensure S, M, L are always shown in that exact order, mapping to sorted database sizes if available
  const sortedDbSizes = [...lockerSizes].sort((a, b) => a.price - b.price);
  const sizeOrder: LockerSize[] = ["S", "M", "L"];
  const sizesToShow = sizeOrder.map((val, index) => {
    const dbSize = sortedDbSizes[index];
    return {
      uiLabel: val,
      value: dbSize ? dbSize.value : val,
      label: dbSize
        ? dbSize.label
        : val === "S"
          ? "S Bolso Pequeno"
          : val === "M"
            ? "M Maleta Mediana"
            : "L Maleta Grande",
      price: dbSize
        ? dbSize.price
        : val === "S"
          ? 2500
          : val === "M"
            ? 3500
            : 5000,
    };
  });

  return (
    <div className="bg-[#d7d7d8] px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch lg:h-full lg:min-h-0">
      {/* Columna Izquierda: Tamaño y Registro del Cliente */}
      <div className="lg:col-span-5 flex flex-col gap-4 w-full">
        {/* TAMAÑO DEL EQUIPAJE Section */}
        <div>
          <div className="bg-[#242424] text-white py-1 px-4 text-xs font-bold uppercase tracking-wider mb-3">
            TAMAÑO DEL EQUIPAJE
          </div>
          <div className="grid grid-cols-3 gap-3">
            {sizesToShow.map((size) => {
              let Icon = Luggage;

              if (size.uiLabel === "S") {
                Icon = Briefcase;
              } else if (size.uiLabel === "M") {
                Icon = Backpack;
              } else if (size.uiLabel === "L") {
                Icon = Luggage;
              }

              const isSelected = selectedSize === size.value;

              return (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => onSelectSize(size.value as LockerSize)}
                  className={`
                    relative flex flex-col items-center justify-between p-4 rounded-xl border border-zinc-300 h-36 transition-all duration-250 cursor-pointer select-none
                    ${
                      isSelected
                        ? "bg-[#00c5ff] border-[#00b4eb] scale-[1.03] shadow-[0_4px_12px_rgba(0,197,255,0.3)]"
                        : "bg-[#cef3ff] hover:bg-[#bceeff] border-zinc-200 hover:scale-[1.01]"
                    }
                  `}
                >
                  {/* Size Label in top right */}
                  <span className="absolute top-2 right-4 text-2xl font-black text-zinc-900 leading-none">
                    {size.uiLabel}
                  </span>

                  {/* Centered Icon */}
                  <div className="flex-1 flex items-center justify-center mt-3">
                    <Icon className="w-12 h-12 text-zinc-900 stroke-[1.5]" />
                  </div>

                  {/* Price at bottom */}
                  <span className="text-lg font-black text-zinc-900 mt-1">
                    $ {size.price.toLocaleString("es-CL")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* REGISTRO DEL CLIENTE Section */}
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

        {/* Nest children (ClientRegistration button) vertically centered in the remaining space */}
        {children && (
          <div className="flex-1 flex flex-col justify-center items-center w-full min-h-0 py-2">
            {children}
          </div>
        )}
      </div>

      {/* Columna Derecha: Casilleros */}
      <div className="lg:col-span-7 flex flex-col gap-4 w-full lg:h-full lg:min-h-0">
        {/* CASILLEROS Section */}
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
