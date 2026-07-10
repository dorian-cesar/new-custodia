"use client";

import React, { forwardRef } from "react";
import { formatDateTime } from "@/lib/types";

interface ClosureTicketProps {
  data: {
    cajero: string;
    openedAt: string;
    closedAt: string;
    openingAmount: number;
    salesCash: number;
    salesCard: number;
    withdrawals: number;
    expectedAmount: number;
    declaredAmount: number;
    difference: number;
    notes?: string;
  } | null;
}

export const ClosureTicket = forwardRef<HTMLDivElement, ClosureTicketProps>(
  ({ data }, ref) => {
    if (!data) return null;

    const diffText =
      data.difference === 0
        ? "CUADRADA ✓"
        : data.difference > 0
          ? `SOBRANTE: +$${data.difference.toLocaleString("es-CL")}`
          : `FALTANTE: -$${Math.abs(data.difference).toLocaleString("es-CL")}`;

    const diffColor =
      data.difference === 0 ? "black" : data.difference > 0 ? "blue" : "red";

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
            <h2
              style={{
                fontSize: "15px",
                fontWeight: "bold",
                margin: "0 0 5px 0",
              }}
            >
              CUSTODIA TERMINAL SUR
            </h2>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: "bold" }}>
              CIERRE DE CAJA (ARQUEO)
            </p>
            <div
              style={{ borderBottom: "1px dashed black", margin: "5px 0" }}
            ></div>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <p style={{ margin: "3px 0" }}>
              <strong>Cajero:</strong> {data.cajero}
            </p>
            <p style={{ margin: "3px 0" }}>
              <strong>Apertura:</strong> {formatDateTime(data.openedAt)}
            </p>
            <p style={{ margin: "3px 0" }}>
              <strong>Cierre:</strong> {formatDateTime(data.closedAt)}
            </p>
          </div>

          <div
            style={{ borderBottom: "1px dashed black", margin: "5px 0" }}
          ></div>

          <div style={{ marginBottom: "10px" }}>
            <p style={{ margin: "3px 0" }}>
              Monto Inicial: ${data.openingAmount.toLocaleString("es-CL")}
            </p>
            <p style={{ margin: "3px 0" }}>
              Ventas Efectivo: ${data.salesCash.toLocaleString("es-CL")}
            </p>
            <p style={{ margin: "3px 0" }}>
              Ventas Tarjeta: ${data.salesCard.toLocaleString("es-CL")}
            </p>
            <p style={{ margin: "3px 0" }}>
              Retiros: -${data.withdrawals.toLocaleString("es-CL")}
            </p>
          </div>

          <div
            style={{ borderBottom: "1px dashed black", margin: "5px 0" }}
          ></div>

          <div style={{ marginBottom: "10px" }}>
            <p style={{ margin: "3px 0" }}>
              <strong>Monto Esperado:</strong> $
              {data.expectedAmount.toLocaleString("es-CL")}
            </p>
            <p style={{ margin: "3px 0" }}>
              <strong>Monto Declarado:</strong> $
              {data.declaredAmount.toLocaleString("es-CL")}
            </p>
            <p style={{ margin: "3px 0", color: diffColor }}>
              <strong>Diferencia:</strong> {diffText}
            </p>
          </div>

          {data.notes && (
            <>
              <div
                style={{ borderBottom: "1px dashed black", margin: "5px 0" }}
              ></div>
              <p style={{ margin: "3px 0", fontSize: "11px" }}>
                <strong>Obs:</strong> {data.notes}
              </p>
            </>
          )}

          <div
            style={{ borderBottom: "1px dashed black", margin: "10px 0" }}
          ></div>

          <div
            style={{
              marginTop: "40px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "9px",
            }}
          >
            <div style={{ textAlign: "center", width: "45%" }}>
              <div
                style={{
                  borderTop: "1px solid black",
                  marginTop: "15px",
                  paddingTop: "3px",
                }}
              >
                Firma Cajero
              </div>
            </div>
            <div style={{ textAlign: "center", width: "45%" }}>
              <div
                style={{
                  borderTop: "1px solid black",
                  marginTop: "15px",
                  paddingTop: "3px",
                }}
              >
                Firma Supervisor
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ClosureTicket.displayName = "ClosureTicket";
