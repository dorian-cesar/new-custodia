"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/custody/header";
import { LockerSelection } from "@/components/custody/locker-selection";
import { ClientRegistration } from "@/components/custody/client-registration";
import { CashStatusBanner } from "@/components/custody/cash-status-banner";
import { useCustodyStore } from "@/lib/custody-store";
import { type LockerSize, type CustodyRecord } from "@/lib/types";
import { AlertCircle, Package, Luggage } from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";

export default function CustodyPage() {
  const router = useRouter();
  const {
    lockers,
    records,
    currentCashRegister,
    currentUser,
    deliverRecord,
    getCurrentRegisterStats,
  } = useCustodyStore();

  const [selectedItems, setSelectedItems] = useState<{ lockerId: number; size: LockerSize }[]>([]);
  const [selectedSize, setSelectedSize] = useState<LockerSize | null>(null);
  const [clientDocument, setClientDocument] = useState("");
  const [currentRecords, setCurrentRecords] = useState<CustodyRecord[]>([]);
  const [lastPrintedId, setLastPrintedId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [serviceMode, setServiceMode] = useState<"entrega" | "retiro">(
    "entrega",
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect supervisors to admin panel
  useEffect(() => {
    if (mounted && currentUser?.role === "supervisor") {
      router.replace("/admin");
    }
  }, [mounted, currentUser, router]);

  // Show toast alert for overdue lockers when page loads/mounts
  useEffect(() => {
    if (mounted && records.length > 0) {
      const now = Date.now();
      const count = records.filter((r) => {
        if (r.status !== "Activo") return false;
        const diffMs = now - new Date(r.entryTime).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours >= 24;
      }).length;

      if (count > 0) {
        Swal.fire({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 6000,
          timerProgressBar: true,
          icon: "warning",
          title: "Alerta de Equipaje Excedido",
          text: `Hay ${count} casillero${count > 1 ? "s" : ""} con más de 24 horas de custodia pendiente de cobro por recargo extra.`,
        });
      }
    }
  }, [mounted, records]);

  const isCashOpen = currentCashRegister?.status === "open";
  const stats = getCurrentRegisterStats();

  const handleGenerateBarcode = async (
    paymentMethod: string,
    authCode?: string | null,
    opNumber?: string | null,
    cardNumber?: string | null,
    cardBrand?: string | null,
    cardType?: string | null,
  ): Promise<CustodyRecord[] | null> => {
    if (selectedItems.length === 0 || !clientDocument.trim()) {
      return null;
    }

    const { createMultipleRecords } = useCustodyStore.getState();
    const created = await createMultipleRecords(
      selectedItems,
      clientDocument.trim(),
      paymentMethod,
      authCode,
      opNumber,
      cardNumber,
      cardBrand,
      cardType,
    );

    if (created && created.length > 0) {
      setCurrentRecords(created);
      // Retrasar la limpieza de los campos de entrada de la UI por 4 segundos.
      // Esto evita que el DOM del ticket se destruya o cambie antes de que
      // react-to-print termine de enviar las copias a la cola.
      setTimeout(() => {
        setSelectedItems([]);
        setSelectedSize(null);
        setClientDocument("");
      }, 4000);
    }
    return created;
  };

  const handleDeliver = async (
    code: string,
    extraCharge?: number,
    paymentMethod?: string,
    extraFolio?: number | null,
    authCode?: string | null,
    opNumber?: string | null,
    cardNumber?: string | null,
    cardBrand?: string | null,
    cardType?: string | null,
  ): Promise<boolean> => {
    const record = records.find(
      (r) => r.code === code && r.status === "Activo",
    );
    if (!record) return false;
    return await deliverRecord(
      record.id,
      extraCharge,
      paymentMethod,
      extraFolio,
      authCode,
      opNumber,
      cardNumber,
      cardBrand,
      cardType,
    );
  };

  const handleDeliverMultiple = async (
    recordIds: number[],
    extraCharge?: number,
    paymentMethod?: string,
    extraFolio?: number | null,
    authCode?: string | null,
    opNumber?: string | null,
    cardNumber?: string | null,
    cardBrand?: string | null,
    cardType?: string | null,
  ): Promise<boolean> => {
    const { deliverMultipleRecords } = useCustodyStore.getState();
    return await deliverMultipleRecords(
      recordIds,
      extraCharge,
      paymentMethod,
      extraFolio,
      authCode,
      opNumber,
      cardNumber,
      cardBrand,
      cardType,
    );
  };

  const handleSelectLocker = (lockerId: number) => {
    if (!selectedSize) return;
    setSelectedItems((prev) => {
      const exists = prev.find((item) => item.lockerId === lockerId);
      if (exists) {
        return prev.filter((item) => item.lockerId !== lockerId);
      } else {
        return [...prev, { lockerId, size: selectedSize }];
      }
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <div className="text-zinc-600 font-semibold">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center py-3 md:py-4 px-3 md:px-4 lg:overflow-hidden transition-colors duration-300">
      {/* Main Cashier Card */}
      <div className="w-full max-w-[720px] lg:max-w-[1330px] lg:h-[calc(100vh-32px)] bg-[#e6e6e7] dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 shadow-xl rounded-lg overflow-hidden flex flex-col pb-4 transition-colors duration-300">
        {/* Header inside Card */}
        <Header showHistory showCash />

        {/* Cash Status Bar */}
        <CashStatusBanner
          isOpen={isCashOpen}
          balance={stats.balance}
          totalSales={stats.totalSales}
          transactions={stats.totalTransactions}
        />

        {/* Inventory Stats Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700 transition-colors duration-300 text-xs">
          {/* General Stats */}
          <div className="flex items-center gap-3.5 w-full lg:w-auto justify-center lg:justify-start">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-[#00c5ff] uppercase tracking-wider">Libres:</span>
              <span className="text-sm font-black text-[#00c5ff]">{lockers.filter((l) => !l.isOccupied).length}</span>
            </div>
            <div className="h-3.5 w-px bg-zinc-300 dark:bg-zinc-700" />
            <div className="flex items-center gap-1.5">
              <Luggage className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">En Custodia:</span>
              <span className="text-sm font-black text-amber-500">{records.filter((r) => r.status === "Activo").length}</span>
            </div>
          </div>

          {/* Occupied by Size Grid */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center w-full lg:w-auto">
            <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mr-1">Ocupación por Medida:</span>
            {(["S", "M", "L", "XL", "XXL"] as const).map((size) => {
              const occupied = lockers.filter((l) => l.isOccupied && l.col.slice(1) === size).length;
              const total = lockers.filter((l) => l.col.slice(1) === size).length;
              
              return (
                <div 
                  key={size} 
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold select-none transition-all duration-200 ${
                    occupied > 0 
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-black shadow-[0_1px_4px_rgba(245,158,11,0.05)]" 
                      : "bg-zinc-100/50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
                  }`}
                  title={`${occupied} de ${total} casilleros ${size} ocupados`}
                >
                  <span className="opacity-75">{size}:</span>
                  <span>{occupied}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col gap-2.5 py-2.5 overflow-y-auto min-h-0">
          {/* Alerts inside Card */}
          {stats.balance >= 300000 && (
            <div className="w-full px-4 space-y-2.5">
              <div className="bg-amber-500/10 border-l-4 border-amber-500 p-3 rounded-r-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-amber-500/20 rounded-full">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-amber-700">
                      Límite de Caja Alcanzado
                    </h3>
                    <p className="text-[10px] text-amber-700/90 mt-0.5">
                      La caja ha alcanzado los $300.000. Por favor, realice un
                      retiro.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] border-amber-500/20 text-amber-700 hover:bg-amber-500/10"
                  onClick={() => router.push("/caja")}
                >
                  Ir a Caja
                </Button>
              </div>
            </div>
          )}
          {/* SERVICIO Section */}
          <div className="px-4">
            <div className="bg-[#242424] text-white py-1 px-4 text-xs font-bold uppercase tracking-wider mb-2">
              SERVICIO
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setServiceMode("entrega")}
                className={`py-3 text-lg font-black rounded-xl border border-zinc-400 transition-all duration-200 cursor-pointer ${
                  serviceMode === "entrega"
                    ? "bg-[#0a354c] text-white shadow-md"
                    : "bg-[#0a354c]/60 text-white/70 hover:bg-[#0a354c]/85 hover:scale-[1.01]"
                }`}
              >
                INGRESO
              </button>
              <button
                type="button"
                onClick={() => setServiceMode("retiro")}
                className={`py-3 text-lg font-black rounded-xl border border-zinc-400 transition-all duration-200 cursor-pointer ${
                  serviceMode === "retiro"
                    ? "bg-[#1588b3] text-white shadow-md"
                    : "bg-[#1588b3]/60 text-white/70 hover:bg-[#1588b3]/85 hover:scale-[1.01]"
                }`}
              >
                RETIRO
              </button>
            </div>
          </div>

          {/* Form based on serviceMode */}
          {serviceMode === "entrega" ? (
            <LockerSelection
              lockers={lockers}
              selectedItems={selectedItems}
              onSelectLocker={handleSelectLocker}
              selectedSize={selectedSize}
              onSelectSize={(size) => {
                setSelectedSize(size);
              }}
              clientDocument={clientDocument}
              onChangeDocument={setClientDocument}
            >
              <ClientRegistration
                selectedItems={selectedItems}
                clientDocument={clientDocument}
                onGenerateBarcode={handleGenerateBarcode}
                onDeliver={handleDeliver}
                onDeliverMultiple={handleDeliverMultiple}
                currentRecords={currentRecords}
                isCashOpen={isCashOpen}
                mode={serviceMode}
                lastPrintedId={lastPrintedId}
                setLastPrintedId={setLastPrintedId}
              />
            </LockerSelection>
          ) : (
            <ClientRegistration
              selectedItems={[]}
              clientDocument={clientDocument}
              onGenerateBarcode={async () => null}
              onDeliver={handleDeliver}
              onDeliverMultiple={handleDeliverMultiple}
              currentRecords={[]}
              isCashOpen={isCashOpen}
              mode={serviceMode}
              lastPrintedId={lastPrintedId}
              setLastPrintedId={setLastPrintedId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
