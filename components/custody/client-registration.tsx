"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import { Ticket } from "./ticket";
import { DeliveryTicket } from "./delivery-ticket";
import { TransbankVoucher } from "./transbank-voucher";
import { printerService } from "@/lib/printer-service";
import {
  Barcode as BarcodeIcon,
  Hash,
  Key,
  AlertTriangle,
  Coins,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Barcode } from "./barcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type CustodyRecord, type LockerSize } from "@/lib/types";
import { useCustodyStore } from "@/lib/custody-store";
import { sendBoleta } from "@/app/actions/db-actions";
import { formatCurrency } from "@/lib/utils";

interface ClientRegistrationProps {
  selectedItems: { lockerId: number; size: LockerSize }[];
  clientDocument?: string;
  onGenerateBarcode: (
    paymentMethod: string,
    authCode?: string | null,
    opNumber?: string | null,
    cardNumber?: string | null,
    cardBrand?: string | null,
    cardType?: string | null,
  ) => Promise<CustodyRecord[] | null>;
  onDeliver: (
    code: string,
    extraCharge?: number,
    paymentMethod?: string,
    extraFolio?: number | null,
    authCode?: string | null,
    opNumber?: string | null,
    cardNumber?: string | null,
    cardBrand?: string | null,
    cardType?: string | null,
  ) => Promise<boolean>;
  onDeliverMultiple?: (
    recordIds: number[],
    extraCharge?: number,
    paymentMethod?: string,
    extraFolio?: number | null,
    authCode?: string | null,
    opNumber?: string | null,
    cardNumber?: string | null,
    cardBrand?: string | null,
    cardType?: string | null,
  ) => Promise<boolean>;
  currentRecords: CustodyRecord[];
  isCashOpen: boolean;
  mode?: "entrega" | "retiro";
  lastPrintedId: number | null;
  setLastPrintedId: (id: number | null) => void;
}

const showToast = (
  message: string,
  icon: "success" | "error" | "warning" | "info" = "warning",
) => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  }).fire({
    icon,
    title: message,
  });
};

export function ClientRegistration({
  selectedItems,
  clientDocument,
  onGenerateBarcode,
  onDeliver,
  onDeliverMultiple,
  currentRecords,
  isCashOpen,
  mode = "entrega",
  lastPrintedId,
  setLastPrintedId,
}: ClientRegistrationProps) {
  const [deliveryCode, setDeliveryCode] = useState("");
  const [deliveryError, setDeliveryError] = useState("");

  // Refs for printing
  const ticketRef = useRef<HTMLDivElement>(null);
  const deliveryTicketRef = useRef<HTMLDivElement>(null);
  const voucherRef = useRef<HTMLDivElement>(null);
  const nextPrintActionRef = useRef<(() => void) | null>(null);

  // Estado para la cola de impresión secuencial
  const [printQueue, setPrintQueue] = useState<CustodyRecord[]>([]);
  const [activePrintRecord, setActivePrintRecord] = useState<CustodyRecord | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // State for Entry Payment Modal
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryPaymentMethod, setEntryPaymentMethod] = useState<
    "Efectivo" | "Tarjeta"
  >("Efectivo");
  const [entryCashReceived, setEntryCashReceived] = useState<number>(0);

  // State for Extracharge Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [extraAmount, setExtraAmount] = useState(0);
  const [extraHours, setExtraHours] = useState(0);
  const [pendingDeliverRecords, setPendingDeliverRecords] = useState<CustodyRecord[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Tarjeta">(
    "Efectivo",
  );
  const [extraFolioState, setExtraFolioState] = useState<number | null>(null);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [exitAuthCode, setExitAuthCode] = useState<string | null>(null);
  const [exitOpNumber, setExitOpNumber] = useState<string | null>(null);

  // State for Multiple Records Selection Modal
  const [multiRecords, setMultiRecords] = useState<CustodyRecord[]>([]);
  const [selectedDeliverRecords, setSelectedDeliverRecords] = useState<CustodyRecord[]>([]);
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);

  // Sequential printing queue for exit tickets
  const [deliveryPrintQueue, setDeliveryPrintQueue] = useState<CustodyRecord[]>([]);
  const [activeDeliveryPrintRecord, setActiveDeliveryPrintRecord] = useState<CustodyRecord | null>(null);
  const [isDeliveryPrinting, setIsDeliveryPrinting] = useState(false);

  // Store selectors needed before memos
  const getActiveRecordsByInput = useCustodyStore(
    (state) => state.getActiveRecordsByInput,
  );
  const lockers = useCustodyStore((state) => state.lockers);
  const lockerSizes = useCustodyStore((state) => state.lockerSizes);

  // Memo for selected deliveries stats in the list modal
  const selectedDeliverStats = useMemo(() => {
    let totalExtraHours = 0;
    let totalExtraAmount = 0;
    const breakdowns: { record: CustodyRecord; extraH: number; amount: number; lockerDisplay: string }[] = [];

    selectedDeliverRecords.forEach((record) => {
      const diffMs = Date.now() - new Date(record.entryTime).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      let extraH = 0;
      let amount = 0;
      if (diffHours > 24) {
        extraH = diffHours - 24;
        amount = Math.ceil(extraH / 24) * record.price;
      }
      totalExtraHours += extraH;
      totalExtraAmount += amount;

      const locker = lockers.find((l) => l.id === record.lockerId);
      const lockerDisplay = locker ? `${locker.col}${locker.row}` : record.lockerId.toString();

      breakdowns.push({
        record,
        extraH,
        amount,
        lockerDisplay,
      });
    });

    return {
      totalExtraHours,
      totalExtraAmount,
      breakdowns,
    };
  }, [selectedDeliverRecords, lockers]);

  const [voucherData, setVoucherData] = useState<{
    amount: number;
    ticketNumber: string;
    authorizationCode: string;
    operationNumber: string;
    cardNumber?: string | null;
    cardBrand?: string | null;
    cardType?: string | null;
    timestamp?: string | null;
  } | null>(null);

  // Guardar referencias de los timeouts para que los re-renders no los limpien,
  // pero sí se limpien al desmontar el componente.
  const printTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      printTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: "Ticket_Custodia",
    suppressErrors: true,
    onAfterPrint: () => {
      if (nextPrintActionRef.current) {
        const nextAction = nextPrintActionRef.current;
        nextPrintActionRef.current = null;
        setTimeout(nextAction, 500);
      }
    },
  });

  const handlePrintCopy = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: "Ticket_Custodia_Copia",
    suppressErrors: true,
    onAfterPrint: () => {
      if (nextPrintActionRef.current) {
        const nextAction = nextPrintActionRef.current;
        nextPrintActionRef.current = null;
        setTimeout(nextAction, 500);
      }
    },
  });

  // Queue controller for Delivery/Exit Tickets
  useEffect(() => {
    if (deliveryPrintQueue.length > 0 && !activeDeliveryPrintRecord && !isDeliveryPrinting) {
      const nextRecord = deliveryPrintQueue[0];
      setDeliveryPrintQueue((prev) => prev.slice(1));
      setActiveDeliveryPrintRecord(nextRecord);
      setIsDeliveryPrinting(true);
    }
  }, [deliveryPrintQueue, activeDeliveryPrintRecord, isDeliveryPrinting]);

  const handlePrintDelivery = useReactToPrint({
    contentRef: deliveryTicketRef,
    documentTitle: "Ticket_Retiro",
    suppressErrors: true,
    onAfterPrint: () => {
      setActiveDeliveryPrintRecord(null);
      setIsDeliveryPrinting(false);
    },
    onPrintError: () => {
      setActiveDeliveryPrintRecord(null);
      setIsDeliveryPrinting(false);
    }
  });

  useEffect(() => {
    if (activeDeliveryPrintRecord && isDeliveryPrinting) {
      const runPrint = async () => {
        if (printerService.isNative()) {
          const sizeLabel = lockerSizes.find((s) => s.value === activeDeliveryPrintRecord.size)?.label || activeDeliveryPrintRecord.size;
          const locker = lockers.find((l) => l.id === activeDeliveryPrintRecord.lockerId);
          const lockerDisplay = locker ? `${locker.col}${locker.row}` : activeDeliveryPrintRecord.lockerId.toString();

          const diffMs = Date.now() - new Date(activeDeliveryPrintRecord.entryTime).getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          let recordExtraHours = 0;
          let recordExtraAmount = 0;
          if (diffHours > 24) {
            recordExtraHours = diffHours - 24;
            recordExtraAmount = Math.ceil(recordExtraHours / 24) * activeDeliveryPrintRecord.price;
          }

          await printerService.printDeliveryTicket(
            activeDeliveryPrintRecord,
            sizeLabel,
            lockerDisplay,
            paymentMethod,
            recordExtraHours,
            recordExtraAmount,
            extraFolioState
          );
          
          if (paymentMethod === "Tarjeta" && voucherData) {
            await (printerService as any).printTransbankVoucher(voucherData);
            setVoucherData(null);
          }

          setActiveDeliveryPrintRecord(null);
          setIsDeliveryPrinting(false);
        } else {
          const timer = setTimeout(() => {
            handlePrintDelivery();
          }, 300);
          printTimersRef.current.push(timer);
        }
      };
      runPrint();
    }
  }, [activeDeliveryPrintRecord, isDeliveryPrinting, lockers, lockerSizes, paymentMethod, extraFolioState, handlePrintDelivery]);

  const handlePrintVoucher = useReactToPrint({
    contentRef: voucherRef,
    documentTitle: "Voucher_Transbank",
    suppressErrors: true,
    onAfterPrint: () => {
      if (nextPrintActionRef.current) {
        const nextAction = nextPrintActionRef.current;
        nextPrintActionRef.current = null;
        setTimeout(nextAction, 500);
      }
    },
  });


  // Calcular precios acumulados del carrito
  const itemsWithPrice = selectedItems.map((item) => {
    const sizeOption = lockerSizes.find((s) => s.value === item.size);
    const price = sizeOption ? sizeOption.price : 0;
    const label = sizeOption ? sizeOption.label : item.size;
    const l = lockers.find((lock) => lock.id === item.lockerId);
    const position = l ? `${l.col}${l.row}` : item.lockerId.toString();
    return { ...item, price, label, position };
  });

  const totalPrice = itemsWithPrice.reduce((sum, item) => sum + item.price, 0);

  // Reset cashReceived when modal or pending records change
  useEffect(() => {
    setCashReceived(0);
  }, [pendingDeliverRecords, isModalOpen]);

  useEffect(() => {
    if (currentRecords.length > 0 && currentRecords[0].id !== lastPrintedId) {
      console.log("ClientRegistration: Adding currentRecords to printQueue", currentRecords);
      setPrintQueue((prev) => [...prev, ...currentRecords]);
      setLastPrintedId(currentRecords[0].id);
      showToast("Custodias registradas con éxito", "success");
    }
  }, [currentRecords, lastPrintedId, setLastPrintedId]);

  useEffect(() => {
    if (printQueue.length > 0 && !isPrinting) {
      console.log("ClientRegistration: Setting activePrintRecord to", printQueue[0]);
      setIsPrinting(true);
      const nextRecord = printQueue[0];
      setActivePrintRecord(nextRecord);
    }
  }, [printQueue, isPrinting]);

  useEffect(() => {
    if (activePrintRecord && isPrinting) {
      console.log("ClientRegistration: Triggering printing effect for activePrintRecord", activePrintRecord, "isNative:", printerService.isNative());
      if (printerService.isNative()) {
        const sizeLabel =
          lockerSizes.find((s) => s.value === activePrintRecord.size)?.label ||
          activePrintRecord.size;
        const locker = lockers.find((l) => l.id === activePrintRecord.lockerId);
        const lockerDisplay = locker
          ? `${locker.col}${locker.row}`
          : activePrintRecord.lockerId.toString();
        const printNativeTicket = async () => {
          console.log("ClientRegistration: printNativeTicket starting...");
          // Imprimir copia cliente
          const ok1 = await printerService.printEntryTicket(
            activePrintRecord,
            sizeLabel,
            lockerDisplay,
            entryPaymentMethod,
          );
          console.log("ClientRegistration: printEntryTicket client copy finished, success:", ok1);
          // Imprimir copia local
          const ok2 = await printerService.printEntryTicket(
            activePrintRecord,
            sizeLabel,
            lockerDisplay,
            entryPaymentMethod,
          );
          console.log("ClientRegistration: printEntryTicket local copy finished, success:", ok2);

          if (entryPaymentMethod === "Tarjeta" && voucherData) {
            await (printerService as any).printTransbankVoucher(voucherData);
            setVoucherData(null);
          }

          setPrintQueue((prev) => prev.slice(1));
          setIsPrinting(false);
          setActivePrintRecord(null);
        };
        printNativeTicket();
      } else {
        printTimersRef.current.forEach(clearTimeout);
        printTimersRef.current = [];

        const t1 = setTimeout(() => {
          let printVoucherAction: (() => void) | null = null;
          if (entryPaymentMethod === "Tarjeta" && voucherData) {
            printVoucherAction = () => {
              nextPrintActionRef.current = () => {
                setVoucherData(null);
                setPrintQueue((prev) => prev.slice(1));
                setIsPrinting(false);
                setActivePrintRecord(null);
              };
              handlePrintVoucher();
            };
          } else {
            printVoucherAction = () => {
              setPrintQueue((prev) => prev.slice(1));
              setIsPrinting(false);
              setActivePrintRecord(null);
            };
          }

          const printCopyAction = () => {
            nextPrintActionRef.current = printVoucherAction;
            handlePrintCopy();
          };

          nextPrintActionRef.current = printCopyAction;
          handlePrint();
        }, 800);
        printTimersRef.current.push(t1);
      }
    }
  }, [
    activePrintRecord,
    isPrinting,
    entryPaymentMethod,
    voucherData,
    lockers,
    lockerSizes,
    handlePrint,
    handlePrintCopy,
    handlePrintVoucher,
  ]);

  const handleGenerateBarcode = () => {
    if (!isCashOpen) {
      showToast(
        "Debes abrir la caja antes de poder realizar cobros.",
        "warning",
      );
      return;
    }
    if (selectedItems.length === 0 || !clientDocument?.trim()) {
      showToast(
        "Por favor, seleccione al menos un casillero y escriba el RUT del cliente antes de cobrar.",
        "warning",
      );
      return;
    }
    setEntryPaymentMethod("Efectivo");
    setEntryCashReceived(0);
    setIsEntryModalOpen(true);
  };

  const confirmEntryPayment = async () => {
    if (entryPaymentMethod === "Efectivo") {
      if (!entryCashReceived) {
        showToast(
          "Por favor ingrese el monto de efectivo recibido para poder calcular el vuelto.",
          "warning",
        );
        return;
      }
      if (entryCashReceived < totalPrice) {
        showToast("El efectivo recibido es menor al monto a cobrar.", "error");
        return;
      }
      setIsEntryModalOpen(false);
      await onGenerateBarcode(entryPaymentMethod);
    } else if (entryPaymentMethod === "Tarjeta") {
      // Direct payment confirmation without POS terminal
      setVoucherData({
        amount: totalPrice,
        ticketNumber: clientDocument || "0",
        authorizationCode: "MANUAL",
        operationNumber: "0000",
        cardNumber: "xxxx-xxxx-xxxx-xxxx",
        cardBrand: "Tarjeta",
        cardType: "Manual",
        timestamp: new Date().toISOString(),
      });
      // Cerrar el modal de pago
      setIsEntryModalOpen(false);
      // Luego crear el registro, lo cual gatillará el useEffect de impresión
      await onGenerateBarcode(
        "Tarjeta",
        "MANUAL",
        "0000",
        "xxxx-xxxx-xxxx-xxxx",
        "Tarjeta",
        "Manual",
      );
    }
  };



  const processDelivery = (recordsToDeliver: CustodyRecord[]) => {
    let totalExtraH = 0;
    let totalAmount = 0;

    recordsToDeliver.forEach((record) => {
      const diffMs = Date.now() - new Date(record.entryTime).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours > 24) {
        const extraH = diffHours - 24;
        totalExtraH += extraH;
        totalAmount += Math.ceil(extraH / 24) * record.price;
      }
    });

    setExtraHours(totalExtraH);
    setExtraAmount(totalAmount);
    setPaymentMethod("Efectivo");
    setPendingDeliverRecords(recordsToDeliver);
    setCashReceived(0);
    setIsModalOpen(true);
  };

  const handleDeliverClick = () => {
    setDeliveryError("");
    if (!deliveryCode.trim()) {
      setDeliveryError("Ingrese el código de custodia o RUT del cliente");
      return;
    }

    const input = deliveryCode.trim();
    const records = getActiveRecordsByInput(input);

    if (records.length === 0) {
      setDeliveryError("Código o RUT no encontrado, o custodia ya entregada");
      return;
    }

    if (records.length === 1) {
      processDelivery([records[0]]);
    } else {
      setMultiRecords(records);
      setSelectedDeliverRecords(records); // Pre-seleccionar todos
      setIsMultiModalOpen(true);
    }
  };

  const confirmDelivery = async (
    codes: string[],
    extraCharge: number,
    method: "Efectivo" | "Tarjeta",
  ) => {
    if (method === "Efectivo" && extraCharge > 0) {
      if (!cashReceived) {
        showToast(
          "Por favor ingrese el monto de efectivo recibido para poder calcular el vuelto.",
          "warning",
        );
        return;
      }
      if (cashReceived < extraCharge) {
        showToast(
          "El efectivo recibido es menor al recargo a cobrar.",
          "error",
        );
        return;
      }
    }

    let extraFolio: number | null = null;
    let authCodeVal: string | null = null;
    let opNumberVal: string | null = null;
    let cardNumberVal: string | null = null;
    let cardBrandVal: string | null = null;
    let cardTypeVal: string | null = null;

    if (method === "Tarjeta" && extraCharge > 0) {
      // Direct payment confirmation without POS terminal
      authCodeVal = "MANUAL";
      opNumberVal = "0000";
      cardNumberVal = "xxxx-xxxx-xxxx-xxxx";
      cardBrandVal = "Tarjeta";
      cardTypeVal = "Manual";
      setExitAuthCode(authCodeVal);
      setExitOpNumber(opNumberVal);
      setVoucherData({
        amount: extraCharge,
        ticketNumber: codes[0] || "",
        authorizationCode: authCodeVal || "",
        operationNumber: opNumberVal || "",
        cardNumber: cardNumberVal,
        cardBrand: cardBrandVal,
        cardType: cardTypeVal,
        timestamp: new Date().toISOString(),
      });
    }

    if (method === "Efectivo" && extraCharge > 0) {
      try {
        const boletaRes = await sendBoleta("Recargo Custodia", extraCharge);
        if (boletaRes.success && boletaRes.data) {
          extraFolio = boletaRes.data.folio;
        }
      } catch (err) {
        console.error("Error al emitir boleta de recargo:", err);
      }
    }

    setExtraFolioState(extraFolio);
    
    // Add all pendingDeliverRecords to print queue
    setDeliveryPrintQueue(pendingDeliverRecords);

    setTimeout(async () => {
      let success = false;
      if (pendingDeliverRecords.length === 1) {
        success = await onDeliver(
          pendingDeliverRecords[0].code,
          extraCharge,
          method,
          extraFolio,
          authCodeVal,
          opNumberVal,
          cardNumberVal,
          cardBrandVal,
          cardTypeVal,
        );
      } else if (onDeliverMultiple) {
        success = await onDeliverMultiple(
          pendingDeliverRecords.map(r => r.id),
          extraCharge,
          method,
          extraFolio,
          authCodeVal,
          opNumberVal,
          cardNumberVal,
          cardBrandVal,
          cardTypeVal,
        );
      }

      if (success) {
        showToast("Entrega procesada con éxito", "success");
        setDeliveryCode("");
        setIsModalOpen(false);
        setIsMultiModalOpen(false);
        setTimeout(() => {
          setPendingDeliverRecords([]);
          setExtraFolioState(null);
        }, 2000);
      } else {
        setDeliveryError("Error procesando la entrega");
      }
    }, 500);
  };

  return (
    <div className={mode === "entrega" ? "w-full" : "bg-[#d7d7d8] px-4 pb-4"}>
      {/* Hidden print areas - always in DOM for react-to-print */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: 0, pointerEvents: "none" }}>
        <Ticket
          ref={ticketRef}
          record={activePrintRecord}
          paymentMethod={entryPaymentMethod}
        />
        <DeliveryTicket
          ref={deliveryTicketRef}
          record={activeDeliveryPrintRecord}
          extraHours={
            activeDeliveryPrintRecord
              ? (() => {
                  const diffMs = Date.now() - new Date(activeDeliveryPrintRecord.entryTime).getTime();
                  const diffHours = diffMs / (1000 * 60 * 60);
                  return diffHours > 24 ? diffHours - 24 : 0;
                })()
              : 0
          }
          extraAmount={
            activeDeliveryPrintRecord
              ? (() => {
                  const diffMs = Date.now() - new Date(activeDeliveryPrintRecord.entryTime).getTime();
                  const diffHours = diffMs / (1000 * 60 * 60);
                  return diffHours > 24
                    ? Math.ceil((diffHours - 24) / 24) * activeDeliveryPrintRecord.price
                    : 0;
                })()
              : 0
          }
          paymentMethod={paymentMethod}
          extraFolio={extraFolioState}
          authCode={exitAuthCode}
          opNumber={exitOpNumber}
        />
        <TransbankVoucher
          ref={voucherRef}
          data={voucherData}
        />
      </div>

      {mode === "entrega" ? (
        <div className="w-full flex flex-col items-center">
          {/* TABLITA DE RESUMEN DE SELECCIÓN */}
          {selectedItems.length > 0 && (
            <div className="w-full max-w-[320px] mb-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 shadow-sm space-y-2 select-none">
              <div className="text-[10px] font-black text-[#0a354c] dark:text-[#00c5ff] uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700 pb-1 flex justify-between">
                <span>Resumen de Selección</span>
                <span>{selectedItems.length} Bulto(s)</span>
              </div>
              <div className="max-h-[140px] overflow-y-auto">
                <table className="w-full text-left text-[11px] text-zinc-700 dark:text-zinc-300">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-400 font-bold uppercase text-[9px]">
                      <th className="py-1">Posición</th>
                      <th className="py-1">Medida</th>
                      <th className="py-1 text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700 font-semibold">
                    {itemsWithPrice.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 font-mono text-[#1588b3] dark:text-[#00c5ff]">{item.position}</td>
                        <td className="py-1.5">{item.label}</td>
                        <td className="py-1.5 text-right text-zinc-800 dark:text-zinc-100">{formatCurrency(item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-zinc-300 dark:border-zinc-700 font-black text-sm text-[#0a354c] dark:text-[#00c5ff]">
                <span>Total:</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerateBarcode}
            disabled={!isCashOpen}
            className="w-full max-w-[320px] bg-[#242424] dark:bg-zinc-800 hover:bg-[#323232] dark:hover:bg-zinc-700 disabled:bg-zinc-500 disabled:cursor-not-allowed text-white text-md font-black py-2.5 px-6 rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md select-none mt-1 text-center"
          >
            GENERAR CÓDIGO
          </button>
          {!isCashOpen && (
            <p className="text-[10px] font-semibold text-destructive text-center mt-1 animate-pulse">
              Debe abrir la caja para registrar custodias
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-w-md mx-auto w-full mt-2">
          <div>
            <div className="bg-[#242424] dark:bg-zinc-800 text-white py-1 px-4 text-xs font-bold uppercase tracking-wider mb-2">
              REGISTRO DEL CLIENTE
            </div>
            <input
              type="text"
              value={deliveryCode}
              onChange={(e) => setDeliveryCode(e.target.value)}
              placeholder="Código de barras o RUT / DNI del cliente"
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#00c5ff] font-semibold transition-colors"
            />
            {deliveryError && (
              <p className="text-xs font-semibold text-destructive mt-1.5">
                {deliveryError}
              </p>
            )}
          </div>
          <div className="w-full flex flex-col items-center">
            <button
              type="button"
              onClick={handleDeliverClick}
              disabled={!isCashOpen}
              className="w-full bg-[#242424] dark:bg-zinc-800 hover:bg-[#323232] dark:hover:bg-zinc-700 disabled:bg-zinc-500 disabled:cursor-not-allowed text-white text-md font-black py-2.5 px-6 rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md select-none mt-1 text-center"
            >
              BUSCAR Y RETIRAR
            </button>
            {!isCashOpen && (
              <p className="text-[10px] font-semibold text-destructive text-center mt-1 animate-pulse">
                Debe abrir la caja para retirar custodias
              </p>
            )}
          </div>
        </div>
      )}

      <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#e6e6e7] dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-0 overflow-hidden text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
          <DialogHeader className="bg-[#242424] dark:bg-zinc-850 text-white py-3 px-6 flex items-center justify-between space-y-0">
            <DialogTitle className="text-lg font-bold tracking-wide flex items-center gap-2 text-white">
              <Coins className="h-5 w-5 text-[#00c5ff]" />
              PAGO DE CUSTODIA
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 flex flex-col gap-4">
            <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-4 rounded-lg space-y-3 text-sm">
              <div className="flex justify-between font-semibold text-zinc-700 dark:text-zinc-300 pb-1.5 border-b border-zinc-100 dark:border-zinc-700">
                <span>Cliente:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  {clientDocument}
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-zinc-400">Desglose de Casilleros:</span>
                <table className="w-full text-left text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-400 font-bold uppercase text-[9px]">
                      <th className="pb-1">Casillero</th>
                      <th className="pb-1">Tamaño</th>
                      <th className="pb-1 text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700 font-semibold">
                    {itemsWithPrice.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 font-mono text-[#1588b3] dark:text-[#00c5ff]">{item.position}</td>
                        <td className="py-2">{item.label}</td>
                        <td className="py-2 text-right text-zinc-800 dark:text-zinc-100">{formatCurrency(item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-4 rounded-lg select-none">
              <span className="font-bold text-zinc-850 dark:text-zinc-200 text-lg">
                Total a cobrar:
              </span>
              <span className="font-black text-2xl text-[#0a354c] dark:text-[#00c5ff]">
                {formatCurrency(totalPrice)}
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Medio de Pago
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className={`flex items-center justify-center gap-2 h-12 text-sm font-bold rounded-xl border border-zinc-400 dark:border-zinc-700 transition-all cursor-pointer ${
                    entryPaymentMethod === "Efectivo"
                      ? "bg-[#0a354c] dark:bg-[#00c5ff] text-white dark:text-zinc-900 shadow-md font-black"
                      : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                  onClick={() => setEntryPaymentMethod("Efectivo")}
                >
                  <Coins className="h-5 w-5" />
                  Efectivo
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center gap-2 h-12 text-sm font-bold rounded-xl border border-zinc-400 dark:border-zinc-700 transition-all cursor-pointer ${
                    entryPaymentMethod === "Tarjeta"
                      ? "bg-[#1588b3] dark:bg-zinc-700 text-white shadow-md font-black"
                      : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                  onClick={() => setEntryPaymentMethod("Tarjeta")}
                >
                  <CreditCard className="h-5 w-5" />
                  Tarjeta
                </button>
              </div>

              {entryPaymentMethod === "Efectivo" && totalPrice > 0 && (
                <div className="space-y-2 mt-3 p-3 bg-white border border-zinc-300 rounded-lg animate-in fade-in slide-in-from-top-1">
                  <Label
                    htmlFor="entryCashReceived"
                    className="text-[10px] font-bold uppercase tracking-wider text-zinc-600"
                  >
                    Efectivo Recibido
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-zinc-500 text-[10px] font-bold">
                      Gs.
                    </span>
                    <input
                      id="entryCashReceived"
                      type="text"
                      inputMode="numeric"
                      value={
                        entryCashReceived === 0
                          ? ""
                          : entryCashReceived.toLocaleString("es-PY")
                      }
                      onChange={(e) => {
                        const val = Number(e.target.value.replace(/\D/g, ""));
                        setEntryCashReceived(val);
                      }}
                      placeholder="Monto entregado por el cliente"
                      className="pl-10 bg-white border border-zinc-300 rounded-md w-full h-9 text-sm font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#00c5ff]"
                    />
                  </div>
                  {entryCashReceived > 0 && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-zinc-300 text-xs font-semibold">
                      <span className="text-zinc-500">Vuelto a entregar:</span>
                      <span
                        className={`text-sm font-bold ${entryCashReceived - totalPrice >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {entryCashReceived - totalPrice >= 0
                          ? formatCurrency(entryCashReceived - totalPrice)
                          : "Monto insuficiente"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-zinc-200 dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-800 flex justify-end gap-3 transition-colors duration-300">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm cursor-pointer select-none transition-colors"
              onClick={() => setIsEntryModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-[#242424] hover:bg-[#323232] disabled:bg-zinc-500 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wide cursor-pointer select-none"
              onClick={confirmEntryPayment}
              disabled={isProcessingCard}
            >
              {isProcessingCard ? "Esperando POS..." : "Confirmar Pago"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery Confirmation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden">
          <DialogHeader className="bg-[#242424] text-white py-3 px-6 flex items-center justify-between space-y-0">
            <DialogTitle className="text-lg font-bold tracking-wide flex items-center gap-2 text-white">
              {extraAmount > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
                  RECARGO POR EXCESO DE TIEMPO
                </>
              ) : (
                <>
                  <Key className="h-5 w-5 text-[#00c5ff]" />
                  CONFIRMAR ENTREGA
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 flex flex-col gap-4 text-zinc-900 dark:text-zinc-100">
            {pendingDeliverRecords.length === 1 &&
              (() => {
                const record = pendingDeliverRecords[0];
                const pLocker = lockers.find(
                  (l) => l.id === record.lockerId,
                );
                return (
                  <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-4 rounded-lg space-y-2 text-sm text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                    <div className="flex justify-between font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>Código:</span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100">
                        {record.code}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>Casillero:</span>
                      <span className="text-zinc-900 dark:text-zinc-100">
                        {pLocker
                          ? `${pLocker.col}${pLocker.row}`
                          : record.lockerId}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>Tamaño:</span>
                      <span className="text-zinc-900 dark:text-zinc-100">
                        {record.size}
                      </span>
                    </div>
                  </div>
                );
              })()}

            {pendingDeliverRecords.length > 1 && (
              <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-4 rounded-lg space-y-2 text-sm text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                <div className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 mb-1">
                  Casilleros a Retirar ({pendingDeliverRecords.length} bultos)
                </div>
                <div className="max-h-[140px] overflow-y-auto">
                  <table className="w-full text-left text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-400 font-bold uppercase text-[9px]">
                        <th className="pb-1">Código</th>
                        <th className="pb-1">Casillero</th>
                        <th className="pb-1 text-right">Medida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700 font-medium">
                      {pendingDeliverRecords.map((r, idx) => {
                        const pLocker = lockers.find((l) => l.id === r.lockerId);
                        return (
                          <tr key={idx} className="text-zinc-800 dark:text-zinc-200">
                            <td className="py-2 font-mono text-[11px]">{r.code}</td>
                            <td className="py-2 text-[#1588b3] dark:text-[#00c5ff]">
                              {pLocker ? `${pLocker.col}${pLocker.row}` : r.lockerId}
                            </td>
                            <td className="py-2 text-right">{r.size}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {extraAmount > 0 ? (
              <>
                <div className="flex justify-between items-center text-sm px-1 font-semibold text-zinc-700 dark:text-zinc-300">
                  <span>Horas adicionales:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {extraHours.toFixed(2)} hrs (total)
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 p-4 rounded-lg select-none">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 text-lg">
                    Total extra a cobrar:
                  </span>
                  <span className="font-black text-2xl text-rose-600 dark:text-rose-500">
                    {formatCurrency(extraAmount)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col justify-center items-center p-4 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 select-none">
                <span className="text-zinc-500 dark:text-zinc-400 font-bold text-sm">
                  Sin recargos adicionales
                </span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Medio de Pago
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className={`flex items-center justify-center gap-2 h-12 text-sm font-bold rounded-xl border border-zinc-400 dark:border-zinc-700 transition-all cursor-pointer ${
                    paymentMethod === "Efectivo"
                      ? "bg-[#0a354c] dark:bg-[#00c5ff] text-white dark:text-zinc-900 shadow-md font-black"
                      : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                  onClick={() => setPaymentMethod("Efectivo")}
                >
                  <Coins className="h-5 w-5" />
                  Efectivo
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center gap-2 h-12 text-sm font-bold rounded-xl border border-zinc-400 dark:border-zinc-700 transition-all cursor-pointer ${
                    paymentMethod === "Tarjeta"
                      ? "bg-[#1588b3] dark:bg-zinc-700 text-white shadow-md font-black"
                      : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                  onClick={() => setPaymentMethod("Tarjeta")}
                >
                  <CreditCard className="h-5 w-5" />
                  Tarjeta
                </button>
              </div>

                {paymentMethod === "Efectivo" && extraAmount > 0 && (
                  <div className="space-y-2 mt-3 p-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg animate-in fade-in slide-in-from-top-1">
                    <Label
                      htmlFor="cashReceived"
                      className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
                    >
                      Efectivo Recibido
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-zinc-500 text-[10px] font-bold">
                        Gs.
                      </span>
                      <input
                        id="cashReceived"
                        type="text"
                        inputMode="numeric"
                        value={
                          cashReceived === 0
                            ? ""
                            : cashReceived.toLocaleString("es-PY")
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value.replace(/\D/g, ""));
                          setCashReceived(val);
                        }}
                        placeholder="Monto entregado por el cliente"
                        className="pl-10 bg-white dark:bg-zinc-850 border border-zinc-300 dark:border-zinc-700 rounded-md w-full h-9 text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#00c5ff]"
                      />
                    </div>
                    {cashReceived > 0 && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-zinc-300 text-xs font-semibold">
                        <span className="text-zinc-500">
                          Vuelto a entregar:
                        </span>
                        <span
                          className={`text-sm font-bold ${cashReceived - extraAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          {cashReceived - extraAmount >= 0
                            ? formatCurrency(cashReceived - extraAmount)
                            : "Monto insuficiente"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
          </div>

          <div className="px-6 py-4 bg-zinc-200 dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-800 flex justify-end gap-3 transition-colors duration-300">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm cursor-pointer select-none transition-colors"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-[#242424] dark:bg-zinc-800 hover:bg-[#323232] dark:hover:bg-zinc-700 disabled:bg-zinc-500 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wide cursor-pointer select-none"
              onClick={() =>
                pendingDeliverRecords.length > 0 &&
                confirmDelivery(pendingDeliverRecords.map(r => r.code), extraAmount, paymentMethod)
              }
              disabled={isProcessingCard}
            >
              {isProcessingCard
                ? "Esperando POS..."
                : extraAmount > 0
                  ? "Confirmar Pago"
                  : "Entregar Maleta"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isMultiModalOpen} onOpenChange={setIsMultiModalOpen}>
        <DialogContent className="bg-card dark:bg-zinc-900 border-border dark:border-zinc-800 sm:max-w-[850px] w-[95vw] text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Hash className="h-5 w-5 text-[#00c5ff]" />
              Múltiples Casilleros Activos
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              El cliente tiene varios casilleros activos. Seleccione los que desea retirar:
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground dark:text-zinc-400 uppercase bg-secondary/20 dark:bg-zinc-800">
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="px-4 py-2 text-center w-12">
                    <input
                      type="checkbox"
                      checked={selectedDeliverRecords.length === multiRecords.length && multiRecords.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDeliverRecords(multiRecords);
                        } else {
                          setSelectedDeliverRecords([]);
                        }
                      }}
                      className="rounded border-zinc-300 dark:border-zinc-750 text-[#00c5ff] focus:ring-[#00c5ff] cursor-pointer w-4 h-4"
                    />
                  </th>
                  <th className="px-4 py-2">Código</th>
                  <th className="px-4 py-2">Casillero</th>
                  <th className="px-4 py-2">Tamaño</th>
                  <th className="px-4 py-2">Entrada</th>
                  <th className="px-4 py-2 text-right">Transcurrido</th>
                  <th className="px-4 py-2 text-right">Recargo</th>
                </tr>
              </thead>
              <tbody>
                {multiRecords.map((r) => {
                  const locker = lockers.find((l) => l.id === r.lockerId);
                  const isChecked = selectedDeliverRecords.some((selected) => selected.id === r.id);
                  
                  // Calculate elapsed time and extra charge
                  const diffMs = Date.now() - new Date(r.entryTime).getTime();
                  const diffHours = diffMs / (1000 * 60 * 60);
                  let charge = 0;
                  if (diffHours > 24) {
                    charge = Math.ceil((diffHours - 24) / 24) * r.price;
                  }

                  return (
                    <tr key={r.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDeliverRecords([...selectedDeliverRecords, r]);
                            } else {
                              setSelectedDeliverRecords(selectedDeliverRecords.filter((selected) => selected.id !== r.id));
                            }
                          }}
                          className="rounded border-zinc-300 dark:border-zinc-750 text-[#00c5ff] focus:ring-[#00c5ff] cursor-pointer w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                      <td className="px-4 py-3 font-semibold text-[#1588b3] dark:text-[#00c5ff]">
                        {locker ? `${locker.col}${locker.row}` : r.lockerId}
                      </td>
                      <td className="px-4 py-3 font-bold">{r.size}</td>
                      <td className="px-4 py-3 text-muted-foreground dark:text-zinc-400 text-xs whitespace-nowrap">
                        {new Date(r.entryTime).toLocaleString("es-PY")}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-xs">
                        {diffHours.toFixed(1)} hrs
                      </td>
                      <td className="px-4 py-3 text-right font-black text-rose-600 dark:text-rose-500">
                        {charge > 0 ? formatCurrency(charge) : "Sin recargo"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex flex-col gap-1 w-full sm:w-auto">
              <div>Total Seleccionados: <span className="text-[#0a354c] dark:text-[#00c5ff] font-black">{selectedDeliverRecords.length} Bulto(s)</span></div>
              {selectedDeliverStats.totalExtraAmount > 0 && (
                <div className="text-rose-600 dark:text-rose-500">Recargo Total Acumulado: <span className="font-black">{formatCurrency(selectedDeliverStats.totalExtraAmount)}</span></div>
              )}
            </div>
            <div className="flex gap-3 justify-end w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setIsMultiModalOpen(false)}
                className="bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-800 dark:text-zinc-200 font-semibold"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedDeliverRecords.length === 0) {
                    showToast("Por favor seleccione al menos un casillero", "warning");
                    return;
                  }
                  setIsMultiModalOpen(false);
                  processDelivery(selectedDeliverRecords);
                }}
                className="bg-[#0a354c] hover:bg-[#1588b3] text-white font-extrabold"
              >
                Retirar Seleccionados ({selectedDeliverRecords.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
