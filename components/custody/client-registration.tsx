'use client'

import { useState, useRef, useEffect } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Ticket } from './ticket'
import { Barcode as BarcodeIcon, Hash, Key, AlertTriangle } from 'lucide-react'
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
import { type CustodyRecord } from '@/lib/types'
import { useCustodyStore } from '@/lib/custody-store'

interface ClientRegistrationProps {
  selectedLockerId: number | null
  onGenerateBarcode: () => Promise<CustodyRecord | null>
  onDeliver: (code: string, extraCharge?: number) => Promise<boolean>
  currentRecord: CustodyRecord | null
  isCashOpen: boolean
}

export function ClientRegistration({
  selectedLockerId,
  onGenerateBarcode,
  onDeliver,
  currentRecord,
  isCashOpen,
}: ClientRegistrationProps) {
  const [deliveryCode, setDeliveryCode] = useState('')
  const [deliveryError, setDeliveryError] = useState('')

  // State for Extracharge Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [extraAmount, setExtraAmount] = useState(0)
  const [extraHours, setExtraHours] = useState(0)
  const [pendingRecord, setPendingRecord] = useState<CustodyRecord | null>(null)

  // State for Multiple Records Selection Modal
  const [multiRecords, setMultiRecords] = useState<CustodyRecord[]>([])
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false)

  const ticketRef = useRef<HTMLDivElement>(null)
  const [lastPrintedId, setLastPrintedId] = useState<number | null>(null)

  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: 'Ticket_Custodia',
  })

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
  const selectedLocker = lockers.find(l => l.id === selectedLockerId)
  const displayLockerName = selectedLocker ? `${selectedLocker.row},${selectedLocker.col}` : ''

  const handleGenerateBarcode = () => {
    if (!isCashOpen) {
      return
    }
    onGenerateBarcode()
  }

  const processDelivery = (record: CustodyRecord) => {
    setIsMultiModalOpen(false)
    const diffMs = Date.now() - new Date(record.entryTime).getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    let extraH = 0
    let amount = 0
    
    if (diffHours > 24) {
      extraH = diffHours - 24
      amount = Math.round((record.price / 24) * extraH)
    }

    setExtraHours(extraH > 0 ? extraH : 0)
    setExtraAmount(amount > 0 ? amount : 0)
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

  const confirmDelivery = async (code: string, extraCharge: number) => {
    const success = await onDeliver(code, extraCharge)
    if (success) {
      setDeliveryCode('')
      setPendingRecord(null)
      setIsModalOpen(false)
    } else {
      setDeliveryError('Error procesando la entrega')
    }
  }

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <Ticket ref={ticketRef} record={currentRecord} />
      
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
          disabled={!selectedLockerId || !isCashOpen}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          <BarcodeIcon className="h-4 w-4 mr-2" />
          Generar Codigo de Barras
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
              <div className="flex justify-center items-center p-4">
                <span className="text-primary font-medium text-lg">Sin recargos adicionales</span>
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
              className={extraAmount > 0 ? "bg-primary hover:bg-primary/90" : "bg-primary hover:bg-primary/90"}
              onClick={() => pendingRecord && confirmDelivery(pendingRecord.code, extraAmount)}
            >
              {extraAmount > 0 ? 'Confirmar Pago y Entregar' : 'Entregar Maleta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MULTIPLE RECORDS MODAL */}
      <Dialog open={isMultiModalOpen} onOpenChange={setIsMultiModalOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
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
