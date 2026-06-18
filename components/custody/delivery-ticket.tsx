'use client'

import React, { forwardRef, useEffect, useRef } from 'react'
import { type CustodyRecord, formatDateTime } from '@/lib/types'
import { useCustodyStore } from '@/lib/custody-store'
import JsBarcode from 'jsbarcode'

interface DeliveryTicketProps {
  record: CustodyRecord | null
  extraHours: number
  extraAmount: number
  paymentMethod: string
}

export const DeliveryTicket = forwardRef<HTMLDivElement, DeliveryTicketProps>(
  ({ record, extraHours, extraAmount, paymentMethod }, ref) => {
    const barcodeRef = useRef<SVGSVGElement>(null)
    const lockers = useCustodyStore((state) => state.lockers)
    const lockerSizes = useCustodyStore((state) => state.lockerSizes)

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

    const sizeLabel = lockerSizes.find((s) => s.value === record.size)?.label || record.size
    const locker = lockers.find((l) => l.id === record.lockerId)
    const lockerDisplay = locker ? `${locker.row},${locker.col}` : record.lockerId

    return (
      <div style={{ display: 'none' }}>
        <div
          ref={ref}
          style={{
            width: '100%',
            maxWidth: '58mm',
            margin: '0 auto',
            padding: '2mm',
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
            <p style={{ margin: '3px 0' }}><strong>Medio de Pago:</strong> {paymentMethod}</p>
          </div>

          <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>

          <div style={{ textAlign: 'right', marginBottom: '5px' }}>
            <p style={{ margin: '3px 0', fontSize: '12px' }}>
              Base Pagada: Gs. {record.price.toLocaleString('es-PY')}
            </p>
            {extraAmount > 0 && (
              <>
                <p style={{ margin: '3px 0', fontSize: '12px' }}>
                  Hrs Extra: {extraHours.toFixed(2)}
                </p>
                <p style={{ margin: '3px 0', fontSize: '14px', fontWeight: 'bold' }}>
                  Recargo: Gs. {extraAmount.toLocaleString('es-PY')}
                </p>
              </>
            )}
          </div>

          <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>

          <div style={{ textAlign: 'center' }}>
            <svg ref={barcodeRef} style={{ width: '100%', maxWidth: '50mm', height: 'auto' }} />
          </div>

          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>¡Gracias por su preferencia!</p>
          </div>
        </div>
      </div>
    )
  }
)

DeliveryTicket.displayName = 'DeliveryTicket'
