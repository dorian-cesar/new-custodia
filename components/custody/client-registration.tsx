'use client'

import { useState, useRef, useEffect } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Ticket } from './ticket'
import { DeliveryTicket } from './delivery-ticket'
import { printerService } from '@/lib/printer-service'
import { Barcode as BarcodeIcon, Hash, Key, AlertTriangle, Coins, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Barcode } from './barcode'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type CustodyRecord, type LockerSize } from '@/lib/types'
import { useCustodyStore } from '@/lib/custody-store'
import { sendBoleta } from '@/app/actions/db-actions'

interface ClientRegistrationProps {
  selectedLockerId: number | null
  selectedSize?: LockerSize | null
  clientDocument?: string
  onGenerateBarcode: (paymentMethod: string) => Promise<CustodyRecord | null>
  onDeliver: (code: string, extraCharge?: number, paymentMethod?: string, extraFolio?: number | null) => Promise<boolean>
  currentRecord: CustodyRecord | null
  isCashOpen: boolean
  mode?: 'entrega' | 'retiro'
}

export function ClientRegistration({
  selectedLockerId,
  selectedSize,
  clientDocument,
  onGenerateBarcode,
  onDeliver,
  currentRecord,
  isCashOpen,
  mode = 'entrega',
}: ClientRegistrationProps) {
  const [deliveryCode, setDeliveryCode] = useState('')
  const [deliveryError, setDeliveryError] = useState('')

  // State for Entry Payment Modal
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [entryPaymentMethod, setEntryPaymentMethod] = useState<'Efectivo' | 'Tarjeta'>('Efectivo')
  const [entryCashReceived, setEntryCashReceived] = useState<number>(0)

  // State for Extracharge Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProcessingCard, setIsProcessingCard] = useState(false)
  const [extraAmount, setExtraAmount] = useState(0)
  const [extraHours, setExtraHours] = useState(0)
  const [pendingRecord, setPendingRecord] = useState<CustodyRecord | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta'>('Efectivo')
  const [extraFolioState, setExtraFolioState] = useState<number | null>(null)
  const [cashReceived, setCashReceived] = useState<number>(0)
  const [exitAuthCode, setExitAuthCode] = useState<string | null>(null)
  const [exitOpNumber, setExitOpNumber] = useState<string | null>(null)

  // State for Multiple Records Selection Modal
  const [multiRecords, setMultiRecords] = useState<CustodyRecord[]>([])
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false)

  const ticketRef = useRef<HTMLDivElement>(null)
  const deliveryTicketRef = useRef<HTMLDivElement>(null)
  const [lastPrintedId, setLastPrintedId] = useState<number | null>(null)

  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: 'Ticket_Custodia',
  })

  const handlePrintDelivery = useReactToPrint({
    contentRef: deliveryTicketRef,
    documentTitle: 'Ticket_Retiro',
  })

  const getActiveRecordsByInput = useCustodyStore((state) => state.getActiveRecordsByInput)
  const lockers = useCustodyStore((state) => state.lockers)
  const lockerSizes = useCustodyStore((state) => state.lockerSizes)
  const selectedLocker = lockers.find(l => l.id === selectedLockerId)
  const displayLockerName = selectedLocker ? `${selectedLocker.col}${selectedLocker.row}` : ''
  const selectedSizeInfo = lockerSizes.find(s => s.value === selectedSize)
  const entryPrice = selectedSizeInfo ? selectedSizeInfo.price : 0

  // Reset cashReceived when modal or pendingRecord changes
  useEffect(() => {
    setCashReceived(0)
  }, [pendingRecord, isModalOpen])

  useEffect(() => {
    // Automatically print when a *new* record is generated and received
    if (currentRecord && currentRecord.id !== lastPrintedId) {
      if (printerService.isNative()) {
        const sizeLabel = lockerSizes.find((s) => s.value === currentRecord.size)?.label || currentRecord.size
        const locker = lockers.find((l) => l.id === currentRecord.lockerId)
        const lockerDisplay = locker ? `${locker.col}${locker.row}` : currentRecord.lockerId.toString()
        printerService.printEntryTicket(currentRecord, sizeLabel, lockerDisplay, entryPaymentMethod)
        setLastPrintedId(currentRecord.id)
      } else {
        // Small delay to allow SVG Barcode inside Ticket to render completely
        const timer = setTimeout(() => {
          handlePrint()
          setLastPrintedId(currentRecord.id)
        }, 500)
        return () => clearTimeout(timer)
      }
    }
  }, [currentRecord, lastPrintedId, handlePrint, lockers, lockerSizes, entryPaymentMethod])


  const handleGenerateBarcode = () => {
    if (!isCashOpen) {
      alert("Debes abrir la caja antes de poder realizar cobros.");
      return
    }
    if (!selectedLockerId || !selectedSize || !clientDocument?.trim()) {
      alert("Por favor, selecciona un casillero, el tamaño del equipaje y escribe el RUT del cliente antes de cobrar.");
      return
    }
    setEntryPaymentMethod('Efectivo')
    setEntryCashReceived(0)
    setIsEntryModalOpen(true)
  }

  const confirmEntryPayment = async () => {
    if (entryPaymentMethod === 'Efectivo') {
      if (!entryCashReceived) {
        alert("Por favor ingrese el monto de efectivo recibido para poder calcular el vuelto.");
        return;
      }
      if (entryCashReceived < entryPrice) {
        alert("El efectivo recibido es menor al monto a cobrar.");
        return;
      }
    }

    setIsEntryModalOpen(false)
    await onGenerateBarcode(entryPaymentMethod)
  }

  const processDelivery = (record: CustodyRecord) => {
    setIsMultiModalOpen(false)
    const diffMs = Date.now() - new Date(record.entryTime).getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    let extraH = 0
    let amount = 0
    
    if (diffHours > 24) {
      extraH = diffHours - 24
      // Recargo fijo de Gs. 5.000 por cada bloque o fracción adicional de 24 horas
      amount = Math.ceil(extraH / 24) * 5000
    }

    setExtraHours(extraH > 0 ? extraH : 0)
    setExtraAmount(amount > 0 ? amount : 0)
    setPaymentMethod('Efectivo')
    setPendingRecord(record)
    setIsModalOpen(true)
  }

  const handleDeliverClick = () => {
    setDeliveryError('')
    if (!deliveryCode.trim()) {
      setDeliveryError('Ingrese el código de custodia o RUT del cliente')
      return
    }

    const input = deliveryCode.trim()
    const records = getActiveRecordsByInput(input)

    if (records.length === 0) {
      setDeliveryError('Código o RUT no encontrado, o custodia ya entregada')
      return
    }

    if (records.length === 1) {
      processDelivery(records[0])
    } else {
      setMultiRecords(records)
      setIsMultiModalOpen(true)
    }
  }

  const confirmDelivery = async (code: string, extraCharge: number, method: 'Efectivo' | 'Tarjeta') => {
    if (method === 'Efectivo' && extraCharge > 0) {
      if (!cashReceived) {
        alert("Por favor ingrese el monto de efectivo recibido para poder calcular el vuelto.");
        return;
      }
      if (cashReceived < extraCharge) {
        alert("El efectivo recibido es menor al recargo a cobrar.");
        return;
      }
    }

    const token = useCustodyStore.getState().currentUser?.token || ''
    let extraFolio: number | null = null

    if (extraCharge > 0 && token) {
      try {
        const boletaRes = await sendBoleta("Recargo Custodia", extraCharge, token)
        if (boletaRes.success && boletaRes.data) {
          extraFolio = boletaRes.data.folio
        }
      } catch (err) {
        console.error("Error al emitir boleta de recargo:", err)
      }
    }

    setExtraFolioState(extraFolio)
    // Breve retraso para permitir actualización del estado antes de imprimir y entregar
    setTimeout(async () => {
      if (pendingRecord) {
        if (printerService.isNative()) {
          const sizeLabel = lockerSizes.find((s) => s.value === pendingRecord.size)?.label || pendingRecord.size
          const locker = lockers.find((l) => l.id === pendingRecord.lockerId)
          const lockerDisplay = locker ? `${locker.col}${locker.row}` : pendingRecord.lockerId.toString()
          await printerService.printDeliveryTicket(
            pendingRecord,
            sizeLabel,
            lockerDisplay,
            method,
            extraHours,
            extraCharge,
            extraFolio
          )
        } else {
          handlePrintDelivery()
        }
      }

      const success = await onDeliver(code, extraCharge, method, extraFolio)
      if (success) {
        setDeliveryCode('')
        setPendingRecord(null)
        setIsModalOpen(false)
        setExtraFolioState(null)
      } else {
        setDeliveryError('Error procesando la entrega')
      }
    }, 150)
  }

  return (
    <div className="bg-[#d7d7d8] px-4 pb-4">
      <Ticket ref={ticketRef} record={currentRecord} paymentMethod={entryPaymentMethod} />
      <DeliveryTicket ref={deliveryTicketRef} record={pendingRecord} extraHours={extraHours} extraAmount={extraAmount} paymentMethod={paymentMethod} extraFolio={extraFolioState} authCode={exitAuthCode} opNumber={exitOpNumber} />
      
      {mode === 'entrega' ? (
        <div className="w-full flex flex-col items-center">
          <button
            type="button"
            onClick={handleGenerateBarcode}
            disabled={!isCashOpen}
            className="w-full max-w-[320px] bg-[#242424] hover:bg-[#323232] disabled:bg-zinc-500 disabled:cursor-not-allowed text-white text-lg font-bold py-3.5 px-6 rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md select-none mt-2 text-center"
          >
            GENERAR CÓDIGO
          </button>
          {!isCashOpen && (
            <p className="text-xs font-semibold text-destructive text-center mt-2 animate-pulse">
              Debe abrir la caja para registrar custodias
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <div className="bg-[#242424] text-white py-1 px-4 text-xs font-bold uppercase tracking-wider mb-3">
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
              <p className="text-xs font-semibold text-destructive mt-1.5">{deliveryError}</p>
            )}
          </div>
          <div className="w-full flex flex-col items-center">
            <button
              type="button"
              onClick={handleDeliverClick}
              disabled={!isCashOpen}
              className="w-full max-w-[320px] bg-[#242424] hover:bg-[#323232] disabled:bg-zinc-500 disabled:cursor-not-allowed text-white text-lg font-bold py-3.5 px-6 rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md select-none mt-2 text-center"
            >
              BUSCAR Y RETIRAR
            </button>
            {!isCashOpen && (
              <p className="text-xs font-semibold text-destructive text-center mt-2 animate-pulse">
                Debe abrir la caja para retirar custodias
              </p>
            )}
          </div>
        </div>
      )}

      {/* Entry Payment Confirmation Modal */}
      <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden">
          <div className="bg-[#242424] text-white py-3 px-6 flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-wide flex items-center gap-2">
              <Coins className="h-5 w-5 text-[#00c5ff]" />
              PAGO DE CUSTODIA
            </h3>
          </div>
          
          <div className="px-6 py-4 flex flex-col gap-4">
            <div className="bg-white border border-zinc-300 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between font-semibold text-zinc-700">
                <span>Cliente:</span>
                <span className="font-mono text-zinc-900">{clientDocument}</span>
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
              <span className="font-bold text-zinc-800 text-lg">Total a cobrar:</span>
              <span className="font-black text-2xl text-[#0a354c]">Gs. {entryPrice.toLocaleString('es-CL')}</span>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-700">Medio de Pago</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className={`flex items-center justify-center gap-2 h-12 text-sm font-bold rounded-xl border border-zinc-400 transition-all cursor-pointer ${
                    entryPaymentMethod === 'Efectivo' 
                      ? 'bg-[#0a354c] text-white shadow-md' 
                      : 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'
                  }`}
                  onClick={() => setEntryPaymentMethod('Efectivo')}
                >
                  <Coins className="h-5 w-5" />
                  Efectivo
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center gap-2 h-12 text-sm font-bold rounded-xl border border-zinc-400 transition-all cursor-pointer ${
                    entryPaymentMethod === 'Tarjeta' 
                      ? 'bg-[#1588b3] text-white shadow-md' 
                      : 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'
                  }`}
                  onClick={() => setEntryPaymentMethod('Tarjeta')}
                >
                  <CreditCard className="h-5 w-5" />
                  Tarjeta
                </button>
              </div>

              {entryPaymentMethod === 'Efectivo' && entryPrice > 0 && (
                <div className="space-y-2 mt-3 p-3 bg-white border border-zinc-300 rounded-lg animate-in fade-in slide-in-from-top-1">
                  <Label htmlFor="entryCashReceived" className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Efectivo Recibido</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-zinc-500 text-sm font-semibold">Gs.</span>
                    <input
                      id="entryCashReceived"
                      type="text"
                      value={entryCashReceived === 0 ? '' : entryCashReceived.toLocaleString('es-CL')}
                      onChange={(e) => {
                        const val = Number(e.target.value.replace(/\D/g, ''));
                        setEntryCashReceived(val);
                      }}
                      placeholder="Monto entregado por el cliente"
                      className="pl-7 bg-white border border-zinc-300 rounded-md w-full h-9 text-sm font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#00c5ff]"
                    />
                  </div>
                  {entryCashReceived > 0 && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-zinc-300 text-xs font-semibold">
                      <span className="text-zinc-500">Vuelto a entregar:</span>
                      <span className={`text-sm font-bold ${entryCashReceived - entryPrice >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {entryCashReceived - entryPrice >= 0
                          ? `Gs. ${(entryCashReceived - entryPrice).toLocaleString('es-CL')}`
                          : 'Monto insuficiente'
                        }
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
              {isProcessingCard ? 'Esperando POS...' : 'Confirmar Pago'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery Confirmation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden">
          <div className="bg-[#242424] text-white py-3 px-6 flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-wide flex items-center gap-2">
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
            </h3>
          </div>
          
          <div className="px-6 py-4 flex flex-col gap-4">
            {pendingRecord && (() => {
              const pLocker = lockers.find(l => l.id === pendingRecord.lockerId)
              return (
                <div className="bg-white border border-zinc-300 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between font-semibold text-zinc-700">
                    <span>Código:</span>
                    <span className="font-mono text-zinc-900">{pendingRecord.code}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-zinc-700">
                    <span>Casillero:</span>
                    <span className="text-zinc-900">{pLocker ? `${pLocker.col}${pLocker.row}` : pendingRecord.lockerId}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-zinc-700">
                    <span>Tamaño:</span>
                    <span className="text-zinc-900">{pendingRecord.size}</span>
                  </div>
                </div>
              )
            })()}

            {extraAmount > 0 ? (
              <>
                <div className="flex justify-between items-center text-sm px-1 font-semibold text-zinc-700">
                  <span>Horas adicionales:</span>
                  <span className="font-bold text-zinc-900">{extraHours.toFixed(2)} hrs</span>
                </div>
                <div className="flex justify-between items-center bg-white border border-zinc-300 p-4 rounded-lg select-none">
                  <span className="font-bold text-zinc-800 text-lg">Total extra a cobrar:</span>
                  <span className="font-black text-2xl text-rose-600">Gs. {extraAmount.toLocaleString('es-CL')}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col justify-center items-center p-4 border border-zinc-300 rounded-lg bg-white select-none">
                <span className="text-zinc-500 font-bold text-sm">Sin recargos adicionales</span>
              </div>
            )}

            {extraAmount > 0 && (
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-700">Medio de Pago</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`flex items-center justify-center gap-2 h-12 text-sm font-bold rounded-xl border border-zinc-400 transition-all cursor-pointer ${
                      paymentMethod === 'Efectivo' 
                        ? 'bg-[#0a354c] text-white shadow-md' 
                        : 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'
                    }`}
                    onClick={() => setPaymentMethod('Efectivo')}
                  >
                    <Coins className="h-5 w-5" />
                    Efectivo
                  </button>
                  <button
                    type="button"
                    className={`flex items-center justify-center gap-2 h-12 text-sm font-bold rounded-xl border border-zinc-400 transition-all cursor-pointer ${
                      paymentMethod === 'Tarjeta' 
                        ? 'bg-[#1588b3] text-white shadow-md' 
                        : 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'
                    }`}
                    onClick={() => setPaymentMethod('Tarjeta')}
                  >
                    <CreditCard className="h-5 w-5" />
                    Tarjeta
                  </button>
                </div>

                {paymentMethod === 'Efectivo' && extraAmount > 0 && (
                  <div className="space-y-2 mt-3 p-3 bg-white border border-zinc-300 rounded-lg animate-in fade-in slide-in-from-top-1">
                    <Label htmlFor="cashReceived" className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Efectivo Recibido</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-zinc-500 text-sm font-semibold">Gs.</span>
                      <input
                        id="cashReceived"
                        type="text"
                        value={cashReceived === 0 ? '' : cashReceived.toLocaleString('es-CL')}
                        onChange={(e) => {
                          const val = Number(e.target.value.replace(/\D/g, ''));
                          setCashReceived(val);
                        }}
                        placeholder="Monto entregado por el cliente"
                        className="pl-7 bg-white border border-zinc-300 rounded-md w-full h-9 text-sm font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#00c5ff]"
                      />
                    </div>
                    {cashReceived > 0 && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-zinc-300 text-xs font-semibold">
                        <span className="text-zinc-500">Vuelto a entregar:</span>
                        <span className={`text-sm font-bold ${cashReceived - extraAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {cashReceived - extraAmount >= 0
                            ? `Gs. ${(cashReceived - extraAmount).toLocaleString('es-CL')}`
                            : 'Monto insuficiente'
                          }
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
              onClick={() => pendingRecord && confirmDelivery(pendingRecord.code, extraAmount, paymentMethod)}
              disabled={isProcessingCard}
            >
              {isProcessingCard ? 'Esperando POS...' : (extraAmount > 0 ? 'Confirmar Pago' : 'Entregar Maleta')}
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
              El RUT ingresado tiene varios casilleros activos. Seleccione cuál desea entregar:
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
                  const locker = lockers.find(l => l.id === r.lockerId)
                  return (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="px-4 py-3 font-mono">{r.code}</td>
                      <td className="px-4 py-3">{locker ? `${locker.col}${locker.row}` : r.lockerId}</td>
                      <td className="px-4 py-3">{r.size}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.entryTime).toLocaleString('es-CL')}
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
                  )
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsMultiModalOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
