"use client";

import React, { forwardRef, useEffect, useRef } from "react";
import { type CustodyRecord, formatDateTime } from "@/lib/types";
import { useCustodyStore } from "@/lib/custody-store";
import JsBarcode from "jsbarcode";

interface TicketProps {
  record: CustodyRecord | null;
  paymentMethod?: string;
}

export const Ticket = forwardRef<HTMLDivElement, TicketProps>(
  ({ record, paymentMethod }, ref) => {
    const barcodeRef1 = useRef<HTMLImageElement>(null);
    const barcodeRef2 = useRef<HTMLImageElement>(null);
    const lockers = useCustodyStore((state) => state.lockers);
    const lockerSizes = useCustodyStore((state) => state.lockerSizes);

    useEffect(() => {
      const generateBarcode = (imgEl: HTMLImageElement | null) => {
        if (imgEl && record?.code) {
          try {
            JsBarcode(imgEl, record.code, {
              format: "CODE128",
              width: 1.5,
              height: 60,
              displayValue: true,
              fontSize: 12,
              margin: 5,
              background: "#ffffff",
              lineColor: "#000000",
            });
          } catch (err) {
            console.error("Barcode error", err);
          }
        }
      };

      generateBarcode(barcodeRef1.current);
      generateBarcode(barcodeRef2.current);
    }, [record?.code]);

    if (!record) return null;

    const sizeLabel =
      lockerSizes.find((s) => s.value === record.size)?.label || record.size;
    const locker = lockers.find((l) => l.id === record.lockerId);
    const lockerDisplay = locker
      ? `${locker.col}${locker.row}`
      : record.lockerId;

    // Función que renderiza la estructura de un único ticket
    const renderSingleTicket = (barcodeRef: React.RefObject<HTMLImageElement | null>) => (
      <div style={{ padding: "2mm", background: "white", color: "black" }}>
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <h2
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              margin: "0 0 5px 0",
            }}
          >
            CUSTODIA DE EQUIPAJE
          </h2>
          <div
            style={{ borderBottom: "1px dashed black", margin: "5px 0" }}
          ></div>
          {record.folio && (
            <div style={{ margin: "5px 0" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: "bold" }}>
                BOLETA ELECTRÓNICA
              </p>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: "bold" }}>
                FOLIO N° {record.folio}
              </p>
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}
              >
                VALIDO COMO BOLETA
              </p>
              <div
                style={{ borderBottom: "1px dashed black", margin: "5px 0" }}
              ></div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: "10px" }}>
          <p style={{ margin: "3px 0" }}>
            <strong>Entrada:</strong> {formatDateTime(record.entryTime)}
          </p>
          <p style={{ margin: "3px 0" }}>
            <strong>Cliente:</strong> {record.clientDocument}
          </p>
          <p style={{ margin: "3px 0" }}>
            <strong>Tipo:</strong> {sizeLabel}
          </p>
          <p style={{ margin: "3px 0" }}>
            <strong>Casillero:</strong> {lockerDisplay}
          </p>
        </div>

        <div
          style={{ borderBottom: "1px dashed black", margin: "10px 0" }}
        ></div>

        <div style={{ textAlign: "right", marginBottom: "15px" }}>
          <p style={{ margin: "3px 0", fontSize: "14px" }}>
            <strong>
              Pagado ({paymentMethod || "Efectivo"}): ${" "}
              {record.price.toLocaleString("es-CL")}
            </strong>
          </p>
        </div>

        <div style={{ textAlign: "center" }}>
          <img
            ref={barcodeRef}
            alt="barcode"
            style={{ width: "100%", maxWidth: "50mm", height: "auto" }}
          />
        </div>

        <div style={{ textAlign: "center", marginTop: "10px" }}>
          <p style={{ margin: 0, fontSize: "10px" }}>
            Guarde este ticket para retiro
          </p>
        </div>
      </div>
    );

    return (
      <div style={{ display: "none" }}>
        <div
          ref={ref}
          style={{
            width: "100%",
            maxWidth: "58mm",
            margin: "0 auto",
            fontFamily: "monospace",
            fontSize: "12px",
            lineHeight: "1.2",
          }}
          className="print-ticket"
        >
          {/* Primer ticket (Copia Cliente / Local) */}
          <div style={{ pageBreakAfter: "always" }}>
            {renderSingleTicket(barcodeRef1)}
          </div>

          {/* Segundo ticket (Copia Control / Caja) */}
          <div>
            {renderSingleTicket(barcodeRef2)}
          </div>
        </div>
      </div>
    );
  },
);

Ticket.displayName = "Ticket";
