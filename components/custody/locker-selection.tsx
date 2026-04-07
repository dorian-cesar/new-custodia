'use client'

import { Grid3X3, Luggage, CreditCard } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LockerGrid } from './locker-grid'
import { type Locker, type LockerSize, LOCKER_SIZES } from '@/lib/types'

interface LockerSelectionProps {
  lockers: Locker[]
  selectedLockerId: number | null
  onSelectLocker: (lockerId: number) => void
  selectedSize: LockerSize | null
  onSelectSize: (size: LockerSize) => void
  clientDocument: string
  onChangeDocument: (document: string) => void
}

export function LockerSelection({
  lockers,
  selectedLockerId,
  onSelectLocker,
  selectedSize,
  onSelectSize,
  clientDocument,
  onChangeDocument,
}: LockerSelectionProps) {
  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center gap-2 mb-6">
        <Grid3X3 className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-card-foreground">Seleccion de Casillero</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Luggage className="h-4 w-4" />
            Tamano del equipaje
          </Label>
          <Select value={selectedSize ?? ""} onValueChange={(v) => onSelectSize(v as LockerSize)}>
            <SelectTrigger className="bg-input">
              <SelectValue placeholder="Seleccione un tamano..." />
            </SelectTrigger>
            <SelectContent>
              {LOCKER_SIZES.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label} - ${size.price.toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            RUT / DNI / Pasaporte
          </Label>
          <Input
            value={clientDocument}
            onChange={(e) => onChangeDocument(e.target.value)}
            placeholder="12345678k"
            className="bg-input"
          />
        </div>
      </div>

      <LockerGrid
        lockers={lockers}
        selectedLockerId={selectedLockerId}
        onSelectLocker={onSelectLocker}
      />
    </div>
  )
}
