"use client";

import React, { forwardRef } from "react";

interface TransbankVoucherProps {
  data: {
    amount: number;
    ticketNumber: string;
    authorizationCode: string;
    operationNumber: string;
    cardNumber?: string | null;
    cardBrand?: string | null;
    cardType?: string | null;
    timestamp?: string | null;
  } | null;
}

export const TransbankVoucher = forwardRef<HTMLDivElement, TransbankVoucherProps>(
  ({ data }, ref) => {
    if (!data) return null;

    const formatTimestamp = (ts: string) => {
      // Si el formato es DDMMYYYY HHMMSS (ej: "13072026 104753")
      if (/^\d{8}\s\d{6}$/.test(ts)) {
        const day = ts.substring(0, 2);
        const month = ts.substring(2, 4);
        const year = ts.substring(4, 8);
        const hour = ts.substring(9, 11);
        const min = ts.substring(11, 13);
        const sec = ts.substring(13, 15);
        return `${day}-${month}-${year} ${hour}:${min}:${sec}`;
      }
      return ts;
    };

    const printTime = data.timestamp 
      ? formatTimestamp(data.timestamp) 
      : new Date().toLocaleString("es-CL");

    return (
      <div style={{ display: "none" }}>
        <div
          ref={ref}
          style={{
            width: "100%",
            maxWidth: "58mm",
            margin: "0 auto",
            padding: "2mm",
            background: "white",
            color: "black",
            fontFamily: "monospace",
            fontSize: "12px",
            lineHeight: "1.2",
          }}
          className="print-ticket"
        >
          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "bold", margin: "0 0 2px 0" }}>
              COMPROBANTE DE PAGO
            </h2>
            <h3 style={{ fontSize: "13px", fontWeight: "bold", margin: "0 0 5px 0" }}>
              TRANSBANK POS
            </h3>
            <div style={{ borderBottom: "1px dashed black", margin: "5px 0" }}></div>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <p style={{ margin: "3px 0" }}>
              <strong>Comercio:</strong> Custodia Equipaje
            </p>
            <p style={{ margin: "3px 0" }}>
              <strong>Ticket/Documento:</strong> {data.ticketNumber}
            </p>
            <p style={{ margin: "3px 0" }}>
              <strong>Fecha/Hora:</strong> {printTime}
            </p>

            <div style={{ borderBottom: "1px dashed black", margin: "5px 0" }}></div>

            <p style={{ margin: "3px 0" }}>
              <strong>N° Operación:</strong> {data.operationNumber}
            </p>
            <p style={{ margin: "3px 0" }}>
              <strong>Cód. Autorización:</strong> {data.authorizationCode}
            </p>
          </div>

          <div style={{ borderBottom: "1px dashed black", margin: "10px 0" }}></div>

          <div style={{ textAlign: "right", marginBottom: "15px" }}>
            <p style={{ margin: "3px 0", fontSize: "15px", fontWeight: "bold" }}>
              TOTAL: $ {data.amount.toLocaleString("es-CL")}
            </p>
          </div>

          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <p style={{ margin: "0 0 5px 0", fontSize: "11px", fontWeight: "bold" }}>
              TRANSACCIÓN APROBADA
            </p>
            <p style={{ margin: 0, fontSize: "9px" }}>
              Copia Cliente
            </p>
          </div>
        </div>
      </div>
    );
  }
);

TransbankVoucher.displayName = "TransbankVoucher";
