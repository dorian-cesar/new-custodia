'use client'

import { Grid3X3, Luggage, CreditCard, Briefcase, Backpack, Package, Archive } from 'lucide-react'
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
import { type Locker, type LockerSize } from '@/lib/types'
import { useCustodyStore } from '@/lib/custody-store'

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
  const lockerSizes = useCustodyStore((state) => state.lockerSizes)

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center gap-2 mb-6">
        <Grid3X3 className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-card-foreground">Seleccion de Casillero</h2>
      </div>

      <div className="space-y-6 mb-6">
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Luggage className="h-4 w-4" />
            Tamano del equipaje
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {lockerSizes.map((size) => {
              let Icon = Luggage
              let iconSize = "h-5 w-5"
              let textSize = "text-sm"
              
              if (size.value === 'S') {
                Icon = Briefcase
                iconSize = "h-5 w-5"
                textSize = "text-sm"
              } else if (size.value === 'M') {
                Icon = Backpack
                iconSize = "h-6 w-6"
                textSize = "text-base"
              } else if (size.value === 'L') {
                Icon = Package
                iconSize = "h-7 w-7"
                textSize = "text-lg"
              } else if (size.value === 'XL' || size.value === 'XXL') {
                Icon = Archive
                iconSize = "h-8 w-8"
                textSize = "text-lg"
              }

              const isSelected = selectedSize === size.value

              return (
                <button
                  key={size.value}
                  onClick={() => onSelectSize(size.value as LockerSize)}
                  className={`
                    relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
                    ${isSelected 
                      ? 'border-white bg-primary text-primary-foreground shadow-lg scale-[1.04]' 
                      : 'border-transparent bg-primary/70 hover:bg-primary text-primary-foreground/90 hover:scale-[1.02]'
                    }
                  `}
                >
                  <Icon className={`${iconSize} mb-2 text-primary-foreground`} />
                  <span className={`font-semibold text-primary-foreground ${textSize} text-center`}>
                    {size.label.split('-')[0].trim()}
                  </span>
                  <span className={`mt-1 font-bold text-primary-foreground text-sm`}>
                    ${size.price.toLocaleString()}
                  </span>
                </button>
              )
            })}
          </div>
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
            className="bg-input max-w-md"
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
