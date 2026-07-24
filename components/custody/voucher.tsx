"use client";
 
import React, { forwardRef } from "react";
import { formatCurrency } from "@/lib/utils";
 
interface VoucherProps {
  data: {
    amount: number;
    ticketNumber: string;
    authorizationCode: string;
    operationNumber: string;
    cardNumber?: string | null;
    cardBrand?: string | null;
    cardType?: string | null;
    timestamp?: string | null;
    items?: any[] | null;
    cashReceived?: number;
    change?: number;
  } | null;
}
 
export const Voucher = forwardRef<HTMLDivElement, VoucherProps>(
  ({ data }, ref) => {
    if (!data) return null;
 
    const formatTimestamp = (ts: string) => {
      if (/^\d{8}\s\d{6}$/.test(ts)) {
        const day = ts.substring(0, 2);
        const month = ts.substring(2, 4);
        const year = ts.substring(4, 8);
        const hour = ts.substring(9, 11);
        const min = ts.substring(11, 13);
        const sec = ts.substring(13, 15);
        return `${day}/${month}/${year}  ${hour}:${min}:${sec}`;
      }
      try {
        return new Date(ts).toLocaleString("es-PY");
      } catch {
        return ts;
      }
    };
 
    const printTime = data.timestamp
      ? formatTimestamp(data.timestamp)
      : new Date().toLocaleString("es-PY");
 
    const isCash = data.authorizationCode === "EFECTIVO";

    // Agrupar ítems por tamaño
    const grouped: Record<string, { qty: number; unitPrice: number }> = {};
    if (data.items) {
      for (const item of data.items) {
        if (!grouped[item.size]) grouped[item.size] = { qty: 0, unitPrice: item.price };
        grouped[item.size].qty += 1;
      }
    }
    const groupedEntries = Object.entries(grouped);
 
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
              COMPROBANTE DE PAGO
            </p>
            <p style={{ margin: "0", fontSize: "11px" }}>
              {isCash ? "VENTA EFECTIVO" : "VENTA TARJETA / POS"}
            </p>
          </div>

          <div style={sep} />

          {/* ── DATOS DEL CLIENTE ── */}
          <div style={{ margin: "6px 0", fontSize: "11px" }}>
            <div style={row}>
              <span><strong>Documento:</strong></span>
              <span>{data.ticketNumber}</span>
            </div>
            <div style={row}>
              <span><strong>Fecha/Hora:</strong></span>
              <span>{printTime}</span>
            </div>
            {!isCash && (
              <div style={row}>
                <span><strong>N° Operación:</strong></span>
                <span>{data.operationNumber}</span>
              </div>
            )}
          </div>

          <div style={sep} />

          {/* ── DETALLE DE EQUIPAJES ── */}
          {groupedEntries.length > 0 && (
            <div style={{ fontSize: "11px", margin: "6px 0" }}>
              <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>DETALLE:</p>
              {groupedEntries.map(([size, { qty, unitPrice }], idx) => (
                <div key={idx} style={row}>
                  <span>{idx + 1}. Equipaje {size}  x{qty}</span>
                  <span>{formatCurrency(qty * unitPrice)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={sep} />

          {/* ── TOTALES ── */}
          <div style={{ fontSize: "12px", margin: "4px 0" }}>
            <div style={{ ...row, fontWeight: "bold", fontSize: "14px" }}>
              <span>TOTAL</span>
              <span>{formatCurrency(data.amount)}</span>
            </div>
            {isCash && data.cashReceived !== undefined && (
              <>
                <div style={row}>
                  <span>Efectivo recibido</span>
                  <span>{formatCurrency(data.cashReceived)}</span>
                </div>
                <div style={{ ...row, fontWeight: "bold" }}>
                  <span>Vuelto</span>
                  <span>{formatCurrency(data.change || 0)}</span>
                </div>
              </>
            )}
          </div>

          <div style={sep} />

          {/* ── PIE ── */}
          <div style={{ textAlign: "center", margin: "10px 0 4px" }}>
            <p style={{ margin: "0 0 3px 0", fontSize: "12px", fontWeight: "bold" }}>
              PAGO PROCESADO CON ÉXITO
            </p>
            <p style={{ margin: "0 0 6px 0", fontSize: "11px" }}>Copia Cliente</p>
            <p style={{ margin: "0", fontSize: "13px", fontWeight: "bold", letterSpacing: "2px" }}>
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
 
Voucher.displayName = "Voucher";
