"use client";

import { useState, useRef, useEffect } from "react";
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

interface ClientRegistrationProps {
  selectedLockerId: number | null;
  selectedSize?: LockerSize | null;
  clientDocument?: string;
  onGenerateBarcode: (
    paymentMethod: string,
    authCode?: string | null,
    opNumber?: string | null,
    cardNumber?: string | null,
    cardBrand?: string | null,
    cardType?: string | null,
  ) => Promise<CustodyRecord | null>;
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
  currentRecord: CustodyRecord | null;
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
  selectedLockerId,
  selectedSize,
  clientDocument,
  onGenerateBarcode,
  onDeliver,
  currentRecord,
  isCashOpen,
  mode = "entrega",
  lastPrintedId,
  setLastPrintedId,
}: ClientRegistrationProps) {
  const [deliveryCode, setDeliveryCode] = useState("");
  const [deliveryError, setDeliveryError] = useState("");

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
  const [pendingRecord, setPendingRecord] = useState<CustodyRecord | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Tarjeta">(
    "Efectivo",
  );
  const [extraFolioState, setExtraFolioState] = useState<number | null>(null);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [exitAuthCode, setExitAuthCode] = useState<string | null>(null);
  const [exitOpNumber, setExitOpNumber] = useState<string | null>(null);

  // State for Multiple Records Selection Modal
  const [multiRecords, setMultiRecords] = useState<CustodyRecord[]>([]);
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);

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

  const ticketRef = useRef<HTMLDivElement>(null);
  const deliveryTicketRef = useRef<HTMLDivElement>(null);
  const voucherRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: "Ticket_Custodia",
  });

  const handlePrintDelivery = useReactToPrint({
    contentRef: deliveryTicketRef,
    documentTitle: "Ticket_Retiro",
  });

  const handlePrintVoucher = useReactToPrint({
    contentRef: voucherRef,
    documentTitle: "Comprobante_Transbank",
  });

  useEffect(() => {
    if (voucherData) {
      // Aumentamos el tiempo a 2500ms para evitar que choque con el handlePrintDelivery (que corre a los 500ms)
      const timer = setTimeout(() => {
        handlePrintVoucher();
        setVoucherData(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [voucherData, handlePrintVoucher]);

  const getActiveRecordsByInput = useCustodyStore(
    (state) => state.getActiveRecordsByInput,
  );
  const lockers = useCustodyStore((state) => state.lockers);
  const lockerSizes = useCustodyStore((state) => state.lockerSizes);
  const selectedLocker = lockers.find((l) => l.id === selectedLockerId);
  const displayLockerName = selectedLocker
    ? `${selectedLocker.col}${selectedLocker.row}`
    : "";
  const selectedSizeInfo = lockerSizes.find((s) => s.value === selectedSize);
  const entryPrice = selectedSizeInfo ? selectedSizeInfo.price : 0;

  // Reset cashReceived when modal or pendingRecord changes
  useEffect(() => {
    setCashReceived(0);
  }, [pendingRecord, isModalOpen]);

  useEffect(() => {
    // Automatically print when a *new* record is generated and received
    if (currentRecord && currentRecord.id !== lastPrintedId) {
      if (printerService.isNative()) {
        const sizeLabel =
          lockerSizes.find((s) => s.value === currentRecord.size)?.label ||
          currentRecord.size;
        const locker = lockers.find((l) => l.id === currentRecord.lockerId);
        const lockerDisplay = locker
          ? `${locker.col}${locker.row}`
          : currentRecord.lockerId.toString();
        printerService.printEntryTicket(
          currentRecord,
          sizeLabel,
          lockerDisplay,
          entryPaymentMethod,
        );
        setLastPrintedId(currentRecord.id);
        showToast("Custodia registrada con éxito", "success");
      } else {
        // Small delay to allow SVG Barcode inside Ticket to render completely
        const timer = setTimeout(() => {
          handlePrint();
          setLastPrintedId(currentRecord.id);
          showToast("Custodia registrada con éxito", "success");
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [
    currentRecord,
    lastPrintedId,
    handlePrint,
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
    if (!selectedLockerId || !selectedSize || !clientDocument?.trim()) {
      showToast(
        "Por favor, selecciona un casillero, el tamaño del equipaje y escribe el RUT del cliente antes de cobrar.",
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
          setIsEntryModalOpen(false);
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
          Swal.fire({
            title: "Pago Fallido",
            text: errMsg,
            icon: "error",
            confirmButtonText: "Entendido",
          });
        }
      } catch (error) {
        Swal.close();
        setIsProcessingCard(false);
        console.error("Error al comunicarse con el POS:", error);
        Swal.fire({
          title: "Error de Conexión",
          text: "No se pudo conectar con el backend local del POS. Asegúrese de que esté corriendo en el puerto 3000.",
          icon: "error",
          confirmButtonText: "Entendido",
        });
      }
    }
  };

  const processDelivery = (record: CustodyRecord) => {
    setIsMultiModalOpen(false);
    const diffMs = Date.now() - new Date(record.entryTime).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    let extraH = 0;
    let amount = 0;

    if (diffHours > 24) {
      extraH = diffHours - 24;
      // Recargo por bloque o fracción adicional de 24 horas igual al precio inicial
      amount = Math.ceil(extraH / 24) * record.price;
    }

    setExtraHours(extraH > 0 ? extraH : 0);
    setExtraAmount(amount > 0 ? amount : 0);
    setPaymentMethod("Efectivo");
    setPendingRecord(record);
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
      processDelivery(records[0]);
    } else {
      setMultiRecords(records);
      setIsMultiModalOpen(true);
    }
  };

  const confirmDelivery = async (
    code: string,
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
            ticketNumber: code,
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
            ticketNumber: code,
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
          Swal.fire({
            title: "Pago Fallido",
            text: errMsg,
            icon: "error",
            confirmButtonText: "Entendido",
          });
          return;
        }
      } catch (error) {
        Swal.close();
        setIsProcessingCard(false);
        console.error("Error al comunicarse con el POS:", error);
        Swal.fire({
          title: "Error de Conexión",
          text: "No se pudo conectar con el backend local del POS. Asegúrese de que esté corriendo en el puerto 3000.",
          icon: "error",
          confirmButtonText: "Entendido",
        });
        return;
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
      if (pendingRecord) {
        if (printerService.isNative()) {
          const sizeLabel =
            lockerSizes.find((s) => s.value === pendingRecord.size)?.label ||
            pendingRecord.size;
          const locker = lockers.find((l) => l.id === pendingRecord.lockerId);
          const lockerDisplay = locker
            ? `${locker.col}${locker.row}`
            : pendingRecord.lockerId.toString();
          await printerService.printDeliveryTicket(
            pendingRecord,
            sizeLabel,
            lockerDisplay,
            method,
            extraHours,
            extraCharge,
            extraFolio,
          );
        } else {
          handlePrintDelivery();
        }
      }

      const success = await onDeliver(
        code,
        extraCharge,
        method,
        extraFolio,
        authCodeVal,
        opNumberVal,
        cardNumberVal,
        cardBrandVal,
        cardTypeVal,
      );
      if (success) {
        showToast("Entrega procesada con éxito", "success");
        setDeliveryCode("");
        setIsModalOpen(false);
        // Esperamos 2 segundos antes de limpiar el estado para que react-to-print alcance a clonar el DOM
        setTimeout(() => {
          setPendingRecord(null);
          setExtraFolioState(null);
        }, 2000);
      } else {
        setDeliveryError("Error procesando la entrega");
      }
    }, 500);
  };

  return (
    <div className={mode === "entrega" ? "w-full" : "bg-[#d7d7d8] px-4 pb-4"}>
      <Ticket
        ref={ticketRef}
        record={currentRecord}
        paymentMethod={entryPaymentMethod}
      />
      <DeliveryTicket
        ref={deliveryTicketRef}
        record={pendingRecord}
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
                <span>Casillero:</span>
                <span className="text-zinc-900">{displayLockerName}</span>
              </div>
              <div className="flex justify-between font-semibold text-zinc-700">
                <span>Tamaño:</span>
                <span className="text-zinc-900">{selectedSizeInfo?.label}</span>
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

          <div className="px-6 py-4 flex flex-col gap-4">
            {pendingRecord &&
              (() => {
                const pLocker = lockers.find(
                  (l) => l.id === pendingRecord.lockerId,
                );
                return (
                  <div className="bg-white border border-zinc-300 p-4 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between font-semibold text-zinc-700">
                      <span>Código:</span>
                      <span className="font-mono text-zinc-900">
                        {pendingRecord.code}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-zinc-700">
                      <span>Casillero:</span>
                      <span className="text-zinc-900">
                        {pLocker
                          ? `${pLocker.col}${pLocker.row}`
                          : pendingRecord.lockerId}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-zinc-700">
                      <span>Tamaño:</span>
                      <span className="text-zinc-900">
                        {pendingRecord.size}
                      </span>
                    </div>
                  </div>
                );
              })()}

            {extraAmount > 0 ? (
              <>
                <div className="flex justify-between items-center text-sm px-1 font-semibold text-zinc-700">
                  <span>Horas adicionales:</span>
                  <span className="font-bold text-zinc-900">
                    {extraHours.toFixed(2)} hrs
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white border border-zinc-300 p-4 rounded-lg select-none">
                  <span className="font-bold text-zinc-800 text-lg">
                    Total extra a cobrar:
                  </span>
                  <span className="font-black text-2xl text-rose-600">
                    $ {extraAmount.toLocaleString("es-CL")}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col justify-center items-center p-4 border border-zinc-300 rounded-lg bg-white select-none">
                <span className="text-zinc-500 font-bold text-sm">
                  Sin recargos adicionales
                </span>
              </div>
            )}

            {extraAmount > 0 && (
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Medio de Pago
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`flex items-center justify-center gap-2 h-12 text-sm font-bold rounded-xl border border-zinc-400 transition-all cursor-pointer ${
                      paymentMethod === "Efectivo"
                        ? "bg-[#0a354c] text-white shadow-md"
                        : "bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800"
                    }`}
                    onClick={() => setPaymentMethod("Efectivo")}
                  >
                    <Coins className="h-5 w-5" />
                    Efectivo
                  </button>
                  <button
                    type="button"
                    className={`flex items-center justify-center gap-2 h-12 text-sm font-bold rounded-xl border border-zinc-400 transition-all cursor-pointer ${
                      paymentMethod === "Tarjeta"
                        ? "bg-[#1588b3] text-white shadow-md"
                        : "bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800"
                    }`}
                    onClick={() => setPaymentMethod("Tarjeta")}
                  >
                    <CreditCard className="h-5 w-5" />
                    Tarjeta
                  </button>
                </div>

                {paymentMethod === "Efectivo" && extraAmount > 0 && (
                  <div className="space-y-2 mt-3 p-3 bg-white border border-zinc-300 rounded-lg animate-in fade-in slide-in-from-top-1">
                    <Label
                      htmlFor="cashReceived"
                      className="text-[10px] font-bold uppercase tracking-wider text-zinc-600"
                    >
                      Efectivo Recibido
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-zinc-500 text-sm font-semibold">
                        $
                      </span>
                      <input
                        id="cashReceived"
                        type="text"
                        inputMode="numeric"
                        value={
                          cashReceived === 0
                            ? ""
                            : cashReceived.toLocaleString("es-CL")
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value.replace(/\D/g, ""));
                          setCashReceived(val);
                        }}
                        placeholder="Monto entregado por el cliente"
                        className="pl-7 bg-white border border-zinc-300 rounded-md w-full h-9 text-sm font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#00c5ff]"
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
                            ? `$ ${(cashReceived - extraAmount).toLocaleString("es-CL")}`
                            : "Monto insuficiente"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-zinc-200 border-t border-zinc-300 flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-zinc-400 bg-white hover:bg-zinc-100 text-zinc-800 font-semibold text-sm cursor-pointer select-none"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-[#242424] hover:bg-[#323232] disabled:bg-zinc-500 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wide cursor-pointer select-none"
              onClick={() =>
                pendingRecord &&
                confirmDelivery(pendingRecord.code, extraAmount, paymentMethod)
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
          <div className="py-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/20">
                <tr>
                  <th className="px-4 py-2">Código</th>
                  <th className="px-4 py-2">Casillero</th>
                  <th className="px-4 py-2">Tamaño</th>
                  <th className="px-4 py-2">Entrada</th>
                  <th className="px-4 py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {multiRecords.map((r) => {
                  const locker = lockers.find((l) => l.id === r.lockerId);
                  return (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="px-4 py-3 font-mono">{r.code}</td>
                      <td className="px-4 py-3">
                        {locker ? `${locker.col}${locker.row}` : r.lockerId}
                      </td>
                      <td className="px-4 py-3">{r.size}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.entryTime).toLocaleString("es-CL")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => processDelivery(r)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Seleccionar
                        </Button>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
