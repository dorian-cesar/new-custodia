"use client";

import React, { forwardRef } from "react";
import { type CustodyRecord, formatDateTime } from "@/lib/types";
import { useCustodyStore } from "@/lib/custody-store";

interface SummaryTicketProps {
  records: CustodyRecord[] | null;
  paymentMethod?: string;
  type?: "entry" | "delivery";
  totalAmountOverride?: number;
}

export const SummaryTicket = forwardRef<HTMLDivElement, SummaryTicketProps>(
  ({ records, paymentMethod, type = "entry", totalAmountOverride }, ref) => {
    const lockers = useCustodyStore((state) => state.lockers);
    const lockerSizes = useCustodyStore((state) => state.lockerSizes);

    if (!records || records.length === 0) return null;

    const totalAmount = type === "entry" 
      ? records.reduce((acc, curr) => acc + curr.price, 0)
      : (totalAmountOverride ?? 0);

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
                fontSize: "14px",
                fontWeight: "bold",
                margin: "0 0 5px 0",
              }}
            >
              {type === "entry" ? "RESUMEN DE CUSTODIA" : "RESUMEN DE RETIRO"}
            </h2>
            <div
              style={{ borderBottom: "1px dashed black", margin: "5px 0" }}
            ></div>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <p style={{ margin: "3px 0" }}>
              <strong>Fecha:</strong> {formatDateTime(records[0].entryTime)}
            </p>
            <p style={{ margin: "3px 0" }}>
              <strong>Cliente:</strong> {records[0].clientDocument}
            </p>
            <p style={{ margin: "3px 0" }}>
              <strong>Total Casilleros:</strong> {records.length}
            </p>
          </div>

          <div
            style={{ borderBottom: "1px dashed black", margin: "10px 0" }}
          ></div>

          <div style={{ marginBottom: "10px" }}>
            <p style={{ margin: "3px 0", fontWeight: "bold" }}>Detalle:</p>
            {records.map((record, index) => {
              const sizeLabel =
                lockerSizes.find((s) => s.value === record.size)?.label ||
                record.size;
              const locker = lockers.find((l) => l.id === record.lockerId);
              const lockerDisplay = locker
                ? `${locker.col}${locker.row}`
                : record.lockerId;

              return (
                <div key={index} style={{ marginBottom: "4px", fontSize: "11px" }}>
                  <div>- {lockerDisplay} ({sizeLabel})</div>
                  {type === "entry" && (
                    <div style={{ textAlign: "right" }}>${record.price.toLocaleString("es-CL")}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{ borderBottom: "1px dashed black", margin: "10px 0" }}
          ></div>

          <div style={{ textAlign: "right", marginBottom: "15px" }}>
            <p style={{ margin: "3px 0", fontSize: "14px" }}>
              <strong>
                {type === "entry" ? "Total pagado:" : "Total recargo:"} ${totalAmount.toLocaleString("es-CL")}
              </strong>
            </p>
            <p style={{ margin: "3px 0", fontSize: "11px" }}>
              Medio de pago: {paymentMethod || "Efectivo"}
            </p>
          </div>

          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <p style={{ margin: 0, fontSize: "10px" }}>
              Este documento es un comprobante de pago
            </p>
          </div>
        </div>
      </div>
    );
  },
);

SummaryTicket.displayName = "SummaryTicket";
