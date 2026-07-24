"use client";
 
import React, { forwardRef } from "react";
import { type CustodyRecord, formatDateTime } from "@/lib/types";
import { useCustodyStore } from "@/lib/custody-store";
import { formatCurrency } from "@/lib/utils";
 
interface DeliveryTicketProps {
  record: CustodyRecord | null;
  extraHours: number;
  extraAmount: number;
  paymentMethod: string;
  extraFolio?: number | null;
  authCode?: string | null;
  opNumber?: string | null;
}
 
export const DeliveryTicket = forwardRef<HTMLDivElement, DeliveryTicketProps>(
  (
    {
      record,
      extraHours,
      extraAmount,
      paymentMethod,
      extraFolio,
      authCode,
      opNumber,
    },
    ref,
  ) => {
    const lockers = useCustodyStore((state) => state.lockers);
    const lockerSizes = useCustodyStore((state) => state.lockerSizes);
 
    if (!record) return null;
 
    const sizeLabel =
      lockerSizes.find((s) => s.value === record.size)?.label || record.size;
    const locker = lockers.find((l) => l.id === record.lockerId);
    const lockerDisplay = locker
      ? `${locker.col}${locker.row}`
      : record.lockerId;
 
    const sep = { borderBottom: "1px dashed black", margin: "6px 0" } as const;
    const row = { display: "flex", justifyContent: "space-between", margin: "2px 0" } as const;

    return (
      <div style={{ display: "none" }}>
        <div
          ref={ref}
          style={{
            width: "100%",
            maxWidth: "80mm",
            margin: "0 auto",
            padding: "4mm",
            background: "white",
            color: "black",
            fontFamily: "monospace",
            fontSize: "12px",
            lineHeight: "1.4",
          }}
          className="print-ticket"
        >
          {/* ── ENCABEZADO BRAND ── */}
          <div style={{ textAlign: "center", marginBottom: "8px" }}>
            <p style={{ margin: "0", fontSize: "22px", fontWeight: "900", letterSpacing: "4px" }}>
              CUSTODIA
            </p>
            <p style={{ margin: "0", fontSize: "10px", letterSpacing: "1px" }}>
              EQUIPAJE &amp; OBJETOS DE VALOR
            </p>
          </div>

          <div style={sep} />

          {/* ── TIPO DE COMPROBANTE ── */}
          <div style={{ textAlign: "center", margin: "4px 0 8px" }}>
            <p style={{ margin: "0", fontSize: "13px", fontWeight: "bold" }}>
              COMPROBANTE DE RETIRO
            </p>
            {extraFolio && (
              <p style={{ margin: "2px 0 0 0", fontSize: "11px", fontWeight: "bold" }}>
                FOLIO RECARGO N° {extraFolio}
              </p>
            )}
          </div>

          <div style={sep} />

          {/* ── DATOS DE RETIRO ── */}
          <div style={{ margin: "6px 0", fontSize: "11px" }}>
            <div style={row}>
              <span><strong>Código:</strong></span>
              <span>{record.code}</span>
            </div>
            <div style={row}>
              <span><strong>Documento:</strong></span>
              <span>{record.clientDocument}</span>
            </div>
            <div style={row}>
              <span><strong>Casillero:</strong></span>
              <span>{lockerDisplay} ({sizeLabel})</span>
            </div>
            <div style={row}>
              <span><strong>Entrada:</strong></span>
              <span>{formatDateTime(record.entryTime)}</span>
            </div>
            <div style={row}>
              <span><strong>Salida:</strong></span>
              <span>{formatDateTime(new Date())}</span>
            </div>
            <div style={row}>
              <span><strong>Medio de Pago:</strong></span>
              <span>{paymentMethod}</span>
            </div>
            {authCode && (
              <div style={row}>
                <span><strong>Cód. Autorización:</strong></span>
                <span>{authCode}</span>
              </div>
            )}
            {opNumber && (
              <div style={row}>
                <span><strong>N° Operación:</strong></span>
                <span>{opNumber}</span>
              </div>
            )}
          </div>

          <div style={sep} />

          {/* ── COBROS ── */}
          <div style={{ fontSize: "11px", margin: "6px 0" }}>
            <div style={row}>
              <span>Base Pagada</span>
              <span>{formatCurrency(record.price)}</span>
            </div>
            {extraAmount > 0 ? (
              <>
                <div style={row}>
                  <span>Horas Extra ({extraHours.toFixed(1)} hrs)</span>
                  <span>{formatCurrency(extraAmount)}</span>
                </div>
                <div style={{ ...row, fontWeight: "bold", fontSize: "13px", marginTop: "4px" }}>
                  <span>TOTAL RECARGO</span>
                  <span>{formatCurrency(extraAmount)}</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", fontStyle: "italic", margin: "4px 0" }}>
                Sin cargos adicionales
              </div>
            )}
          </div>

          <div style={sep} />

          {/* ── PIE ── */}
          <div style={{ textAlign: "center", margin: "10px 0 4px" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: "11px" }}>
              Equipaje retirado a conformidad
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "13px", fontWeight: "bold", letterSpacing: "2px" }}>
              ¡MUCHAS GRACIAS!
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "9px" }}>
              Vuelva pronto · Custodia Equipaje
            </p>
          </div>
        </div>
      </div>
    );
  }
);
 
DeliveryTicket.displayName = "DeliveryTicket";
