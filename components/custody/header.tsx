"use client";

import {
  Box,
  History,
  ArrowLeft,
  DollarSign,
  User as UserIcon,
  LogOut,
  Printer,
  RotateCcw,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustodyStore } from "@/lib/custody-store";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { printerService } from "@/lib/printer-service";
import Swal from "sweetalert2";

const showToast = (
  message: string,
  icon: "success" | "error" | "warning" | "info" = "warning",
) => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  }).fire({
    icon,
    title: message,
  });
};

interface HeaderProps {
  showHistory?: boolean;
  showBack?: boolean;
  showCash?: boolean;
  showShutdown?: boolean;
}

export function Header({
  showHistory = false,
  showBack = false,
  showCash = false,
  showShutdown = false,
}: HeaderProps) {
  const { currentUser, logout } = useCustodyStore();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setTheme(nextTheme);
  };

  // Printer settings state
  const [isNative, setIsNative] = useState(false);
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<any>({
    connected: false,
    status: "Cargando...",
  });
  const [printerMode, setPrinterMode] = useState<string>("0"); // '0': BT, '1': USB, '2': NET
  const [printerAddress, setPrinterAddress] = useState<string>("");
  const [btDevices, setBtDevices] = useState<any[]>([]);
  const [usbDevices, setUsbDevices] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const nativeVal = printerService.isNative();
    setIsNative(nativeVal);
    if (nativeVal) {
      const savedAddress = localStorage.getItem("printer_address") || "";
      const savedMode = localStorage.getItem("printer_mode") || "0";
      setPrinterAddress(savedAddress);
      setPrinterMode(savedMode);

      printerService.getPrinterStatus().then((status) => {
        setPrinterStatus(status);
        if (!status.connected && savedAddress) {
          setIsConnecting(true);
          printerService
            .connectPrinter(savedAddress, parseInt(savedMode, 10))
            .then((res) => {
              setPrinterStatus({ connected: true, status: res.status });
            })
            .catch((err) => {
              setPrinterStatus({
                connected: false,
                status: "Fallo auto-conexión: " + err.message,
              });
            })
            .finally(() => setIsConnecting(false));
        }
      });
    }
  }, []);

  const scanDevices = async () => {
    if (printerMode === "0") {
      try {
        const list = await printerService.getBluetoothDevices();
        setBtDevices(list);
      } catch (err: any) {
        showToast("Error al escanear Bluetooth: " + err.message, "error");
      }
    } else if (printerMode === "1") {
      try {
        const list = await printerService.getUsbDevices();
        setUsbDevices(list);
      } catch (err: any) {
        showToast("Error al buscar USB: " + err.message, "error");
      }
    }
  };

  const handleConnect = async (addressToConnect: string = printerAddress) => {
    if (!addressToConnect) return;
    setIsConnecting(true);
    try {
      const modeInt = parseInt(printerMode, 10);
      const res = await printerService.connectPrinter(
        addressToConnect,
        modeInt,
      );
      localStorage.setItem("printer_address", addressToConnect);
      localStorage.setItem("printer_mode", printerMode);
      setPrinterAddress(addressToConnect);
      setPrinterStatus({ connected: true, status: res.status });
      showToast("Conectado con éxito", "success");
    } catch (err: any) {
      showToast("Error al conectar: " + err.message, "error");
      setPrinterStatus({ connected: false, status: "Error: " + err.message });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await printerService.disconnectPrinter();
      setPrinterStatus({ connected: false, status: "Sin conectar" });
      showToast("Impresora desconectada", "info");
    } catch (err: any) {
      showToast("Error al desconectar: " + err.message, "error");
    }
  };

  const handleTestPrint = async () => {
    const ok = await printerService.printTestTicket();
    if (!ok) {
      showToast("No se pudo imprimir el ticket de prueba", "error");
    } else {
      showToast("Ticket de prueba impreso", "success");
    }
  };

  return (
    <>
      <header className="flex flex-col lg:flex-row lg:items-center justify-between px-4 sm:px-6 py-3 lg:py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 transition-colors duration-300 gap-2.5 lg:gap-0">
        {/* Row 1: Logo & Slogan */}
        <div className="w-full lg:w-auto flex items-center justify-between">
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-xl sm:text-2xl font-extrabold tracking-wider text-[#0a354c] dark:text-[#00c5ff] uppercase select-none leading-none">
              CUSTODIA
            </span>
            <span className="text-[8px] sm:text-[9px] text-zinc-500 font-semibold uppercase tracking-wider leading-none">
              Sistema de Control de Casilleros
            </span>
          </div>
        </div>

        {/* Row 2: Core navigation buttons (Visible on mobile/tablet here, below Row 1) */}
        <div className="flex items-center gap-1 sm:gap-2 w-full lg:hidden border-t border-zinc-100 dark:border-zinc-800/60 pt-2.5">
          {isNative && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPrinterDialog(true);
                printerService.getPrinterStatus().then(setPrinterStatus);
              }}
              className={`rounded-full h-7 px-2 sm:px-3 text-xs font-medium border-zinc-400 bg-white ${
                printerStatus.connected
                  ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                  : "text-amber-600 hover:bg-amber-50"
              }`}
              title="Configurar Impresora"
            >
              <Printer className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline-block">
                {printerStatus.connected ? "Impresora OK" : "Impresora"}
              </span>
            </Button>
          )}

          {showCash && (
            <Button
              asChild
              variant="outline"
              className="border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-full h-7 px-2 sm:px-3 text-[10px] font-bold leading-none transition-colors duration-200"
              title="Caja"
            >
              <Link href="/caja" className="flex items-center">
                <DollarSign className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline-block">Caja</span>
              </Link>
            </Button>
          )}
          {showHistory && (
            <Button
              asChild
              variant="outline"
              className="border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-full h-7 px-2 sm:px-3 text-[10px] font-bold leading-none transition-colors duration-200"
              title="Ver Historial"
            >
              <Link href="/historial" className="flex items-center">
                <History className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline-block">Historial</span>
              </Link>
            </Button>
          )}
          {showBack && (
            <Button
              asChild
              variant="outline"
              className="border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-full h-7 px-2 sm:px-3 text-[10px] font-bold leading-none transition-colors duration-200"
              title="Volver"
            >
              <Link href="/" className="flex items-center">
                <ArrowLeft className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline-block">Volver</span>
              </Link>
            </Button>
          )}
        </div>

        {/* Row 3: Status, theme toggle, profile & logout (on mobile/tablet, aligned below Row 2) */}
        <div className="flex items-center justify-start lg:justify-end w-full lg:w-auto gap-2 border-t lg:border-t-0 border-zinc-100 dark:border-zinc-800 pt-2.5 lg:pt-0">
          {/* Navigation buttons: Impresora, Caja, Historial, Volver (Visible on desktop here) */}
          <div className="hidden lg:flex items-center gap-2 mr-2">
            {isNative && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPrinterDialog(true);
                  printerService.getPrinterStatus().then(setPrinterStatus);
                }}
                className={`rounded-full h-7 px-3 text-xs font-medium border-zinc-400 bg-white ${
                  printerStatus.connected
                    ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                    : "text-amber-600 hover:bg-amber-50"
                }`}
                title="Configurar Impresora"
              >
                <Printer className="h-3 w-3 mr-1" />
                {printerStatus.connected ? "Impresora OK" : "Impresora"}
              </Button>
            )}

            {showCash && (
              <Button
                asChild
                variant="outline"
                className="border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-full h-7 px-3 text-[10px] font-bold leading-none transition-colors duration-200"
              >
                <Link href="/caja">Caja</Link>
              </Button>
            )}
            {showHistory && (
              <Button
                asChild
                variant="outline"
                className="border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-full h-7 px-3 text-[10px] font-bold leading-none transition-colors duration-200"
              >
                <Link href="/historial">Ver Historial</Link>
              </Button>
            )}
            {showBack && (
              <Button
                asChild
                variant="outline"
                className="border-zinc-400 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-full h-7 px-3 text-[10px] font-bold leading-none transition-colors duration-200"
              >
                <Link href="/">Volver</Link>
              </Button>
            )}
          </div>



          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-7 w-7 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
            title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* User & Session */}
          {currentUser && (
            <div className="flex items-center gap-1 sm:gap-1.5 ml-1 pl-1 sm:ml-2 sm:pl-2 border-l border-zinc-300 dark:border-zinc-700">
              <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full capitalize">
                {currentUser.username}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.reload()}
                className="h-7 w-7 text-zinc-500 hover:text-[#1588b3] hover:bg-[#1588b3]/10 rounded-full"
                title="Refrescar pantalla"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  logout();
                  window.location.href = "/";
                }}
                className="h-7 w-7 text-zinc-500 hover:text-destructive hover:bg-destructive/10 rounded-full"
                title="Cerrar sesión"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Printer Dialog Settings */}
      {isNative && (
        <Dialog open={showPrinterDialog} onOpenChange={setShowPrinterDialog}>
          <DialogContent className="bg-card border-border sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Configuración de Impresora
              </DialogTitle>
              <DialogDescription>
                Conecte su dispositivo a la impresora térmica (Bluetooth, USB o
                Red).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex flex-col gap-2 p-3 bg-secondary/35 rounded-lg border border-border">
                <div className="text-xs text-muted-foreground">
                  Estado Actual:
                </div>
                <div
                  className={`text-sm font-bold ${printerStatus.connected ? "text-emerald-500" : "text-amber-500"}`}
                >
                  {printerStatus.status || "Desconectado"}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="printer-mode">Método de Conexión</Label>
                <Select
                  value={printerMode}
                  onValueChange={(val) => {
                    setPrinterMode(val);
                    setBtDevices([]);
                    setUsbDevices([]);
                  }}
                >
                  <SelectTrigger id="printer-mode" className="bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Bluetooth</SelectItem>
                    <SelectItem value="1">USB</SelectItem>
                    <SelectItem value="2">Red (TCP/IP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {printerMode === "0" && ( // Bluetooth Scan & Select
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Dispositivos Bluetooth Vinculados</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={scanDevices}
                      className="h-7 text-xs"
                    >
                      Escanear
                    </Button>
                  </div>
                  {btDevices.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-3 border border-dashed border-border rounded text-center">
                      Haga clic en Escanear para listar dispositivos.
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 border border-border p-2 rounded">
                      {btDevices.map((dev) => (
                        <div
                          key={dev.address}
                          onClick={() => {
                            setPrinterAddress(dev.address);
                            handleConnect(dev.address);
                          }}
                          className={`text-xs p-2 rounded cursor-pointer transition-colors flex justify-between items-center ${printerAddress === dev.address ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                        >
                          <span className="font-semibold">{dev.name}</span>
                          <span className="opacity-70 font-mono">
                            {dev.address}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {printerMode === "1" && ( // USB List
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Puertos USB Detectados</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={scanDevices}
                      className="h-7 text-xs"
                    >
                      Escanear
                    </Button>
                  </div>
                  {usbDevices.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-3 border border-dashed border-border rounded text-center">
                      Haga clic en Escanear para listar puertos USB.
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 border border-border p-2 rounded">
                      {usbDevices.map((path) => (
                        <div
                          key={path}
                          onClick={() => {
                            setPrinterAddress(path);
                            handleConnect(path);
                          }}
                          className={`text-xs p-2 rounded cursor-pointer transition-colors ${printerAddress === path ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                        >
                          <span className="font-mono">{path}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {printerMode === "2" && ( // Red IP Input
                <div className="space-y-2">
                  <Label htmlFor="printer-ip">
                    Dirección IP de la Impresora
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="printer-ip"
                      type="text"
                      value={printerAddress}
                      onChange={(e) => setPrinterAddress(e.target.value)}
                      placeholder="ej. 192.168.1.100"
                      className="bg-input"
                    />
                    <Button
                      onClick={() => handleConnect()}
                      disabled={isConnecting}
                    >
                      Conectar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-row sm:justify-between gap-2">
              <div>
                {printerStatus.connected && (
                  <Button variant="outline" size="sm" onClick={handleTestPrint}>
                    Prueba de Impresión
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {printerStatus.connected ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                  >
                    Desconectar
                  </Button>
                ) : (
                  printerMode !== "2" && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleConnect()}
                      disabled={isConnecting || !printerAddress}
                    >
                      {isConnecting ? "Conectando..." : "Conectar"}
                    </Button>
                  )
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPrinterDialog(false)}
                >
                  Cerrar
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
