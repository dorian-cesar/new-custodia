"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCustodyStore } from "@/lib/custody-store";
import { loginUser } from "@/app/actions/db-actions";
import { Label } from "@/components/ui/label";
import { Lock, User as UserIcon, Power, RotateCcw } from "lucide-react";
import Swal from "sweetalert2";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { currentUser, login } = useCustodyStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        login(parsed);
      } catch (err) {
        console.error("Error parsing stored user session:", err);
      }
    }
  }, [login]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Cargando...</div>
      </div>
    );
  }

  if (!currentUser) {
    const handleShutdown = () => {
      Swal.fire({
        title: "¿Apagar el equipo?",
        text: "Esta acción apagará la máquina Windows por completo.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#71717a",
        confirmButtonText: "OK",
        cancelButtonText: "Cancelar",
        customClass: {
          confirmButton:
            "px-4 py-2 font-bold text-white rounded-md bg-red-600 hover:bg-red-700",
          cancelButton:
            "px-4 py-2 font-bold text-white rounded-md bg-zinc-500 hover:bg-zinc-600",
        },
      }).then(async (result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "Apagando...",
            text: "El equipo se está apagando, por favor espere.",
            icon: "info",
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });

          try {
            const response = await fetch("https://localhost:3000/api/apagar", {
              method: "POST",
            });
            const res = await response.json();
            if (!response.ok || !res.success) {
              Swal.fire(
                "Error",
                "No se pudo apagar el equipo: " +
                  (res.error || "Error desconocido"),
                "error",
              );
            }
          } catch (err: any) {
            Swal.fire("Error", "Ocurrió un error: " + err.message, "error");
          }
        }
      });
    };

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setIsLoading(true);

      try {
        const result = await loginUser(username, password);
        if (result.success && result.user) {
          login(result.user as any);
          if (result.user.role === "supervisor") {
            router.push("/admin");
          } else {
            router.push("/");
          }
        } else {
          setError(result.error || "Error al iniciar sesión");
        }
      } catch (err) {
        setError("Ocurrió un error inesperado");
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4 font-sans select-none relative transition-colors duration-300">
        <div className="bg-[#e6e6e7] dark:bg-zinc-900 w-full max-w-md rounded-lg border border-zinc-300 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col pb-6 transition-colors duration-300">
          {/* Header (Logo & Subtitle) */}
          <div className="bg-white dark:bg-zinc-900 py-6 border-b border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center gap-1.5">
            <h1 className="text-3xl font-extrabold tracking-wider text-[#0a354c] dark:text-[#00c5ff] leading-none uppercase">
              CUSTODIA
            </h1>
            <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
              Sistema de Control de Casilleros
            </p>
          </div>

          {/* Form Content */}
          <div className="px-6 py-4 flex flex-col gap-4">
            <div className="bg-[#242424] dark:bg-zinc-800 text-white py-1 px-4 text-xs font-bold uppercase tracking-wider">
              INICIAR SESIÓN
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
                >
                  Usuario
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="w-full pl-10 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#00c5ff]"
                    placeholder="Ingrese su usuario"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
                >
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#00c5ff]"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-100 border border-red-200 rounded-md text-red-700 font-semibold text-xs text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#242424] dark:bg-zinc-800 hover:bg-[#323232] dark:hover:bg-zinc-700 disabled:bg-zinc-500 disabled:cursor-not-allowed text-white text-sm font-bold py-3 px-6 rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md select-none mt-2"
                disabled={isLoading}
              >
                {isLoading ? "Verificando..." : "Entrar al Sistema"}
              </button>
            </form>
          </div>
        </div>

        {/* Botones en la esquina inferior izquierda: apagar y refrescar */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleShutdown}
            className="p-3 bg-red-800 hover:bg-red-900 active:scale-95 text-white rounded-full shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center border border-zinc-500"
            title="Apagar equipo"
          >
            <Power className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="p-3 bg-[#1588b3] hover:bg-[#0a6a8f] active:scale-95 text-white rounded-full shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center border border-zinc-500"
            title="Refrescar pantalla"
          >
            <RotateCcw className="h-6 w-6" />
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
