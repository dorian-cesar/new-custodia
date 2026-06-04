'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface BancardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  description: string;
  clientId: string;
}

declare global {
  interface Window {
    Bancard: any;
  }
}

export function BancardModal({ isOpen, onClose, onSuccess, amount, description, clientId }: BancardModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (isOpen && !initialized.current) {
      initialized.current = true;
      setLoading(true);
      setError(null);

      const initPayment = async () => {
        try {
          const shopProcessId = Math.floor(Math.random() * 1000000000); // Unique integer ID


          const response = await fetch(process.env.NEXT_PUBLIC_BANCARD_API_URL || 'http://localhost:3002/api/pagosimple', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shopProcessId,
              amount,
              description: "Pago de custodia",
              currency: 'PYG',
              servicio: 'custodia',
              canal: 'punto de venta',
              id: clientId
            })
          });

          const resData = await response.json();

          if (!response.ok || !resData.data?.processId) {
            throw new Error(resData.error || 'Error al iniciar pago con Bancard');
          }

          const { processId, sdkUrl } = resData.data;

          if (sdkUrl) {
            await new Promise<void>((resolve, reject) => {
              // Si ya existe la etiqueta script para esta URL, no la duplicamos
              const existing = document.querySelector(`script[src="${sdkUrl}"]`);
              if (existing) {
                resolve();
                return;
              }
              const script = document.createElement('script');
              script.src = sdkUrl;
              script.async = true;
              script.onload = () => resolve();
              script.onerror = () => reject(new Error('Error al cargar el SDK de Bancard'));
              document.body.appendChild(script);
            });
          }

          setLoading(false);

          if (window.Bancard && window.Bancard.Checkout) {
            // Check if iframe-container exists
            window.Bancard.Checkout.createForm('iframe-container', processId, {
              styles: {
                "form-background-color": "#001b22",
                "button-background-color": "#4faad5",
                "button-text-color": "#fcfcfc",
                "button-border-color": "#dddddd",
                "input-background-color": "#fcfcfc",
                "input-text-color": "#111111",
                "input-placeholder-color": "#111111"
              },
              // Bancard JS events
              onComplete: function (data: any) {
                // Typically called on success or when done
                console.log("Bancard success data:", data);
                setTimeout(() => onSuccess(), 1000);
              }
            });
          } else {
            throw new Error("SDK de Bancard no está cargado");
          }

        } catch (err: any) {
          setLoading(false);
          setError(err.message || 'Error de conexión con Bancard');
          console.error(err);
        }
      };

      initPayment();
    }

    if (!isOpen) {
      initialized.current = false; // Reset for next open
    }
  }, [isOpen, amount, description, clientId, onSuccess]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border sm:max-w-[700px] w-[95vw]">
        <DialogHeader>
          <DialogTitle>Pago con Bancard</DialogTitle>
          <DialogDescription>
            Ingrese los datos de su tarjeta para completar el pago de Gs. {amount.toLocaleString('es-PY')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center min-h-[650px] w-full relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 z-10">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Conectando con Bancard...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center">
              <p className="text-destructive font-medium mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
              >
                Cancelar
              </button>
            </div>
          )}

          <div id="iframe-container" ref={iframeContainerRef} style={{ width: '100%', minHeight: '650px' }}></div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
