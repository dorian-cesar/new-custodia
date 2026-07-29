"use client";

import { useEffect, useState } from "react";
import { useCustodyStore } from "@/lib/custody-store";
import { getInitialState, logClientError } from "@/app/actions/db-actions";

export function DbInitProvider({ children }: { children: React.ReactNode }) {
  const hydrateState = useCustodyStore((state) => state.hydrateState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleError = (event: ErrorEvent) => {
        logClientError(event.message, event.error?.stack || "");
      };
      const handleRejection = (event: PromiseRejectionEvent) => {
        logClientError(event.reason?.message || String(event.reason), event.reason?.stack || "");
      };
      window.addEventListener("error", handleError);
      window.addEventListener("unhandledrejection", handleRejection);
      return () => {
        window.removeEventListener("error", handleError);
        window.removeEventListener("unhandledrejection", handleRejection);
      };
    }
  }, []);

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined") {
      try {
        channel = new BroadcastChannel("custody_sync_channel");
        channel.onmessage = async (event) => {
          if (event.data === "refresh_state") {
            const res = await getInitialState();
            if (res.success && res.data) {
              hydrateState(res.data);
            }
          }
        };
      } catch (e) {}

      const syncState = async () => {
        const res = await getInitialState();
        if (res.success && res.data) {
          hydrateState(res.data);
        }
      };

      const handleFocus = async () => {
        syncState();
      };

      window.addEventListener("focus", handleFocus);

      getInitialState().then((res) => {
        if (res.success && res.data) {
          hydrateState(res.data);
        } else {
          console.error("Failed to load DB state:", res.error);
        }
        setIsLoaded(true);
      });

      return () => {
        if (channel) channel.close();
        window.removeEventListener("focus", handleFocus);
      };
    } else {
      setIsLoaded(true);
    }
  }, [hydrateState]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4 font-sans select-none transition-colors duration-300">
        <div className="bg-[#e6e6e7] dark:bg-zinc-900 w-full max-w-md rounded-lg border border-zinc-300 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col pb-6 transition-colors duration-300">
          {/* Header (Logo & Subtitle) */}
          <div className="bg-white dark:bg-zinc-900 py-6 border-b border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center gap-3">
            <img
              src="/logo-boletos.svg"
              alt="boletos.la"
              className="h-10 w-auto mx-auto"
            />
            <h1 className="text-xl font-extrabold tracking-wider text-[#0a354c] dark:text-[#00c5ff] leading-none uppercase">
              CUSTODIA
            </h1>
            <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
              Sistema de Control de Casilleros
            </p>
          </div>

          {/* Connection Status Content */}
          <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-8 h-8 rounded-full border-4 border-[#00c5ff] border-t-transparent animate-spin" />
            <p className="text-zinc-700 dark:text-zinc-300 font-bold text-sm uppercase tracking-wider">
              Conectando a base de datos...
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">
              Por favor, espere mientras se establece la conexión con el
              servidor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
