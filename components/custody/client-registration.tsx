'use client'

import { useState, useRef, useEffect } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Ticket } from './ticket'
import { DeliveryTicket } from './delivery-ticket'
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
}

export function ClientRegistration({
  selectedLockerId,
  selectedSize,
  clientDocument,
  onGenerateBarcode,
  onDeliver,
  currentRecord,
  isCashOpen,
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

  // Reset cashReceived when modal or pendingRecord changes
  useEffect(() => {
    setCashReceived(0)
  }, [pendingRecord, isModalOpen])

  useEffect(() => {
    // Automatically print when a *new* record is generated and received
    if (currentRecord && currentRecord.id !== lastPrintedId) {
      // Small delay to allow SVG Barcode inside Ticket to render completely
      const timer = setTimeout(() => {
        handlePrint()
        setLastPrintedId(currentRecord.id)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentRecord, lastPrintedId, handlePrint])
  
  const getActiveRecordsByInput = useCustodyStore((state) => state.getActiveRecordsByInput)
  const lockers = useCustodyStore((state) => state.lockers)
  const lockerSizes = useCustodyStore((state) => state.lockerSizes)
  const selectedLocker = lockers.find(l => l.id === selectedLockerId)
  const displayLockerName = selectedLocker ? `${selectedLocker.row},${selectedLocker.col}` : ''
  const selectedSizeInfo = lockerSizes.find(s => s.value === selectedSize)
  const entryPrice = selectedSizeInfo ? selectedSizeInfo.price : 0

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
      const rawAmount = (record.price / 24) * extraH
      // Ley de redondeo en Chile (redondeo a la decena más cercana)
      amount = Math.round(rawAmount / 10) * 10
    }

    setExtraHours(extraH > 0 ? extraH : 0)
    setExtraAmount(amount > 0 ? amount : 0)
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
        handlePrintDelivery()
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
    <div className="bg-card rounded-xl p-6 border border-border">
      <Ticket ref={ticketRef} record={currentRecord} paymentMethod={entryPaymentMethod} />
      <DeliveryTicket ref={deliveryTicketRef} record={pendingRecord} extraHours={extraHours} extraAmount={extraAmount} paymentMethod={paymentMethod} extraFolio={extraFolioState} authCode={exitAuthCode} opNumber={exitOpNumber} />
      
      <div className="flex items-center gap-2 mb-6">
        <BarcodeIcon className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-card-foreground">Registro de Cliente</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="h-4 w-4" />
            Casillero Seleccionado
          </Label>
          <Input
            value={displayLockerName}
            readOnly
            placeholder="Seleccione un casillero en la matriz"
            className="bg-input"
          />
        </div>

        <Button
          onClick={handleGenerateBarcode}
          disabled={!isCashOpen}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <BarcodeIcon className="h-4 w-4 mr-2" />
          Cobrar y Generar Custodia
        </Button>

        {!isCashOpen && (
          <p className="text-sm text-destructive text-center">
            Debe abrir la caja para registrar custodias
          </p>
        )}

        <div className="py-2">
          <Barcode value={currentRecord?.code || ''} />
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <Label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Key className="h-4 w-4" />
            Entregar Custodia (Código o RUT)
          </Label>
          <Input
            value={deliveryCode}
            onChange={(e) => setDeliveryCode(e.target.value)}
            placeholder="Código de barras o RUT / DNI"
            className="bg-input"
          />
          {deliveryError && (
            <p className="text-sm text-destructive">{deliveryError}</p>
          )}
          <Button
            onClick={handleDeliverClick}
            disabled={!isCashOpen}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Key className="h-4 w-4 mr-2" />
            Entrega
          </Button>
        </div>
      </div>

      {/* Entry Payment Confirmation Modal */}
      <Dialog open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Pago de Custodia
            </DialogTitle>
            <DialogDescription>
              Confirme el cobro antes de generar el ticket y abrir el casillero.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            <div className="bg-secondary/20 p-4 rounded-lg space-y-2 text-sm mb-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-mono">{clientDocument}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Casillero:</span>
                <span>{displayLockerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tamaño:</span>
                <span>{selectedSizeInfo?.label}</span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
              <span className="font-semibold text-lg">Total a cobrar:</span>
              <span className="font-bold text-2xl text-primary">${entryPrice.toLocaleString()}</span>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label className="text-sm font-semibold text-muted-foreground">Medio de Pago</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={entryPaymentMethod === 'Efectivo' ? 'default' : 'outline'}
                  className={`flex items-center justify-center gap-2 h-12 text-sm font-medium transition-all ${
                    entryPaymentMethod === 'Efectivo' 
                      ? 'bg-primary text-primary-foreground border-transparent hover:bg-primary/90 shadow-md scale-[1.02]' 
                      : 'bg-card border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setEntryPaymentMethod('Efectivo')}
                >
                  <Coins className="h-5 w-5" />
                  Efectivo
                </Button>
                <Button
                  type="button"
                  variant={entryPaymentMethod === 'Tarjeta' ? 'default' : 'outline'}
                  className={`flex items-center justify-center gap-2 h-12 text-sm font-medium transition-all ${
                    entryPaymentMethod === 'Tarjeta' 
                      ? 'bg-primary text-primary-foreground border-transparent hover:bg-primary/90 shadow-md scale-[1.02]' 
                      : 'bg-card border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setEntryPaymentMethod('Tarjeta')}
                >
                  <CreditCard className="h-5 w-5" />
                  Tarjeta
                </Button>
              </div>

              {entryPaymentMethod === 'Efectivo' && entryPrice > 0 && (
                <div className="space-y-2 mt-3 p-3 bg-secondary/10 border border-border rounded-lg animate-in fade-in slide-in-from-top-1">
                  <Label htmlFor="entryCashReceived" className="text-xs font-semibold text-muted-foreground">Efectivo Recibido</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-muted-foreground text-sm font-medium">$</span>
                    <Input
                      id="entryCashReceived"
                      type="text"
                      value={entryCashReceived === 0 ? '' : entryCashReceived.toLocaleString('es-CL')}
                      onChange={(e) => {
                        const val = Number(e.target.value.replace(/\D/g, ''));
                        setEntryCashReceived(val);
                      }}
                      placeholder="Monto entregado por el cliente"
                      className="pl-7 bg-card h-9 text-sm"
                    />
                  </div>
                  {entryCashReceived > 0 && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-border text-xs">
                      <span className="font-medium text-muted-foreground">Vuelto a entregar:</span>
                      <span className={`font-bold text-sm ${entryCashReceived - entryPrice >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {entryCashReceived - entryPrice >= 0
                          ? `$${(entryCashReceived - entryPrice).toLocaleString('es-CL')}`
                          : 'Monto insuficiente'
                        }
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEntryModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90"
              onClick={confirmEntryPayment}
              disabled={isProcessingCard}
            >
              {isProcessingCard ? 'Esperando POS...' : 'Confirmar Pago y Generar Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Confirmation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {extraAmount > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Recargo por Exceso de Tiempo
                </>
              ) : (
                <>
                  <Key className="h-5 w-5 text-primary" />
                  Confirmar Entrega
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {extraAmount > 0 
                ? 'Este equipaje superó el límite de 24 horas y tiene un cargo extra proporcional.'
                : 'Revise los detalles antes de entregar la maleta al cliente.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            {pendingRecord && (() => {
              const pLocker = lockers.find(l => l.id === pendingRecord.lockerId)
              return (
                <div className="bg-secondary/20 p-4 rounded-lg space-y-2 text-sm mb-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Código:</span>
                    <span className="font-mono">{pendingRecord.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Casillero:</span>
                    <span>{pLocker ? `${pLocker.row},${pLocker.col}` : pendingRecord.lockerId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tamaño:</span>
                    <span>{pendingRecord.size}</span>
                  </div>
                </div>
              )
            })()}

            {extraAmount > 0 ? (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Horas adicionales:</span>
                  <span className="font-medium">{extraHours.toFixed(2)} hrs</span>
                </div>
                <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
                  <span className="font-semibold text-lg">Total extra a cobrar:</span>
                  <span className="font-bold text-2xl text-destructive">${extraAmount.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col justify-center items-center p-4 border border-dashed border-border rounded-lg bg-secondary/10">
                <span className="text-muted-foreground font-medium text-sm">Sin recargos adicionales</span>
              </div>
            )}

            {extraAmount > 0 && (
              <div className="space-y-2 border-t border-border pt-4">
                <Label className="text-sm font-semibold text-muted-foreground">Medio de Pago</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={paymentMethod === 'Efectivo' ? 'default' : 'outline'}
                    className={`flex items-center justify-center gap-2 h-12 text-sm font-medium transition-all ${
                      paymentMethod === 'Efectivo' 
                        ? 'bg-primary text-primary-foreground border-transparent hover:bg-primary/90 shadow-md scale-[1.02]' 
                        : 'bg-card border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setPaymentMethod('Efectivo')}
                  >
                    <Coins className="h-5 w-5" />
                    Efectivo
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === 'Tarjeta' ? 'default' : 'outline'}
                    className={`flex items-center justify-center gap-2 h-12 text-sm font-medium transition-all ${
                      paymentMethod === 'Tarjeta' 
                        ? 'bg-primary text-primary-foreground border-transparent hover:bg-primary/90 shadow-md scale-[1.02]' 
                        : 'bg-card border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setPaymentMethod('Tarjeta')}
                  >
                    <CreditCard className="h-5 w-5" />
                    Tarjeta
                  </Button>
                </div>

              {paymentMethod === 'Efectivo' && extraAmount > 0 && (
                <div className="space-y-2 mt-3 p-3 bg-secondary/10 border border-border rounded-lg animate-in fade-in slide-in-from-top-1">
                  <Label htmlFor="cashReceived" className="text-xs font-semibold text-muted-foreground">Efectivo Recibido</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-muted-foreground text-sm font-medium">$</span>
                    <Input
                      id="cashReceived"
                      type="text"
                      value={cashReceived === 0 ? '' : cashReceived.toLocaleString('es-CL')}
                      onChange={(e) => {
                        const val = Number(e.target.value.replace(/\D/g, ''));
                        setCashReceived(val);
                      }}
                      placeholder="Monto entregado por el cliente"
                      className="pl-7 bg-card h-9 text-sm"
                    />
                  </div>
                  {cashReceived > 0 && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-border text-xs">
                      <span className="font-medium text-muted-foreground">Vuelto a entregar:</span>
                      <span className={`font-bold text-sm ${cashReceived - extraAmount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {cashReceived - extraAmount >= 0
                          ? `$${(cashReceived - extraAmount).toLocaleString('es-CL')}`
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

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90"
              onClick={() => pendingRecord && confirmDelivery(pendingRecord.code, extraAmount, paymentMethod)}
              disabled={isProcessingCard}
            >
              {isProcessingCard ? 'Esperando POS...' : (extraAmount > 0 ? 'Confirmar Pago y Entregar' : 'Entregar Maleta')}
            </Button>
          </DialogFooter>
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
                      <td className="px-4 py-3">{locker ? `${locker.row},${locker.col}` : r.lockerId}</td>
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
