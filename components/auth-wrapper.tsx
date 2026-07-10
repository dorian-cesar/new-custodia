"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCustodyStore } from "@/lib/custody-store";
import { loginUser } from "@/app/actions/db-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User as UserIcon } from "lucide-react";

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
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4 font-sans select-none">
        <div className="bg-[#d7d7d8] w-full max-w-md rounded-lg border border-zinc-400 shadow-xl overflow-hidden flex flex-col pb-6">
          {/* Header (Logo & Subtitle) */}
          <div className="bg-white py-6 border-b-2 border-zinc-300 text-center flex flex-col items-center gap-1.5">
            <div className="flex items-center">
              <span className="text-3xl font-extrabold tracking-tight select-none flex items-center">
                <span className="text-[#0a354c] leading-none">n</span>
                <span
                  className="inline-block w-4.5 h-4.5 rounded-full border-4 border-[#1588b3] mx-0.5 align-middle"
                  style={{ borderWidth: "3.5px" }}
                />
                <span className="text-[#0a354c] leading-none">d</span>
                <span
                  className="inline-block w-4.5 h-4.5 rounded-full border-4 border-[#1588b3] mx-0.5 align-middle"
                  style={{ borderWidth: "3.5px" }}
                />
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-wider text-[#242424] leading-tight">
              CUSTODIA
            </h1>
            <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
              Sistema de Control de Casilleros
            </p>
          </div>

          {/* Form Content */}
          <div className="px-6 py-4 flex flex-col gap-4">
            <div className="bg-[#242424] text-white py-1 px-4 text-xs font-bold uppercase tracking-wider">
              INICIAR SESIÓN
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-xs font-bold uppercase tracking-wider text-zinc-700"
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
                    className="w-full pl-10 pr-3 py-2 bg-white border border-zinc-300 rounded-md text-sm font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#00c5ff]"
                    placeholder="Ingrese su usuario"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-zinc-700"
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
                    className="w-full pl-10 pr-3 py-2 bg-white border border-zinc-300 rounded-md text-sm font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#00c5ff]"
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
                className="w-full bg-[#242424] hover:bg-[#323232] disabled:bg-zinc-500 disabled:cursor-not-allowed text-white text-sm font-bold py-3 px-6 rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md select-none mt-2"
                disabled={isLoading}
              >
                {isLoading ? "Verificando..." : "Entrar al Sistema"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
