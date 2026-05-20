'use client'

import React, { forwardRef } from 'react'
import { type CustodyRecord, formatDateTime } from '@/lib/types'
import { useCustodyStore } from '@/lib/custody-store'

interface DeliveryTicketProps {
  record: CustodyRecord | null
  extraHours: number
  extraAmount: number
}

export const DeliveryTicket = forwardRef<HTMLDivElement, DeliveryTicketProps>(
  ({ record, extraHours, extraAmount }, ref) => {
    const lockers = useCustodyStore((state) => state.lockers)
    const lockerSizes = useCustodyStore((state) => state.lockerSizes)

    if (!record) return null

    const sizeLabel = lockerSizes.find((s) => s.value === record.size)?.label || record.size
    const locker = lockers.find((l) => l.id === record.lockerId)
    const lockerDisplay = locker ? `${locker.row},${locker.col}` : record.lockerId

    return (
      <div style={{ display: 'none' }}>
        <div
          ref={ref}
          style={{
            width: '56mm', // Fits loosely in 58mm
            padding: '2mm',
            margin: 0,
            background: 'white',
            color: 'black',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.2',
          }}
          className="print-ticket"
        >
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 5px 0' }}>RETIRO DE EQUIPAJE</h2>
            <div style={{ borderBottom: '1px dashed black', margin: '5px 0' }}></div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <p style={{ margin: '3px 0' }}><strong>Entrada:</strong> {formatDateTime(record.entryTime)}</p>
            <p style={{ margin: '3px 0' }}><strong>Salida:</strong> {formatDateTime(new Date())}</p>
            <p style={{ margin: '3px 0' }}><strong>Cliente:</strong> {record.clientDocument}</p>
            <p style={{ margin: '3px 0' }}><strong>Código:</strong> {record.code}</p>
            <p style={{ margin: '3px 0' }}><strong>Tipo:</strong> {sizeLabel}</p>
            <p style={{ margin: '3px 0' }}><strong>Casillero:</strong> {lockerDisplay}</p>
          </div>

          <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>

          <div style={{ textAlign: 'right', marginBottom: '5px' }}>
            <p style={{ margin: '3px 0', fontSize: '12px' }}>
              Base Pagada: ${record.price.toLocaleString('es-CL')}
            </p>
            {extraAmount > 0 && (
              <>
                <p style={{ margin: '3px 0', fontSize: '12px' }}>
                  Hrs Extra: {extraHours.toFixed(2)}
                </p>
                <p style={{ margin: '3px 0', fontSize: '14px', fontWeight: 'bold' }}>
                  Recargo: ${extraAmount.toLocaleString('es-CL')}
                </p>
              </>
            )}
          </div>

          <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>

          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>¡Gracias por su preferencia!</p>
          </div>
        </div>
      </div>
    )
  }
)

DeliveryTicket.displayName = 'DeliveryTicket'
