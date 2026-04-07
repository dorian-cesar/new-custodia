'use client'

import { useState } from 'react'
import { Barcode as BarcodeIcon, Hash, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Barcode } from './barcode'
import { type CustodyRecord } from '@/lib/types'

interface ClientRegistrationProps {
  selectedLockerId: string | null
  onGenerateBarcode: () => CustodyRecord | null
  onDeliver: (code: string) => boolean
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

  const handleGenerateBarcode = () => {
    if (!isCashOpen) {
      return
    }
    onGenerateBarcode()
  }

  const handleDeliver = () => {
    setDeliveryError('')
    if (!deliveryCode.trim()) {
      setDeliveryError('Ingrese el codigo de custodia')
      return
    }
    const success = onDeliver(deliveryCode.trim())
    if (success) {
      setDeliveryCode('')
    } else {
      setDeliveryError('Codigo no encontrado o ya entregado')
    }
  }

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
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
            value={selectedLockerId || ''}
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
            Entregar Custodia
          </Label>
          <Input
            value={deliveryCode}
            onChange={(e) => setDeliveryCode(e.target.value)}
            placeholder="Ingrese codigo de custodia"
            className="bg-input"
          />
          {deliveryError && (
            <p className="text-sm text-destructive">{deliveryError}</p>
          )}
          <Button
            onClick={handleDeliver}
            disabled={!isCashOpen}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Key className="h-4 w-4 mr-2" />
            Entrega
          </Button>
        </div>
      </div>
    </div>
  )
}
