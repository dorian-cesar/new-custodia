"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import { Ticket } from "./ticket";
import { DeliveryTicket } from "./delivery-ticket";
import { TransbankVoucher } from "./transbank-voucher";
import { SummaryTicket } from "./summary-ticket";
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

interface ClientRegistrationProps {
  selectedLockers?: { id: number; size: LockerSize }[];
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
  currentRecords: CustodyRecord[] | null;
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
  selectedLockers,
  clientDocument,
  onGenerateBarcode,
  onDeliver,
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
  const summaryTicketRef = useRef<HTMLDivElement>(null);
  const nextPrintActionRef = useRef<(() => void) | null>(null);

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
  const [pendingRecords, setPendingRecords] = useState<CustodyRecord[] | null>(null);
  const [selectedMultiRecords, setSelectedMultiRecords] = useState<CustodyRecord[]>([]);
  const [printingDeliveryRecord, setPrintingDeliveryRecord] = useState<CustodyRecord | null>(null);
  const [printingDeliverySummary, setPrintingDeliverySummary] = useState(false);
  const [multiRecords, setMultiRecords] = useState<CustodyRecord[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Tarjeta">(
    "Efectivo",
  );
  const [extraFolioState, setExtraFolioState] = useState<number | null>(null);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [exitAuthCode, setExitAuthCode] = useState<string | null>(null);
  const [exitOpNumber, setExitOpNumber] = useState<string | null>(null);

  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);

  const [voucherData, setVoucherData] = useState<{
    amount: number;
    ticketNumber: string;
    authorizationCode: string;
    operationNumber: string;
    cardNumber?: string | null;
    cardBrand?: string | null;
    cardType?: string | null;
    timestamp?: string;
  } | null>(null);

  const selectedExtraAmount = useMemo(() => {
    let total = 0;
    const now = Date.now();
    for (const record of selectedMultiRecords) {
      const diffMs = now - new Date(record.entryTime).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours > 24) {
        const extraH = diffHours - 24;
        total += Math.ceil(extraH / 24) * record.price;
      }
    }
    return total;
  }, [selectedMultiRecords]);

  const [printingRecord, setPrintingRecord] = useState<CustodyRecord | null>(null);

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
    onAfterPrint: () => {
      if (nextPrintActionRef.current) {
        const nextAction = nextPrintActionRef.current;
        nextPrintActionRef.current = null;
        setTimeout(nextAction, 500);
      }
    },
  });

  const handlePrintDelivery = useReactToPrint({
    contentRef: deliveryTicketRef,
    documentTitle: "Ticket_Retiro",
  });

  const handlePrintVoucher = useReactToPrint({
    contentRef: voucherRef,
    documentTitle: "Comprobante_Transbank",
    onAfterPrint: () => {
      if (nextPrintActionRef.current) {
        const nextAction = nextPrintActionRef.current;
        nextPrintActionRef.current = null;
        setTimeout(nextAction, 500);
      }
    },
  });

  const handlePrintSummary = useReactToPrint({
    contentRef: summaryTicketRef,
    documentTitle: "Boleta_Resumen",
    onAfterPrint: () => {
      if (nextPrintActionRef.current) {
        const nextAction = nextPrintActionRef.current;
        nextPrintActionRef.current = null;
        setTimeout(nextAction, 500);
      }
    },
  });



  const getActiveRecordsByInput = useCustodyStore(
    (state) => state.getActiveRecordsByInput,
  );
  const lockers = useCustodyStore((state) => state.lockers);
  const lockerSizes = useCustodyStore((state) => state.lockerSizes);
  
  const entryPrice = (selectedLockers || []).reduce((acc, curr) => {
    const sizeInfo = lockerSizes.find(s => s.value === curr.size);
    return acc + (sizeInfo ? sizeInfo.price : 0);
  }, 0);

  // Reset cashReceived when modal or pendingRecord changes
  useEffect(() => {
    setCashReceived(0);
  }, [pendingRecords, isModalOpen]);

  useEffect(() => {
    if (currentRecords && currentRecords.length > 0 && currentRecords[0].id !== lastPrintedId) {
      if (printerService.isNative()) {
        for (const record of currentRecords) {
          const sizeLabel =
            lockerSizes.find((s) => s.value === record.size)?.label ||
            record.size;
          const locker = lockers.find((l) => l.id === record.lockerId);
          const lockerDisplay = locker
            ? `${locker.col}${locker.row}`
            : record.lockerId.toString();
          printerService.printEntryTicket(record, sizeLabel, lockerDisplay, entryPaymentMethod);
          printerService.printEntryTicket(record, sizeLabel, lockerDisplay, entryPaymentMethod);
        }
        setLastPrintedId(currentRecords[0].id);
        showToast("Custodia registrada con éxito", "success");
      } else {
        printTimersRef.current.forEach(clearTimeout);
        printTimersRef.current = [];

        const actions: (() => void)[] = [];
        
        for (const record of currentRecords) {
          actions.push(() => {
            setPrintingRecord(record);
            setTimeout(() => handlePrint(), 300);
          });
          actions.push(() => {
            setPrintingRecord(record);
            setTimeout(() => handlePrintCopy(), 300);
          });
        }

        if (entryPaymentMethod === "Tarjeta" && voucherData) {
          actions.push(() => {
            handlePrintVoucher();
          });
        }

        actions.push(() => {
          handlePrintSummary();
        });

        let currentIdx = 0;
        const executeNext = () => {
          if (currentIdx < actions.length) {
            nextPrintActionRef.current = executeNext;
            actions[currentIdx]();
            currentIdx++;
          }
        };

        const t1 = setTimeout(() => {
          executeNext();
          setLastPrintedId(currentRecords[0].id);
          showToast("Custodia registrada con éxito", "success");
        }, 500);
        printTimersRef.current.push(t1);

        return () => {};
      }
    }
  }, [
    currentRecords,
    lastPrintedId,
    handlePrint,
    handlePrintCopy,
    handlePrintVoucher,
    voucherData,
    lockers,
    lockerSizes,
    entryPaymentMethod,
    setLastPrintedId,
  ]);

  const handleGenerateBarcode = () => {
    if (!isCashOpen) {
      showToast(
        "Debes abrir la caja antes de poder realizar cobros.",
        "warning",
      );
      return;
    }
    if (!selectedLockers || selectedLockers.length === 0 || !clientDocument?.trim()) {
      showToast(
        "Por favor, selecciona al menos un casillero y escribe el RUT del cliente antes de cobrar.",
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
      if (entryCashReceived < entryPrice) {
        showToast("El efectivo recibido es menor al monto a cobrar.", "error");
        return;
      }
      setIsEntryModalOpen(false);
      await onGenerateBarcode(entryPaymentMethod);
    } else if (entryPaymentMethod === "Tarjeta") {
      setIsProcessingCard(true);
      Swal.fire({
        title: "Procesando pago con tarjeta",
        text: "Por favor, siga las instrucciones en el terminal POS.",
        icon: "info",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      try {
        const response = await fetch("https://localhost:3000/api/payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: entryPrice,
            ticketNumber: clientDocument || "0",
          }),
        });

        const result = await response.json();
        Swal.close();
        setIsProcessingCard(false);

        if (
          response.ok &&
          result.success &&
          result.data &&
          result.data.approved
        ) {
          // Armar el voucher primero para tener la data lista en render
          setVoucherData({
            amount: entryPrice,
            ticketNumber: clientDocument || "0",
            authorizationCode: result.data.authorizationCode,
            operationNumber: result.data.operationNumber
              ? String(result.data.operationNumber)
              : "",
            cardNumber: result.data.cardNumber,
            cardBrand: result.data.cardBrand,
            cardType: result.data.cardType,
            timestamp: result.data.timestamp,
          });
          // Cerrar el modal de pago
          setIsEntryModalOpen(false);
          // Luego crear el registro, lo cual gatillará el useEffect de impresión
          await onGenerateBarcode(
            "Tarjeta",
            result.data.authorizationCode,
            result.data.operationNumber
              ? String(result.data.operationNumber)
              : null,
            result.data.cardNumber || null,
            result.data.cardBrand || null,
            result.data.cardType || null,
          );
        } else {
          const errMsg =
            result.error ||
            "La transacción fue rechazada o cancelada en el POS.";
          const res = await Swal.fire({
            title: "Pago Fallido",
            text: errMsg,
            icon: "error",
            showCancelButton: true,
            confirmButtonText: "TBK Backup",
            confirmButtonColor: "#f59e0b",
            cancelButtonText: "Entendido",
          });
          if (res.isConfirmed) {
            const backupAuthCode = "BACKUP_TBK";
            const backupOpNumber = "BACKUP";
            setVoucherData({
              amount: entryPrice,
              ticketNumber: clientDocument || "0",
              authorizationCode: backupAuthCode,
              operationNumber: backupOpNumber,
              cardNumber: "0000",
              cardBrand: "TBK Backup",
              cardType: "Manual",
              timestamp: new Date().toISOString(),
            });
            setIsEntryModalOpen(false);
            await onGenerateBarcode(
              "Tarjeta",
              backupAuthCode,
              backupOpNumber,
              "0000",
              "TBK Backup",
              "Manual",
            );
          }
        }
      } catch (error) {
        Swal.close();
        setIsProcessingCard(false);
        console.error("Error al comunicarse con el POS:", error);
        const res = await Swal.fire({
          title: "Error de Conexión",
          text: "No se pudo conectar con el backend local del POS. Asegúrese de que esté corriendo en el puerto 3000.",
          icon: "error",
          showCancelButton: true,
          confirmButtonText: "TBK Backup",
          confirmButtonColor: "#f59e0b",
          cancelButtonText: "Entendido",
        });

        if (res.isConfirmed) {
          const backupAuthCode = "BACKUP_TBK";
          const backupOpNumber = "BACKUP";
          setVoucherData({
            amount: entryPrice,
            ticketNumber: clientDocument || "0",
            authorizationCode: backupAuthCode,
            operationNumber: backupOpNumber,
            cardNumber: "0000",
            cardBrand: "TBK Backup",
            cardType: "Manual",
            timestamp: new Date().toISOString(),
          });
          setIsEntryModalOpen(false);
          await onGenerateBarcode(
            "Tarjeta",
            backupAuthCode,
            backupOpNumber,
            "0000",
            "TBK Backup",
            "Manual",
          );
        }
      }
    }
  };

  const processDelivery = (records: CustodyRecord[]) => {
    setIsMultiModalOpen(false);
    let totalExtraH = 0;
    let totalAmount = 0;
    const now = Date.now();

    for (const record of records) {
      const diffMs = now - new Date(record.entryTime).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours > 24) {
        const extraH = diffHours - 24;
        totalAmount += Math.ceil(extraH / 24) * record.price;
        if (extraH > totalExtraH) totalExtraH = extraH;
      }
    }

    setExtraHours(totalExtraH > 0 ? totalExtraH : 0);
    setExtraAmount(totalAmount > 0 ? totalAmount : 0);
    setPaymentMethod("Efectivo");
    setPendingRecords(records);
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
      processDelivery(records);
    } else {
      setMultiRecords(records);
      setSelectedMultiRecords([]);
      setIsMultiModalOpen(true);
    }
  };

  const confirmDelivery = async (
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
      setIsProcessingCard(true);
      Swal.fire({
        title: "Procesando pago de recargo",
        text: "Por favor, siga las instrucciones en el terminal POS.",
        icon: "info",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      try {
        const response = await fetch("https://localhost:3000/api/payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: extraCharge,
            ticketNumber: pendingRecords?.[0]?.code || "0",
          }),
        });

        const result = await response.json();
        Swal.close();
        setIsProcessingCard(false);

        if (
          response.ok &&
          result.success &&
          result.data &&
          result.data.approved
        ) {
          authCodeVal = result.data.authorizationCode;
          opNumberVal = result.data.operationNumber
            ? String(result.data.operationNumber)
            : null;
          cardNumberVal = result.data.cardNumber || null;
          cardBrandVal = result.data.cardBrand || null;
          cardTypeVal = result.data.cardType || null;
          setExitAuthCode(authCodeVal);
          setExitOpNumber(opNumberVal);
          setVoucherData({
            amount: extraCharge,
            ticketNumber: pendingRecords?.[0]?.code || "0",
            authorizationCode: authCodeVal || "",
            operationNumber: opNumberVal || "",
            cardNumber: result.data.cardNumber,
            cardBrand: result.data.cardBrand,
            cardType: result.data.cardType,
            timestamp: result.data.timestamp,
          });
        } else {
          const errMsg =
            result.error ||
            "La transacción fue rechazada o cancelada en el POS.";
          const res = await Swal.fire({
            title: "Pago Fallido",
            text: errMsg,
            icon: "error",
            showCancelButton: true,
            confirmButtonText: "TBK Backup",
            confirmButtonColor: "#f59e0b",
            cancelButtonText: "Entendido",
          });
          if (res.isConfirmed) {
            authCodeVal = "BACKUP_TBK";
            opNumberVal = "BACKUP";
            cardNumberVal = "0000";
            cardBrandVal = "TBK Backup";
            cardTypeVal = "Manual";
            setExitAuthCode(authCodeVal);
            setExitOpNumber(opNumberVal);
            setVoucherData({
              amount: extraCharge,
              ticketNumber: pendingRecords?.[0]?.code || "0",
              authorizationCode: authCodeVal,
              operationNumber: opNumberVal,
              cardNumber: cardNumberVal,
              cardBrand: cardBrandVal,
              cardType: cardTypeVal,
              timestamp: new Date().toISOString(),
            });
          } else {
            return;
          }
        }
      } catch (error) {
        Swal.close();
        setIsProcessingCard(false);
        console.error("Error al comunicarse con el POS:", error);
        const res = await Swal.fire({
          title: "Error de Conexión",
          text: "No se pudo conectar con el backend local del POS. Asegúrese de que esté corriendo en el puerto 3000.",
          icon: "error",
          showCancelButton: true,
          confirmButtonText: "TBK Backup",
          confirmButtonColor: "#f59e0b",
          cancelButtonText: "Entendido",
        });

        if (res.isConfirmed) {
          authCodeVal = "BACKUP_TBK";
          opNumberVal = "BACKUP";
          cardNumberVal = "0000";
          cardBrandVal = "TBK Backup";
          cardTypeVal = "Manual";
          setExitAuthCode(authCodeVal);
          setExitOpNumber(opNumberVal);
          setVoucherData({
            amount: extraCharge,
            ticketNumber: pendingRecords?.[0]?.code || "0",
            authorizationCode: authCodeVal,
            operationNumber: opNumberVal,
            cardNumber: cardNumberVal,
            cardBrand: cardBrandVal,
            cardType: cardTypeVal,
            timestamp: new Date().toISOString(),
          });
        } else {
          return;
        }
      }
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
    setTimeout(async () => {
      if (pendingRecords && pendingRecords.length > 0) {
        if (printerService.isNative()) {
          for (const record of pendingRecords) {
            const sizeLabel =
              lockerSizes.find((s) => s.value === record.size)?.label ||
              record.size;
            const locker = lockers.find((l) => l.id === record.lockerId);
            const lockerDisplay = locker
              ? `${locker.col}${locker.row}`
              : record.lockerId.toString();
            await printerService.printDeliveryTicket(
              record,
              sizeLabel,
              lockerDisplay,
              method,
              extraHours,
              extraCharge,
              extraFolio,
            );
          }
        } else {
          printTimersRef.current.forEach(clearTimeout);
          printTimersRef.current = [];

          const actions: (() => void)[] = [];
          
          for (const record of pendingRecords) {
            actions.push(() => {
              setPrintingDeliveryRecord(record);
              setTimeout(() => handlePrintDelivery(), 300);
            });
          }

          if (method === "Tarjeta" && extraCharge > 0 && voucherData) {
            actions.push(() => {
              handlePrintVoucher();
            });
          }

          actions.push(() => {
            setPrintingDeliverySummary(true);
            setTimeout(() => handlePrintSummary(), 300);
          });

          let currentIdx = 0;
          const executeNext = () => {
            if (currentIdx < actions.length) {
              nextPrintActionRef.current = executeNext;
              actions[currentIdx]();
              currentIdx++;
            }
          };

          const t1 = setTimeout(() => {
            executeNext();
          }, 500);
          printTimersRef.current.push(t1);
        }
      }

      let allSuccess = true;
      for (const record of pendingRecords || []) {
        const isFirst = pendingRecords?.indexOf(record) === 0;
        const success = await onDeliver(
          record.code,
          isFirst ? extraCharge : 0,
          method,
          isFirst ? extraFolio : null,
          isFirst ? authCodeVal : null,
          isFirst ? opNumberVal : null,
          isFirst ? cardNumberVal : null,
          isFirst ? cardBrandVal : null,
          isFirst ? cardTypeVal : null,
        );
        if (!success) allSuccess = false;
      }

      if (allSuccess) {
        showToast("Entrega procesada con éxito", "success");
        setDeliveryCode("");
        setIsModalOpen(false);
        setTimeout(() => {
          setPendingRecords(null);
          setExtraFolioState(null);
          setPrintingDeliverySummary(false);
        }, 2000);
      } else {
        setDeliveryError("Error procesando alguna entrega");
      }
    }, 500);
  };

  return (
    <div className={mode === "entrega" ? "w-full" : "bg-[#d7d7d8] px-4 pb-4"}>
      <Ticket
        ref={ticketRef}
        record={printingRecord || (currentRecords && currentRecords.length > 0 ? currentRecords[0] : null)}
        paymentMethod={entryPaymentMethod}
      />
      <DeliveryTicket
        ref={deliveryTicketRef}
        record={printingDeliveryRecord || (pendingRecords && pendingRecords.length > 0 ? pendingRecords[0] : null)}
        extraHours={extraHours}
        extraAmount={extraAmount}
        paymentMethod={paymentMethod}
        extraFolio={extraFolioState}
        authCode={exitAuthCode}
        opNumber={exitOpNumber}
      />
      <TransbankVoucher
        ref={voucherRef}
        data={voucherData}
      />
      <SummaryTicket
        ref={summaryTicketRef}
        records={printingDeliverySummary ? pendingRecords : currentRecords}
        paymentMethod={printingDeliverySummary ? paymentMethod : entryPaymentMethod}
        type={printingDeliverySummary ? "delivery" : "entry"}
        totalAmountOverride={printingDeliverySummary ? extraAmount : undefined}
      />

      {mode === "entrega" ? (
        <div className="w-full flex flex-col items-center">
          <button
            type="button"
            onClick={handleGenerateBarcode}
            disabled={!isCashOpen}
            className="w-full max-w-[320px] bg-[#242424] hover:bg-[#323232] disabled:bg-zinc-500 disabled:cursor-not-allowed text-white text-md font-black py-2.5 px-6 rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md select-none mt-1 text-center"
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
            <div className="bg-[#242424] text-white py-1 px-4 text-xs font-bold uppercase tracking-wider mb-2">
              REGISTRO DEL CLIENTE
            </div>
            <input
              type="text"
              value={deliveryCode}
              onChange={(e) => setDeliveryCode(e.target.value)}
              placeholder="Código de barras o RUT / DNI del cliente"
              className="w-full bg-white border border-zinc-300 rounded-md px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#00c5ff] font-semibold"
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
              className="w-full bg-[#242424] hover:bg-[#323232] disabled:bg-zinc-500 disabled:cursor-not-allowed text-white text-md font-black py-2.5 px-6 rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md select-none mt-1 text-center"
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

      {/* Entry Payment Confirmation Modal */}
      <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden">
          <DialogHeader className="bg-[#242424] text-white py-3 px-6 flex items-center justify-between space-y-0">
            <DialogTitle className="text-lg font-bold tracking-wide flex items-center gap-2 text-white">
              <Coins className="h-5 w-5 text-[#00c5ff]" />
              PAGO DE CUSTODIA
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 flex flex-col gap-4">
            <div className="bg-white border border-zinc-300 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between font-semibold text-zinc-700">
                <span>Cliente:</span>
                <span className="font-mono text-zinc-900">
                  {clientDocument}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-zinc-700">
                <span>Casilleros:</span>
                <span className="text-zinc-900 text-right max-w-[60%] leading-tight">
                  {selectedLockers?.map(l => {
                    const locker = lockers.find(lk => lk.id === l.id);
                    return locker ? `${locker.col}${locker.row} (${l.size})` : "";
                  }).join(", ")}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-white border border-zinc-300 p-4 rounded-lg select-none">
              <span className="font-bold text-zinc-800 text-lg">
                Total a cobrar:
              </span>
              <span className="font-black text-2xl text-[#0a354c]">
                $ {entryPrice.toLocaleString("es-CL")}
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Medio de Pago
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className={`flex items-center justify-center gap-2 h-12 text-sm font-bold rounded-xl border border-zinc-400 transition-all cursor-pointer ${
                    entryPaymentMethod === "Efectivo"
                      ? "bg-[#0a354c] text-white shadow-md"
                      : "bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800"
                  }`}
                  onClick={() => setEntryPaymentMethod("Efectivo")}
                >
                  <Coins className="h-5 w-5" />
                  Efectivo
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center gap-2 h-12 text-sm font-bold rounded-xl border border-zinc-400 transition-all cursor-pointer ${
                    entryPaymentMethod === "Tarjeta"
                      ? "bg-[#1588b3] text-white shadow-md"
                      : "bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800"
                  }`}
                  onClick={() => setEntryPaymentMethod("Tarjeta")}
                >
                  <CreditCard className="h-5 w-5" />
                  Tarjeta
                </button>
              </div>

              {entryPaymentMethod === "Efectivo" && entryPrice > 0 && (
                <div className="space-y-2 mt-3 p-3 bg-white border border-zinc-300 rounded-lg animate-in fade-in slide-in-from-top-1">
                  <Label
                    htmlFor="entryCashReceived"
                    className="text-[10px] font-bold uppercase tracking-wider text-zinc-600"
                  >
                    Efectivo Recibido
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-zinc-500 text-sm font-semibold">
                      $
                    </span>
                    <input
                      id="entryCashReceived"
                      type="text"
                      inputMode="numeric"
                      value={
                        entryCashReceived === 0
                          ? ""
                          : entryCashReceived.toLocaleString("es-CL")
                      }
                      onChange={(e) => {
                        const val = Number(e.target.value.replace(/\D/g, ""));
                        setEntryCashReceived(val);
                      }}
                      placeholder="Monto entregado por el cliente"
                      className="pl-7 bg-white border border-zinc-300 rounded-md w-full h-9 text-sm font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#00c5ff]"
                    />
                  </div>
                  {entryCashReceived > 0 && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-zinc-300 text-xs font-semibold">
                      <span className="text-zinc-500">Vuelto a entregar:</span>
                      <span
                        className={`text-sm font-bold ${entryCashReceived - entryPrice >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {entryCashReceived - entryPrice >= 0
                          ? `$ ${(entryCashReceived - entryPrice).toLocaleString("es-CL")}`
                          : "Monto insuficiente"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-zinc-200 border-t border-zinc-300 flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-zinc-400 bg-white hover:bg-zinc-100 text-zinc-800 font-semibold text-sm cursor-pointer select-none"
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
        <DialogContent className="sm:max-w-3xl w-[95vw] bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden">
          <DialogHeader className="bg-[#242424] text-white py-3 px-6 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-lg font-bold tracking-wide flex items-center gap-2 text-white">
              {extraAmount > 0 ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <Coins className="h-5 w-5 text-[#00c5ff]" />
              )}
              {extraAmount > 0
                ? "RECARGO POR EXCESO DE TIEMPO"
                : "RETIRO DE CUSTODIA"}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 flex flex-col md:flex-row gap-8 max-h-[75vh]">
            {/* Left side: Lockers list */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-3 h-full max-h-[calc(75vh-2.5rem)]">
              {pendingRecords &&
                pendingRecords.map((pr) => {
                  const pLocker = lockers.find(
                    (l) => l.id === pr.lockerId,
                  );
                  return (
                    <div key={pr.id} className="bg-white border border-zinc-300 p-4 rounded-lg space-y-2 text-sm shrink-0 shadow-sm">
                      <div className="flex justify-between font-semibold text-zinc-700">
                        <span>Código:</span>
                        <span className="font-mono text-zinc-900">
                          {pr.code}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-zinc-700">
                        <span>Casillero:</span>
                        <span className="text-zinc-900">
                          {pLocker
                            ? `${pLocker.col}${pLocker.row}`
                            : pr.lockerId}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-zinc-700">
                        <span>Tamaño:</span>
                        <span className="text-zinc-900">
                          {pr.size}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Right side: Payment summary & actions */}
            <div className="w-full md:w-[320px] flex flex-col justify-between shrink-0 h-full max-h-[calc(75vh-2.5rem)] overflow-y-auto pr-2">
              <div className="flex flex-col gap-4">
                {extraAmount > 0 ? (
                  <>
                    <div className="flex justify-between items-center text-sm font-semibold text-zinc-600 px-1">
                      <span>Horas adicionales (máx):</span>
                      <span>{extraHours.toFixed(2)} hrs</span>
                    </div>

                    <div className="bg-white rounded-lg p-5 border border-zinc-300 shadow-sm">
                      <div className="flex flex-col gap-2">
                        <span className="font-bold text-sm text-zinc-600 uppercase tracking-wide">
                          Total extra a cobrar:
                        </span>
                        <span className="text-3xl font-black text-destructive tracking-tight">
                          $ {extraAmount.toLocaleString("es-CL")}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      <Label className="text-xs font-bold text-zinc-600 uppercase tracking-wide px-1">
                        MEDIO DE PAGO
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setPaymentMethod("Efectivo")}
                          className={`h-12 border-2 transition-all ${
                            paymentMethod === "Efectivo"
                              ? "border-[#0a354c] bg-[#0a354c] text-white hover:bg-[#0a354c]/90 hover:text-white"
                              : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
                          }`}
                        >
                          <Coins className="w-4 h-4 mr-2" />
                          Efectivo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setPaymentMethod("Tarjeta")}
                          className={`h-12 border-2 transition-all ${
                            paymentMethod === "Tarjeta"
                              ? "border-[#0a354c] bg-[#0a354c] text-white hover:bg-[#0a354c]/90 hover:text-white"
                              : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
                          }`}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Tarjeta
                        </Button>
                      </div>
                    </div>

                    {paymentMethod === "Efectivo" && (
                      <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-300 bg-white p-4 rounded-lg border border-zinc-300 shadow-sm">
                        <Label className="text-[10px] font-bold text-[#0a354c] uppercase tracking-wide">
                          EFECTIVO RECIBIDO
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">
                            $
                          </span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={cashReceived || ""}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              setCashReceived(Number(val));
                            }}
                            className="pl-7 font-semibold h-11"
                            placeholder="Monto entregado por el cliente"
                          />
                        </div>
                        {cashReceived > 0 && cashReceived >= extraAmount && (
                          <div className="flex justify-between items-center mt-3 text-sm font-bold text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
                            <span>VUELTO:</span>
                            <span className="text-lg">
                              $ {(cashReceived - extraAmount).toLocaleString("es-CL")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white rounded-lg p-6 border border-zinc-300 text-center shadow-sm flex flex-col items-center justify-center h-full min-h-[150px]">
                    <p className="text-zinc-600 font-semibold mb-2">
                      Retiro dentro del plazo de 24 horas.
                    </p>
                    <p className="text-xl font-black text-green-600">
                      Sin recargo adicional
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-6 mt-6 border-t border-zinc-400 shrink-0">
                <Button
                  type="button"
                  className="w-full h-12 bg-[#242424] hover:bg-[#323232] disabled:bg-zinc-500 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-wide cursor-pointer shadow-md"
                  onClick={() =>
                    pendingRecords &&
                    confirmDelivery(extraAmount, paymentMethod)
                  }
                  disabled={isProcessingCard}
                >
                  {isProcessingCard ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Procesando...
                    </span>
                  ) : (
                    "Confirmar Pago"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full h-12 bg-transparent border-zinc-400 hover:bg-zinc-300/50 text-zinc-700 font-bold uppercase tracking-wide"
                  disabled={isProcessingCard}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MULTIPLE RECORDS MODAL */}
      <Dialog open={isMultiModalOpen} onOpenChange={setIsMultiModalOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[850px] w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Múltiples Casilleros Encontrados
            </DialogTitle>
            <DialogDescription>
              El RUT ingresado tiene varios casilleros activos. Seleccione cuál
              desea entregar:
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between px-6 mt-4 border-b border-border/50 pb-3">
            <span className="text-sm font-semibold text-zinc-300">
              {multiRecords.length} casilleros encontrados
            </span>
            <button
              type="button"
              onClick={() => {
                if (selectedMultiRecords.length === multiRecords.length) {
                  setSelectedMultiRecords([]);
                } else {
                  setSelectedMultiRecords([...multiRecords]);
                }
              }}
              className="px-4 py-1.5 rounded-md border-2 border-[#00c5ff] text-[#00c5ff] hover:bg-[#00c5ff] hover:text-zinc-900 bg-transparent font-bold transition-all shadow-[0_0_10px_rgba(0,197,255,0.2)] hover:shadow-[0_0_15px_rgba(0,197,255,0.4)] cursor-pointer"
            >
              {selectedMultiRecords.length === multiRecords.length
                ? "Desmarcar Todo"
                : "Seleccionar Todo"}
            </button>
          </div>

          <div className="py-2 overflow-x-auto overflow-y-auto max-h-[50vh]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/20">
                <tr>
                  <th className="px-4 py-2">Código</th>
                  <th className="px-4 py-2">Casillero</th>
                  <th className="px-4 py-2">Tamaño</th>
                  <th className="px-4 py-2">Entrada</th>
                  <th className="px-4 py-2 text-right">Seleccionar</th>
                </tr>
              </thead>
              <tbody>
                {multiRecords.map((r) => {
                  const locker = lockers.find((l) => l.id === r.lockerId);
                  const isSelected = selectedMultiRecords.some(s => s.id === r.id);
                  return (
                    <tr 
                      key={r.id} 
                      className={`border-b border-border/50 cursor-pointer transition-colors ${isSelected ? "bg-[#00c5ff]/20 text-white" : "hover:bg-zinc-800 text-zinc-300"}`}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedMultiRecords(prev => prev.filter(s => s.id !== r.id));
                        } else {
                          setSelectedMultiRecords(prev => [...prev, r]);
                        }
                      }}
                    >
                      <td className="px-4 py-3 font-mono text-zinc-100">{r.code}</td>
                      <td className="px-4 py-3 text-zinc-100">
                        {locker ? `${locker.col}${locker.row}` : r.lockerId}
                      </td>
                      <td className="px-4 py-3 text-zinc-100">{r.size}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.entryTime).toLocaleString("es-CL")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="w-4 h-4 rounded border-zinc-500 text-[#00c5ff] focus:ring-[#00c5ff] pointer-events-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsMultiModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedMultiRecords.length > 0) processDelivery(selectedMultiRecords);
              }}
              disabled={selectedMultiRecords.length === 0}
              className="bg-[#00c5ff] hover:bg-[#00b4eb] text-[#0a354c] font-black uppercase tracking-wide disabled:bg-zinc-800 disabled:text-zinc-600 shadow-md"
            >
              Retirar Seleccionados ({selectedMultiRecords.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
