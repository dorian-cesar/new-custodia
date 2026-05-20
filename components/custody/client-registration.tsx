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
  
  const getRecordByCode = useCustodyStore((state) => state.getRecordByCode)
  const lockers = useCustodyStore((state) => state.lockers)
  const selectedLocker = lockers.find(l => l.id === selectedLockerId)
  const displayLockerName = selectedLocker ? `${selectedLocker.row},${selectedLocker.col}` : ''

  const handleGenerateBarcode = () => {
    if (!isCashOpen) {
      return
    }
    onGenerateBarcode()
  }

  const handleDeliverClick = () => {
    setDeliveryError('')
    if (!deliveryCode.trim()) {
      setDeliveryError('Ingrese el código de custodia o RUT del cliente')
      return
    }

    const input = deliveryCode.trim()
    const record = getRecordByCode(input)

    if (!record) {
      setDeliveryError('Código o RUT no encontrado, o custodia ya entregada')
      return
    }

    const diffMs = Date.now() - new Date(record.entryTime).getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours > 24) {
      const extraH = diffHours - 24
      const amount = Math.round((record.price / 24) * extraH)
      
      if (amount > 0) {
        setExtraHours(extraH)
        setExtraAmount(amount)
        setPendingRecord(record)
        setIsModalOpen(true)
        return
      }
    }

    // Entrega directa si <= 24h — usa record.code (no el input del usuario)
    confirmDelivery(record.code, 0)
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

      {/* Exceeding Time Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Recargo por Exceso de Tiempo
            </DialogTitle>
            <DialogDescription>
              Este equipaje superó el límite de 24 horas y tiene un cargo extra proporcional.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Horas adicionales:</span>
              <span className="font-medium">{extraHours.toFixed(2)} hrs</span>
            </div>
            <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
              <span className="font-semibold text-lg">Total extra a cobrar:</span>
              <span className="font-bold text-2xl text-destructive">${extraAmount.toLocaleString()}</span>
            </div>
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
              onClick={() => pendingRecord && confirmDelivery(pendingRecord.code, extraAmount)}
            >
              Confirmar Pago y Entregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
