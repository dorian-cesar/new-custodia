'use client'

import { Box, History, ArrowLeft, DollarSign, User as UserIcon, LogOut, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCustodyStore } from '@/lib/custody-store'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { printerService } from '@/lib/printer-service'

interface HeaderProps {
  showHistory?: boolean
  showBack?: boolean
  showCash?: boolean
}

export function Header({ showHistory = false, showBack = false, showCash = false }: HeaderProps) {
  const { currentUser, logout } = useCustodyStore()

  // Printer settings state
  const [isNative, setIsNative] = useState(false)
  const [showPrinterDialog, setShowPrinterDialog] = useState(false)
  const [printerStatus, setPrinterStatus] = useState<any>({ connected: false, status: 'Cargando...' })
  const [printerMode, setPrinterMode] = useState<string>('0') // '0': BT, '1': USB, '2': NET
  const [printerAddress, setPrinterAddress] = useState<string>('')
  const [btDevices, setBtDevices] = useState<any[]>([])
  const [usbDevices, setUsbDevices] = useState<string[]>([])
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    const nativeVal = printerService.isNative()
    setIsNative(nativeVal)
    if (nativeVal) {
      const savedAddress = localStorage.getItem('printer_address') || ''
      const savedMode = localStorage.getItem('printer_mode') || '0'
      setPrinterAddress(savedAddress)
      setPrinterMode(savedMode)
      
      printerService.getPrinterStatus().then(status => {
        setPrinterStatus(status)
        if (!status.connected && savedAddress) {
          setIsConnecting(true)
          printerService.connectPrinter(savedAddress, parseInt(savedMode, 10))
            .then(res => {
              setPrinterStatus({ connected: true, status: res.status })
            })
            .catch(err => {
              setPrinterStatus({ connected: false, status: 'Fallo auto-conexión: ' + err.message })
            })
            .finally(() => setIsConnecting(false))
        }
      })
    }
  }, [])

  const scanDevices = async () => {
    if (printerMode === '0') {
      try {
        const list = await printerService.getBluetoothDevices()
        setBtDevices(list)
      } catch (err: any) {
        alert('Error al escanear Bluetooth: ' + err.message)
      }
    } else if (printerMode === '1') {
      try {
        const list = await printerService.getUsbDevices()
        setUsbDevices(list)
      } catch (err: any) {
        alert('Error al buscar USB: ' + err.message)
      }
    }
  }

  const handleConnect = async (addressToConnect: string = printerAddress) => {
    if (!addressToConnect) return
    setIsConnecting(true)
    try {
      const modeInt = parseInt(printerMode, 10)
      const res = await printerService.connectPrinter(addressToConnect, modeInt)
      localStorage.setItem('printer_address', addressToConnect)
      localStorage.setItem('printer_mode', printerMode)
      setPrinterAddress(addressToConnect)
      setPrinterStatus({ connected: true, status: res.status })
    } catch (err: any) {
      alert('Error al conectar: ' + err.message)
      setPrinterStatus({ connected: false, status: 'Error: ' + err.message })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await printerService.disconnectPrinter()
      setPrinterStatus({ connected: false, status: 'Sin conectar' })
    } catch (err: any) {
      alert('Error al desconectar: ' + err.message)
    }
  }

  const handleTestPrint = async () => {
    const ok = await printerService.printTestTicket()
    if (!ok) alert('No se pudo imprimir el ticket de prueba')
  }

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent rounded-lg">
            <Box className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Custodia</h1>
            <p className="text-sm text-muted-foreground">Sistema de Control de Casilleros</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isNative && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowPrinterDialog(true)
                printerService.getPrinterStatus().then(setPrinterStatus)
              }}
              className={`mr-2 ${printerStatus.connected ? 'border-emerald-500 text-emerald-500 hover:text-emerald-400' : 'border-amber-500 text-amber-500 hover:text-amber-400'}`}
              title="Configurar Impresora"
            >
              <Printer className="h-4 w-4 mr-2" />
              {printerStatus.connected ? 'Impresora Conectada' : 'Configurar Impresora'}
            </Button>
          )}

          {showCash && (
            <Button asChild variant="default" className="bg-primary hover:bg-primary/90">
              <Link href="/caja">
                <DollarSign className="h-4 w-4 mr-2" />
                Caja
              </Link>
            </Button>
          )}
          {showHistory && (
            <Button asChild variant="default" className="bg-primary hover:bg-primary/90">
              <Link href="/historial">
                <History className="h-4 w-4 mr-2" />
                Ver Historial
              </Link>
            </Button>
          )}
          {showBack && (
            <Button asChild variant="secondary">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 ml-4 pl-4 border-l border-border">
          {currentUser && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground capitalize">
                  {currentUser.username}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
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
                Conecte su dispositivo a la impresora térmica (Bluetooth, USB o Red).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex flex-col gap-2 p-3 bg-secondary/35 rounded-lg border border-border">
                <div className="text-xs text-muted-foreground">Estado Actual:</div>
                <div className={`text-sm font-bold ${printerStatus.connected ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {printerStatus.status || 'Desconectado'}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="printer-mode">Método de Conexión</Label>
                <Select value={printerMode} onValueChange={(val) => { setPrinterMode(val); setBtDevices([]); setUsbDevices([]); }}>
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

              {printerMode === '0' && ( // Bluetooth Scan & Select
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Dispositivos Bluetooth Vinculados</Label>
                    <Button variant="outline" size="xs" onClick={scanDevices} className="h-7 text-xs">Escanear</Button>
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
                          onClick={() => { setPrinterAddress(dev.address); handleConnect(dev.address); }}
                          className={`text-xs p-2 rounded cursor-pointer transition-colors flex justify-between items-center ${printerAddress === dev.address ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                        >
                          <span className="font-semibold">{dev.name}</span>
                          <span className="opacity-70 font-mono">{dev.address}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {printerMode === '1' && ( // USB List
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Puertos USB Detectados</Label>
                    <Button variant="outline" size="xs" onClick={scanDevices} className="h-7 text-xs">Escanear</Button>
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
                          onClick={() => { setPrinterAddress(path); handleConnect(path); }}
                          className={`text-xs p-2 rounded cursor-pointer transition-colors ${printerAddress === path ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
                        >
                          <span className="font-mono">{path}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {printerMode === '2' && ( // Red IP Input
                <div className="space-y-2">
                  <Label htmlFor="printer-ip">Dirección IP de la Impresora</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="printer-ip" 
                      type="text" 
                      value={printerAddress} 
                      onChange={(e) => setPrinterAddress(e.target.value)}
                      placeholder="ej. 192.168.1.100" 
                      className="bg-input"
                    />
                    <Button onClick={() => handleConnect()} disabled={isConnecting}>Conectar</Button>
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
                  <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                    Desconectar
                  </Button>
                ) : (
                  printerMode !== '2' && (
                    <Button variant="default" size="sm" onClick={() => handleConnect()} disabled={isConnecting || !printerAddress}>
                      {isConnecting ? 'Conectando...' : 'Conectar'}
                    </Button>
                  )
                )}
                <Button variant="secondary" size="sm" onClick={() => setShowPrinterDialog(false)}>Cerrar</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
