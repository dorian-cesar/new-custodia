"use client";

import { useEffect, useState } from "react";
import { useCustodyStore } from "@/lib/custody-store";
import { getInitialState } from "@/app/actions/db-actions";

export function DbInitProvider({ children }: { children: React.ReactNode }) {
  const hydrateState = useCustodyStore((state) => state.hydrateState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getInitialState().then((res) => {
      if (res.success && res.data) {
        hydrateState(res.data);
      } else {
        console.error("Failed to load DB state:", res.error);
      }
      setIsLoaded(true);
    });
  }, [hydrateState]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4 font-sans select-none transition-colors duration-300">
        <div className="bg-[#e6e6e7] dark:bg-zinc-900 w-full max-w-md rounded-lg border border-zinc-300 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col pb-6 transition-colors duration-300">
          {/* Header (Logo & Subtitle) */}
          <div className="bg-white dark:bg-zinc-900 py-6 border-b border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center gap-1.5">
            <div className="flex items-center">
              <span className="text-3xl font-extrabold tracking-tight select-none flex items-center">
                <span className="text-[#0a354c] dark:text-[#00c5ff] leading-none">n</span>
                <span
                  className="inline-block w-4.5 h-4.5 rounded-full border-4 border-[#1588b3] mx-0.5 align-middle"
                  style={{ borderWidth: "3.5px" }}
                />
                <span className="text-[#0a354c] dark:text-[#00c5ff] leading-none">d</span>
                <span
                  className="inline-block w-4.5 h-4.5 rounded-full border-4 border-[#1588b3] mx-0.5 align-middle"
                  style={{ borderWidth: "3.5px" }}
                />
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-wider text-[#242424] dark:text-zinc-100 leading-tight">
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
