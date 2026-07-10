"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
}

export function Barcode({ value, width = 2, height = 80 }: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch {
        // Invalid barcode value
      }
    }
  }, [value, width, height]);

  if (!value) {
    return (
      <div className="flex items-center justify-center h-28 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          El codigo de barras aparecera aqui
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-white rounded-lg p-2">
      <svg ref={svgRef} />
    </div>
  );
}
