"use client";

import React, { forwardRef } from "react";
import { formatDateTime } from "@/lib/types";

interface WithdrawalTicketProps {
  data: {
    amount: number;
    cajero: string;
    supervisor: string;
    reason: string;
    timestamp: string;
  } | null;
}

export const WithdrawalTicket = forwardRef<
  HTMLDivElement,
  WithdrawalTicketProps
>(({ data }, ref) => {
  if (!data) return null;

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
            RETIRO DE EFECTIVO
          </p>
          <div
            style={{ borderBottom: "1px dashed black", margin: "5px 0" }}
          ></div>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <p style={{ margin: "3px 0" }}>
            <strong>Fecha:</strong> {formatDateTime(data.timestamp)}
          </p>
          <p style={{ margin: "3px 0" }}>
            <strong>Cajero:</strong> {data.cajero}
          </p>
          <p style={{ margin: "3px 0" }}>
            <strong>Supervisor:</strong> {data.supervisor}
          </p>
          <p style={{ margin: "3px 0" }}>
            <strong>Motivo:</strong> {data.reason || "Retiro de caja"}
          </p>
        </div>

        <div
          style={{ borderBottom: "1px dashed black", margin: "10px 0" }}
        ></div>

        <div style={{ textAlign: "center", margin: "15px 0" }}>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: "bold" }}>
            MONTO RETIRADO
          </p>
          <p
            style={{
              margin: "5px 0 0 0",
              fontSize: "18px",
              fontWeight: "bold",
            }}
          >
            ${data.amount.toLocaleString("es-CL")}
          </p>
        </div>

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
});

WithdrawalTicket.displayName = "WithdrawalTicket";
