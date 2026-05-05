'use client'

import React, { forwardRef, useEffect, useRef } from 'react'
import { type CustodyRecord, formatDateTime, LOCKER_SIZES } from '@/lib/types'
import { useCustodyStore } from '@/lib/custody-store'
import JsBarcode from 'jsbarcode'

interface TicketProps {
  record: CustodyRecord | null
}

export const Ticket = forwardRef<HTMLDivElement, TicketProps>(({ record }, ref) => {
  const barcodeRef = useRef<SVGSVGElement>(null)
  const lockers = useCustodyStore((state) => state.lockers)

  useEffect(() => {
    if (barcodeRef.current && record?.code) {
      try {
        JsBarcode(barcodeRef.current, record.code, {
          format: 'CODE128',
          width: 1.5,
          height: 60,
          displayValue: true,
          fontSize: 12,
          margin: 5,
          background: '#ffffff',
          lineColor: '#000000',
        })
      } catch (err) {
        console.error('Barcode error', err)
      }
    }
  }, [record?.code])

  if (!record) return null

  const sizeLabel = LOCKER_SIZES.find((s) => s.value === record.size)?.label || record.size
  const locker = lockers.find((l) => l.id === record.lockerId)
  const lockerDisplay = locker ? `${locker.row},${locker.col}` : record.lockerId

  return (
    <div style={{ display: 'none' }}>
      <div 
        ref={ref}
        // Tailwind is great but inline styles assure it prints well in pure B&W with restricted width
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
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 5px 0' }}>CUSTODIA DE EQUIPAJE</h2>
          <div style={{ borderBottom: '1px dashed black', margin: '5px 0' }}></div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <p style={{ margin: '3px 0' }}><strong>Entrada:</strong> {formatDateTime(record.entryTime)}</p>
          <p style={{ margin: '3px 0' }}><strong>Cliente:</strong> {record.clientDocument}</p>
          <p style={{ margin: '3px 0' }}><strong>Tipo:</strong> {sizeLabel}</p>
          <p style={{ margin: '3px 0' }}><strong>Casillero:</strong> {lockerDisplay}</p>
        </div>

        <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>

        <div style={{ textAlign: 'right', marginBottom: '15px' }}>
          <p style={{ margin: '3px 0', fontSize: '14px' }}>
            <strong>Pagado: ${record.price.toLocaleString('es-CL')}</strong>
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <svg ref={barcodeRef} style={{ width: '100%', maxWidth: '50mm', height: 'auto' }} />
        </div>

        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <p style={{ margin: 0, fontSize: '10px' }}>Guarde este ticket para retiro</p>
        </div>
      </div>
    </div>
  )
})

Ticket.displayName = 'Ticket'
