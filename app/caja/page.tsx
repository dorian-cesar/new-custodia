"use client";

import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { WithdrawalTicket } from "@/components/custody/withdrawal-ticket";
import { ClosureTicket } from "@/components/custody/closure-ticket";
import { printerService } from "@/lib/printer-service";
import {
  DollarSign,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Receipt,
  Clock,
  AlertCircle,
  History,
} from "lucide-react";
import { Header } from "@/components/custody/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustodyStore } from "@/lib/custody-store";
import { formatDateTime } from "@/lib/types";
import { verifySupervisor } from "@/app/actions/db-actions";

export default function CajaPage() {
  const {
    currentCashRegister,
    cashRegisters,
    cashTransactions,
    openCashRegister,
    closeCashRegister,
    getCurrentRegisterStats,
    logout,
    addTransaction,
  } = useCustodyStore();

  const [mounted, setMounted] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState<{
    amount: number;
    cajero: string;
    supervisor: string;
    reason: string;
    timestamp: string;
  } | null>(null);

  const withdrawalTicketRef = useRef<HTMLDivElement>(null);
  const handlePrintWithdrawal = useReactToPrint({
    contentRef: withdrawalTicketRef,
    documentTitle: "Comprobante_Retiro",
  });

  const [closureData, setClosureData] = useState<{
    cajero: string;
    openedAt: string;
    closedAt: string;
    openingAmount: number;
    salesCash: number;
    salesCard: number;
    withdrawals: number;
    expectedAmount: number;
    declaredAmount: number;
    difference: number;
    notes?: string;
  } | null>(null);

  const closureTicketRef = useRef<HTMLDivElement>(null);
  const handlePrintClosure = useReactToPrint({
    contentRef: closureTicketRef,
    documentTitle: "Comprobante_Cierre_Caja",
  });

  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  // Giro State
  const [showGiroDialog, setShowGiroDialog] = useState(false);
  const [giroAmount, setGiroAmount] = useState("");
  const [giroReason, setGiroReason] = useState("");
  const [isProcessingGiro, setIsProcessingGiro] = useState(false);

  const [error, setError] = useState("");
  const [supervisorUsername, setSupervisorUsername] = useState("");
  const [supervisorPassword, setSupervisorPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Pagination for cash registers
  const [currentPageRegisters, setCurrentPageRegisters] = useState(1);
  const REGISTERS_PER_PAGE = 5;

  const sortedRegisters = [...cashRegisters].sort(
    (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
  );
  const totalRegisterPages = Math.ceil(
    sortedRegisters.length / REGISTERS_PER_PAGE,
  );
  const paginatedRegisters = sortedRegisters.slice(
    (currentPageRegisters - 1) * REGISTERS_PER_PAGE,
    currentPageRegisters * REGISTERS_PER_PAGE,
  );

  const isCashOpen = currentCashRegister?.status === "open";
  const stats = getCurrentRegisterStats();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (withdrawalData) {
      if (!printerService.isNative()) {
        handlePrintWithdrawal();
      }
    }
  }, [withdrawalData]);

  const [lastPrintedClosureTime, setLastPrintedClosureTime] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (closureData && closureData.closedAt !== lastPrintedClosureTime) {
      const executeClose = async () => {
        if (!printerService.isNative()) {
          // Small delay to ensure the DOM elements are fully loaded
          await new Promise((resolve) => setTimeout(resolve, 300));
          handlePrintClosure();
        }
        await closeCashRegister(
          closureData.declaredAmount,
          closureData.notes || "",
        );
        setClosingAmount("");
        setNotes("");
        setSupervisorUsername("");
        setSupervisorPassword("");
        setShowConfirmCloseDialog(false);
        setCloseSummary(null);
        logout();
      };

      executeClose();
      setLastPrintedClosureTime(closureData.closedAt);
    }
  }, [
    closureData,
    lastPrintedClosureTime,
    handlePrintClosure,
    closeCashRegister,
    logout,
  ]);

  // Pagination for transactions
  const [currentTxPage, setCurrentTxPage] = useState(1);
  const TX_PER_PAGE = 15;

  const currentTransactions = currentCashRegister
    ? cashTransactions.filter((t) => t.registerId === currentCashRegister.id)
    : [];

  const totalTxPages = Math.ceil(currentTransactions.length / TX_PER_PAGE);
  const paginatedTransactions = currentTransactions.slice(
    (currentTxPage - 1) * TX_PER_PAGE,
    currentTxPage * TX_PER_PAGE,
  );

  const ingresosTarjeta = stats.ingresosTarjeta || 0;
  const ingresosEfectivo = stats.ingresosEfectivo || 0;
  const saldoEsperadoEfectivo = stats.balance;

  const montoContado = parseFloat(closingAmount);
  const diferenciaCaja = !isNaN(montoContado)
    ? montoContado - saldoEsperadoEfectivo
    : null;

  const handleOpenCash = () => {
    setError("");
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) {
      setError("Ingrese un monto valido");
      return;
    }
    openCashRegister(amount, notes);
    setOpeningAmount("");
    setNotes("");
    setShowOpenDialog(false);
  };

  // State for confirm close dialog
  const [showConfirmCloseDialog, setShowConfirmCloseDialog] = useState(false);
  const [closeSummary, setCloseSummary] = useState<{
    expected: number;
    declared: number;
    difference: number;
  } | null>(null);

  const handleCloseCash = async () => {
    setError("");
    const amount = parseFloat(closingAmount);
    if (isNaN(amount) || amount < 0) {
      setError("Ingrese un monto válido");
      return;
    }

    if (!supervisorUsername.trim() || !supervisorPassword.trim()) {
      setError("Debe ingresar las credenciales de un supervisor");
      return;
    }

    setIsVerifying(true);
    try {
      const authResult = await verifySupervisor(
        supervisorUsername,
        supervisorPassword,
      );
      if (!authResult.success) {
        setError(authResult.error || "Credenciales de supervisor incorrectas");
        setIsVerifying(false);
        return;
      }

      // Instead of closing immediately, we show the confirmation dialog
      const expected = stats.balance;
      const difference = amount - expected;

      setCloseSummary({ expected, declared: amount, difference });
      setShowCloseDialog(false);
      setShowConfirmCloseDialog(true);
    } catch (err) {
      setError("Error al verificar credenciales");
    } finally {
      setIsVerifying(false);
    }
  };

  const confirmAndExecuteClose = async () => {
    if (!closeSummary || !currentCashRegister) return;
    setIsVerifying(true);
    try {
      const regTxs = cashTransactions.filter(
        (t) => t.registerId === currentCashRegister.id,
      );
      const salesCard =
        Math.round(
          regTxs
            .filter(
              (t) => t.type === "income" && t.description.includes("Tarjeta"),
            )
            .reduce((s, t) => s + t.amount, 0) / 10,
        ) * 10;
      const salesCash =
        Math.round(
          regTxs
            .filter(
              (t) => t.type === "income" && !t.description.includes("Tarjeta"),
            )
            .reduce((s, t) => s + t.amount, 0) / 10,
        ) * 10;
      const withdrawals =
        Math.round(
          regTxs
            .filter((t) => t.type === "expense")
            .reduce((s, t) => s + t.amount, 0) / 10,
        ) * 10;

      const data = {
        cajero: currentCashRegister.openedBy || "desconocido",
        openedAt: currentCashRegister.openedAt,
        closedAt: new Date().toISOString(),
        openingAmount: currentCashRegister.openingAmount,
        salesCash,
        salesCard,
        withdrawals,
        expectedAmount: closeSummary.expected,
        declaredAmount: closeSummary.declared,
        difference: closeSummary.difference,
        notes: notes,
      };

      setClosureData(data);

      if (printerService.isNative()) {
        await printerService.printClosureTicket(data);
        await closeCashRegister(closeSummary.declared, notes);
        setClosingAmount("");
        setNotes("");
        setSupervisorUsername("");
        setSupervisorPassword("");
        setShowConfirmCloseDialog(false);
        setCloseSummary(null);
        logout();
      }
    } catch (err) {
      setError("Error al cerrar la caja");
      setIsVerifying(false);
    }
  };

  const handleGiro = async () => {
    setError("");
    const amount = parseFloat(giroAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Ingrese un monto válido para el retiro");
      return;
    }

    if (amount > stats.balance) {
      setError("El monto a retirar no puede superar el saldo total de la caja");
      return;
    }

    if (!supervisorUsername.trim() || !supervisorPassword.trim()) {
      setError("Debe ingresar las credenciales de un supervisor");
      return;
    }

    setIsVerifying(true);
    setIsProcessingGiro(true);
    try {
      const authResult = await verifySupervisor(
        supervisorUsername,
        supervisorPassword,
      );
      if (!authResult.success) {
        setError(authResult.error || "Credenciales de supervisor incorrectas");
        setIsVerifying(false);
        setIsProcessingGiro(false);
        return;
      }

      await addTransaction(
        "expense",
        amount,
        `Retiro de Caja: ${giroReason.trim()}`,
      );

      const timestamp = new Date().toISOString();
      const data = {
        amount,
        cajero: currentCashRegister?.openedBy || "desconocido",
        supervisor: supervisorUsername,
        reason: giroReason.trim(),
        timestamp,
      };
      setWithdrawalData(data);

      if (printerService.isNative()) {
        await printerService.printWithdrawalTicket(
          amount,
          data.cajero,
          data.supervisor,
          data.reason,
          timestamp,
        );
      }

      setGiroAmount("");
      setGiroReason("");
      setSupervisorUsername("");
      setSupervisorPassword("");
      setShowGiroDialog(false);
    } catch (err) {
      setError("Error al procesar el retiro");
    } finally {
      setIsVerifying(false);
      setIsProcessingGiro(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col items-center py-3 lg:py-4 px-4 lg:overflow-hidden">
      <div className="w-full max-w-[960px] lg:max-w-[1330px] lg:h-[calc(100vh-32px)] bg-[#d7d7d8] border border-zinc-400 shadow-xl rounded-lg overflow-hidden flex flex-col pb-4">
        <Header showBack />

        <main className="flex-1 flex flex-col gap-6 p-6 overflow-y-auto min-h-0">
          {/* Current Cash Register Status */}
          <div>
            <div className="bg-[#242424] text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider mb-3 rounded-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Estado de Caja</span>
              </div>
              {isCashOpen ? (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setGiroAmount(stats.balance.toString());
                      setShowGiroDialog(true);
                    }}
                    variant="outline"
                    className="h-7 text-[10px] uppercase font-bold border-amber-500/50 text-amber-600 bg-white hover:bg-amber-50"
                  >
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Retiro de Caja
                  </Button>
                  <Button
                    onClick={() => {
                      setClosingAmount(stats.balance.toString());
                      setShowCloseDialog(true);
                    }}
                    variant="destructive"
                    className="h-7 text-[10px] uppercase font-bold bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Cerrar Caja
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowOpenDialog(true)}
                  className="h-7 text-[10px] uppercase font-bold bg-[#1588b3] hover:bg-[#0a354c] text-white"
                >
                  <Unlock className="h-3 w-3 mr-1" />
                  Abrir Caja
                </Button>
              )}
            </div>

            {isCashOpen ? (
              <div className="grid sm:grid-cols-4 gap-4">
                <div className="bg-white border border-zinc-300 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Apertura
                    </span>
                  </div>
                  <p className="text-zinc-800 font-extrabold text-sm">
                    {currentCashRegister &&
                      formatDateTime(currentCashRegister.openedAt)}
                  </p>
                  <p className="text-[11px] text-zinc-500 font-bold mt-1">
                    Monto inicial: $
                    {currentCashRegister?.openingAmount.toLocaleString()}
                  </p>
                </div>

                <div className="bg-white border border-zinc-300 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <TrendingUp className="h-4 w-4 text-[#0a354c]" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Ventas
                    </span>
                  </div>
                  <p className="text-2xl font-black text-[#0a354c]">
                    ${stats.totalSales.toLocaleString()}
                  </p>
                </div>

                <div className="bg-white border border-zinc-300 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <Receipt className="h-4 w-4 text-zinc-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Transacciones
                    </span>
                  </div>
                  <p className="text-2xl font-black text-zinc-800">
                    {stats.totalTransactions}
                  </p>
                </div>

                <div className="bg-white border border-zinc-300 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <DollarSign className="h-4 w-4 text-[#1588b3]" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Saldo Actual
                    </span>
                  </div>
                  <p className="text-2xl font-black text-[#1588b3]">
                    ${stats.balance.toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-5 bg-white border border-zinc-300 rounded-xl shadow-sm">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-extrabold text-[#242424]">
                    La caja está cerrada
                  </p>
                  <p className="text-xs text-zinc-500 font-medium">
                    Debe abrir la caja para comenzar a registrar custodias.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Current Session Transactions */}
          {isCashOpen && currentTransactions.length > 0 && (
            <div>
              <div className="bg-[#242424] text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider mb-3 rounded-md flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span>Transacciones de la Sesión Actual</span>
              </div>
              <div className="overflow-hidden border border-zinc-300 rounded-xl shadow-sm bg-white">
                <Table>
                  <TableHeader className="bg-[#242424] hover:bg-[#242424]">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">
                        HORA
                      </TableHead>
                      <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">
                        TIPO
                      </TableHead>
                      <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">
                        DESCRIPCIÓN
                      </TableHead>
                      <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">
                        PAGO
                      </TableHead>
                      <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10 text-right">
                        MONTO
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.map((tx) => {
                      let paymentStr = "-";
                      if (tx.description.includes("Efectivo"))
                        paymentStr = "Efectivo";
                      else if (tx.description.includes("Tarjeta"))
                        paymentStr = "Tarjeta";

                      return (
                        <TableRow
                          key={tx.id}
                          className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50"
                        >
                          <TableCell className="text-zinc-800 font-medium text-xs py-3">
                            {formatDateTime(tx.timestamp)}
                          </TableCell>
                          <TableCell className="py-3">
                            <span
                              className={`text-xs font-bold flex items-center gap-1 ${
                                tx.type === "income"
                                  ? "text-[#0a354c]"
                                  : "text-red-600"
                              }`}
                            >
                              {tx.type === "income" ? (
                                <TrendingUp className="h-3.5 w-3.5" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5" />
                              )}
                              {tx.type === "income" ? "Ingreso" : "Egreso"}
                            </span>
                          </TableCell>
                          <TableCell className="text-zinc-800 text-xs py-3 font-semibold">
                            {tx.description}
                          </TableCell>
                          <TableCell className="py-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                paymentStr === "Efectivo"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : paymentStr === "Tarjeta"
                                    ? "bg-blue-500/10 text-blue-600"
                                    : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              {paymentStr}
                            </span>
                          </TableCell>
                          <TableCell
                            className={`text-right font-black text-xs py-3 ${
                              tx.type === "income"
                                ? "text-[#0a354c]"
                                : "text-red-600"
                            }`}
                          >
                            {tx.type === "income" ? "+" : "-"}$
                            {tx.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {currentTransactions.length > 0 && (
                  <div className="flex items-center justify-between p-4 text-xs text-zinc-500 border-t border-zinc-200 bg-zinc-50/50 font-semibold">
                    <div>
                      Mostrando{" "}
                      {Math.min(
                        currentTransactions.length,
                        (currentTxPage - 1) * TX_PER_PAGE + 1,
                      )}{" "}
                      a{" "}
                      {Math.min(
                        currentTransactions.length,
                        currentTxPage * TX_PER_PAGE,
                      )}{" "}
                      de {currentTransactions.length} registros
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentTxPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentTxPage === 1}
                        className="h-7 text-[10px] bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 font-bold"
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentTxPage((p) => Math.min(totalTxPages, p + 1))
                        }
                        disabled={
                          currentTxPage >= totalTxPages || totalTxPages === 0
                        }
                        className="h-7 text-[10px] bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 font-bold"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cash Register History */}
          <div>
            <div className="bg-[#242424] text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider mb-3 rounded-md flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>Historial de Cajas</span>
            </div>
            <div className="overflow-hidden border border-zinc-300 rounded-xl shadow-sm bg-white">
              <Table>
                <TableHeader className="bg-[#242424] hover:bg-[#242424]">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10">
                      APERTURA
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10">
                      CIERRE
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">
                      INICIAL
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">
                      VENTAS
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">
                      RETIROS
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">
                      ESPERADO
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">
                      ENTREGADO
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">
                      DIFERENCIA
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-center">
                      ESTADO
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRegisters.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center py-8 text-zinc-500 font-semibold"
                      >
                        No hay registros de caja
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRegisters.map((register) => {
                      const regTxs = cashTransactions.filter(
                        (t) => t.registerId === register.id,
                      );
                      const ingresosTarjeta =
                        Math.round(
                          regTxs
                            .filter(
                              (t) =>
                                t.type === "income" &&
                                t.description.includes("Tarjeta"),
                            )
                            .reduce((s, t) => s + t.amount, 0) / 10,
                        ) * 10;
                      const ingresosEfectivo =
                        Math.round(
                          regTxs
                            .filter(
                              (t) =>
                                t.type === "income" &&
                                !t.description.includes("Tarjeta"),
                            )
                            .reduce((s, t) => s + t.amount, 0) / 10,
                        ) * 10;
                      const gastosEfectivo =
                        Math.round(
                          regTxs
                            .filter((t) => t.type === "expense")
                            .reduce((s, t) => s + t.amount, 0) / 10,
                        ) * 10;

                      const saldoEsperadoEfectivo =
                        register.openingAmount +
                        ingresosEfectivo -
                        gastosEfectivo;
                      const diferenciaCaja =
                        register.closingAmount !== null
                          ? register.closingAmount - saldoEsperadoEfectivo
                          : null;

                      return (
                        <TableRow
                          key={register.id}
                          className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50"
                        >
                          <TableCell className="text-zinc-800 font-semibold text-xs py-3">
                            {formatDateTime(register.openedAt)}
                          </TableCell>
                          <TableCell className="text-zinc-800 font-semibold text-xs py-3">
                            {register.closedAt
                              ? formatDateTime(register.closedAt)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-zinc-800 font-bold text-xs py-3 text-right">
                            ${register.openingAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-amber-600 font-extrabold text-[10px]">
                                EF: ${ingresosEfectivo.toLocaleString()}
                              </span>
                              <span className="text-blue-600 font-extrabold text-[10px]">
                                TJ: ${ingresosTarjeta.toLocaleString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-red-600 text-right font-extrabold text-xs py-3">
                            ${gastosEfectivo.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-zinc-800 text-right font-extrabold text-xs py-3">
                            ${saldoEsperadoEfectivo.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-zinc-800 text-right font-black text-xs py-3">
                            {register.closingAmount !== null
                              ? `$${register.closingAmount.toLocaleString()}`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right py-3">
                            {diferenciaCaja !== null ? (
                              <span
                                className={`text-[10px] font-black ${diferenciaCaja === 0 ? "text-emerald-600" : diferenciaCaja > 0 ? "text-blue-600" : "text-red-600"}`}
                              >
                                {diferenciaCaja === 0
                                  ? "Cuadrada"
                                  : diferenciaCaja > 0
                                    ? `Sobrante: +$${diferenciaCaja.toLocaleString()}`
                                    : `Faltante: -$${Math.abs(diferenciaCaja).toLocaleString()}`}
                              </span>
                            ) : (
                              <span className="text-zinc-500 font-semibold">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                register.status === "open"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              {register.status === "open"
                                ? "Abierta"
                                : "Cerrada"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between p-4 text-xs text-zinc-500 border-t border-zinc-200 bg-zinc-50/50 font-semibold">
                <div>
                  Mostrando{" "}
                  {Math.min(
                    sortedRegisters.length,
                    (currentPageRegisters - 1) * REGISTERS_PER_PAGE + 1,
                  )}{" "}
                  a{" "}
                  {Math.min(
                    sortedRegisters.length,
                    currentPageRegisters * REGISTERS_PER_PAGE,
                  )}{" "}
                  de {sortedRegisters.length} registros
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPageRegisters((p) => Math.max(1, p - 1))
                    }
                    disabled={currentPageRegisters === 1}
                    className="h-7 text-[10px] bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 font-bold"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPageRegisters((p) =>
                        Math.min(totalRegisterPages, p + 1),
                      )
                    }
                    disabled={
                      currentPageRegisters >= totalRegisterPages ||
                      totalRegisterPages === 0
                    }
                    className="h-7 text-[10px] bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 font-bold"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Open Cash Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden rounded-xl shadow-2xl max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleOpenCash();
            }}
          >
            <DialogHeader className="bg-[#242424] text-white p-4">
              <DialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
                <Unlock className="h-4 w-4" />
                <span>Abrir Caja</span>
              </DialogTitle>
              <DialogDescription className="text-zinc-300 text-xs mt-1">
                Ingrese el monto inicial para comenzar la sesión de caja.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">
                  Monto Inicial ($)
                </Label>
                <Input
                  type="text"
                  value={
                    openingAmount
                      ? Number(openingAmount).toLocaleString("es-CL")
                      : ""
                  }
                  onChange={(e) =>
                    setOpeningAmount(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="0"
                  className="bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-600 font-semibold focus-visible:ring-[#242424]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">
                  Notas (opcional)
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones de apertura..."
                  className="bg-white border border-zinc-300 text-zinc-900 font-semibold focus-visible:ring-[#242424] h-20 resize-none"
                />
              </div>
              {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
            </div>
            <DialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowOpenDialog(false)}
                className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#242424] text-white hover:bg-zinc-800 font-bold h-9 text-xs"
              >
                Abrir Caja
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Cash Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden rounded-xl shadow-2xl max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCloseCash();
            }}
          >
            <DialogHeader className="bg-[#242424] text-white p-4">
              <DialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
                <Lock className="h-4 w-4" />
                <span>Cerrar Caja</span>
              </DialogTitle>
              <DialogDescription className="text-zinc-300 text-xs mt-1">
                Ingrese el monto final contado en caja para cerrar la sesión.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-zinc-800">
                <div className="bg-white border border-zinc-300 rounded-lg p-2.5 flex flex-col justify-center shadow-sm">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
                    Monto Inicial
                  </span>
                  <span className="text-xs font-black">
                    ${currentCashRegister?.openingAmount.toLocaleString()}
                  </span>
                </div>
                <div className="bg-white border border-zinc-300 rounded-lg p-2.5 flex flex-col justify-center shadow-sm">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
                    Total Ventas
                  </span>
                  <span className="text-xs font-black text-[#0a354c]">
                    ${stats.totalSales.toLocaleString()}
                  </span>
                </div>
                <div className="bg-white border border-zinc-300 rounded-lg p-2.5 flex flex-col justify-center shadow-sm">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
                    En Efectivo
                  </span>
                  <span className="text-xs font-black">
                    ${ingresosEfectivo.toLocaleString()}
                  </span>
                </div>
                <div className="bg-white border border-zinc-300 rounded-lg p-2.5 flex flex-col justify-center shadow-sm">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
                    Por Tarjeta
                  </span>
                  <span className="text-xs font-black text-zinc-500">
                    ${ingresosTarjeta.toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2 bg-[#cef3ff] border border-zinc-300 rounded-lg p-2.5 flex justify-between items-center mt-1 shadow-sm">
                  <span className="text-[10px] font-black text-zinc-700 uppercase tracking-wider">
                    Efectivo Físico Esperado
                  </span>
                  <span className="text-base font-black text-[#0a354c]">
                    ${saldoEsperadoEfectivo.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">
                    Monto Físico Contado ($)
                  </Label>
                  {diferenciaCaja !== null && (
                    <span
                      className={`text-[10px] font-black uppercase ${diferenciaCaja === 0 ? "text-emerald-600" : diferenciaCaja > 0 ? "text-blue-600" : "text-red-600"}`}
                    >
                      {diferenciaCaja === 0
                        ? "Caja Cuadrada"
                        : diferenciaCaja > 0
                          ? `Sobrante: +$${diferenciaCaja.toLocaleString()}`
                          : `Faltante: -$${Math.abs(diferenciaCaja).toLocaleString()}`}
                    </span>
                  )}
                </div>
                <Input
                  type="text"
                  value={
                    closingAmount
                      ? Number(closingAmount).toLocaleString("es-CL")
                      : ""
                  }
                  onChange={(e) =>
                    setClosingAmount(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="0"
                  className={`bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-600 font-semibold focus-visible:ring-[#242424] ${diferenciaCaja !== null && diferenciaCaja !== 0 ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">
                  Notas (opcional)
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones de cierre..."
                  className="bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-600 font-semibold focus-visible:ring-[#242424] h-16 resize-none"
                />
              </div>

              <div className="space-y-3 border-t border-zinc-300 pt-4 mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="h-4 w-4 text-red-600" />
                  <h4 className="font-extrabold text-xs text-red-600 uppercase tracking-wider">
                    Autorización de Supervisor
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-zinc-600 font-bold text-[10px] uppercase">
                      Usuario
                    </Label>
                    <Input
                      type="text"
                      value={supervisorUsername}
                      onChange={(e) => setSupervisorUsername(e.target.value)}
                      placeholder="ej. admin"
                      autoComplete="off"
                      className="bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-600 font-semibold focus-visible:ring-[#242424] h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-zinc-600 font-bold text-[10px] uppercase">
                      Contraseña
                    </Label>
                    <Input
                      type="password"
                      value={supervisorPassword}
                      onChange={(e) => setSupervisorPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-600 font-semibold focus-visible:ring-[#242424] h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
            </div>
            <DialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCloseDialog(false)}
                disabled={isVerifying}
                className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isVerifying}
                className="bg-red-600 text-white hover:bg-red-700 font-bold h-9 text-xs"
              >
                {isVerifying ? "Verificando..." : "Cerrar Caja"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Giro de Caja Dialog */}
      <Dialog open={showGiroDialog} onOpenChange={setShowGiroDialog}>
        <DialogContent className="bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden rounded-xl shadow-2xl max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGiro();
            }}
          >
            <DialogHeader className="bg-[#242424] text-white p-4">
              <DialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
                <TrendingDown className="h-4 w-4 text-amber-500" />
                <span>Realizar Retiro de Caja</span>
              </DialogTitle>
              <DialogDescription className="text-zinc-300 text-xs mt-1">
                Retire efectivo de la caja actual. Requiere autorización del
                supervisor.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">
                  Monto a Retirar ($)
                </Label>
                <Input
                  type="text"
                  value={
                    giroAmount ? Number(giroAmount).toLocaleString("es-CL") : ""
                  }
                  onChange={(e) =>
                    setGiroAmount(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="0"
                  className="bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-600 font-semibold focus-visible:ring-[#242424]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">
                  Motivo del Retiro
                </Label>
                <Input
                  type="text"
                  value={giroReason}
                  onChange={(e) => setGiroReason(e.target.value)}
                  placeholder="Ej: Límite de caja excedido, pago a proveedor..."
                  className="bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-600 font-semibold focus-visible:ring-[#242424]"
                />
              </div>

              <div className="space-y-3 border-t border-zinc-300 pt-4 mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <h4 className="font-extrabold text-xs text-amber-600 uppercase tracking-wider">
                    Autorización de Supervisor
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-zinc-600 font-bold text-[10px] uppercase">
                      Usuario
                    </Label>
                    <Input
                      type="text"
                      value={supervisorUsername}
                      onChange={(e) => setSupervisorUsername(e.target.value)}
                      placeholder="ej. admin"
                      autoComplete="off"
                      className="bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-600 font-semibold focus-visible:ring-[#242424] h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-zinc-600 font-bold text-[10px] uppercase">
                      Contraseña
                    </Label>
                    <Input
                      type="password"
                      value={supervisorPassword}
                      onChange={(e) => setSupervisorPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-600 font-semibold focus-visible:ring-[#242424] h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
            </div>
            <DialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowGiroDialog(false)}
                disabled={isVerifying || isProcessingGiro}
                className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isVerifying || isProcessingGiro}
                className="bg-amber-600 text-white hover:bg-amber-700 font-bold h-9 text-xs"
              >
                {isVerifying || isProcessingGiro
                  ? "Procesando..."
                  : "Confirmar Retiro"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Close Register Dialog */}
      <Dialog
        open={showConfirmCloseDialog}
        onOpenChange={setShowConfirmCloseDialog}
      >
        <DialogContent className="bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden rounded-xl shadow-2xl max-w-sm">
          <DialogHeader className="bg-[#242424] text-white p-4">
            <DialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span>Confirmar Cierre de Caja</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-300 text-xs mt-1">
              Por favor, revise el resumen del cierre antes de confirmar.{" "}
              <strong>Esta acción cerrará tu sesión automáticamente.</strong>
            </DialogDescription>
          </DialogHeader>

          {closeSummary && (
            <div className="p-6 space-y-4 text-zinc-800">
              <div className="bg-white border border-zinc-300 rounded-lg p-4 space-y-3 shadow-sm">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-zinc-500">
                    Monto Esperado (Efectivo)
                  </span>
                  <span className="font-extrabold">
                    ${closeSummary.expected.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-zinc-500">
                    Cierre de Caja (Declarado)
                  </span>
                  <span className="font-extrabold">
                    ${closeSummary.declared.toLocaleString()}
                  </span>
                </div>
                <div className="h-px bg-zinc-200 my-1" />
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-zinc-700">Diferencia</span>
                  <span
                    className={`font-black ${closeSummary.difference === 0 ? "text-emerald-600" : closeSummary.difference > 0 ? "text-blue-600" : "text-red-600"}`}
                  >
                    {closeSummary.difference === 0
                      ? "Cuadrada ✓"
                      : closeSummary.difference > 0
                        ? `Sobrante: +$${closeSummary.difference.toLocaleString()}`
                        : `Faltante: -$${Math.abs(closeSummary.difference).toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmCloseDialog(false);
                setShowCloseDialog(true);
              }}
              disabled={isVerifying}
              className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold h-9 text-xs"
            >
              Volver y Editar
            </Button>
            <Button
              onClick={confirmAndExecuteClose}
              disabled={isVerifying}
              className="bg-[#242424] text-white hover:bg-zinc-800 font-bold h-9 text-xs"
            >
              {isVerifying ? "Cerrando Caja..." : "Confirmar y Salir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <WithdrawalTicket ref={withdrawalTicketRef} data={withdrawalData} />
      <ClosureTicket ref={closureTicketRef} data={closureData} />
    </div>
  );
}
