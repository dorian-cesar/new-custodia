'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useCustodyStore } from '@/lib/custody-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Luggage, 
  ArrowRight, 
  ArrowLeft, 
  User as UserIcon, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Coins, 
  CreditCard, 
  AlertTriangle,
  Printer,
  Delete
} from 'lucide-react'
import { type LockerSize, LOCKER_COLS, LOCKER_ROWS } from '@/lib/types'
import { BancardModal } from '@/components/custody/bancard-modal'
import { Barcode } from '@/components/custody/barcode'
import { useReactToPrint } from 'react-to-print'
import { Ticket } from '@/components/custody/ticket'

export default function TotemPage() {
  const [step, setStep] = useState(1) // 1: Welcome, 2: Doc, 3: Size, 4: Locker, 5: Pay, 6: Success
  const [document, setDocument] = useState('')
  const [selectedSize, setSelectedSize] = useState<LockerSize | null>(null)
  const [selectedLockerId, setSelectedLockerId] = useState<number | null>(null)

  // Payment states
  const [bancardMode, setBancardMode] = useState<'entry' | null>(null)
  const [bancardAmount, setBancardAmount] = useState(0)
  const [createdRecord, setCreatedRecord] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Cash payment calculator states
  const [isCashPaymentActive, setIsCashPaymentActive] = useState(false)
  const [cashReceived, setCashReceived] = useState<number>(0)

  const { lockerSizes, lockers, createRecord, currentCashRegister } = useCustodyStore()

  const isCashOpen = currentCashRegister?.status === 'open'

  // Print references and handler
  const ticketRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: 'Ticket_Custodia_Totem',
  })

  // Automatically print when a new record is created
  useEffect(() => {
    if (createdRecord) {
      const timer = setTimeout(() => {
        handlePrint()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [createdRecord, handlePrint])

  // Build a structured grid: rows × cols
  const lockerGrid = useMemo(() => {
    return LOCKER_ROWS.map((row) =>
      LOCKER_COLS.map((col) =>
        lockers.find((l) => l.row === row && l.col === col)
      )
    )
  }, [lockers])

  const availableCount = lockers.filter(l => !l.isOccupied).length
  const selectedSizeInfo = lockerSizes.find(s => s.value === selectedSize)
  const entryPrice = selectedSizeInfo ? selectedSizeInfo.price : 0

  const resetFlow = () => {
    setStep(1)
    setDocument('')
    setSelectedSize(null)
    setSelectedLockerId(null)
    setCreatedRecord(null)
    setIsProcessing(false)
    setIsCashPaymentActive(false)
    setCashReceived(0)
  }

  const nextStep = () => setStep(prev => prev + 1)
  const prevStep = () => {
    if (step === 5 && isCashPaymentActive) {
      setIsCashPaymentActive(false)
      setCashReceived(0)
    } else {
      setStep(prev => Math.max(1, prev - 1))
    }
  }

  const handlePayEfectivo = async () => {
    if (!isCashOpen) return
    setIsProcessing(true)
    try {
      const record = await createRecord(selectedLockerId!, document.trim(), selectedSize!, 'Efectivo')
      if (record) {
        setCreatedRecord(record)
        setStep(6)
      } else {
        alert('Error al registrar la custodia. Por favor intente de nuevo o consulte al cajero.')
      }
    } catch (err) {
      console.error(err)
      alert('Error de conexión al procesar el pago.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePayTarjeta = () => {
    if (!isCashOpen) return
    setBancardAmount(entryPrice)
    setBancardMode('entry')
  }

  const handleBancardSuccess = async () => {
    setBancardMode(null)
    setIsProcessing(true)
    try {
      const record = await createRecord(selectedLockerId!, document.trim(), selectedSize!, 'Tarjeta')
      if (record) {
        setCreatedRecord(record)
        setStep(6)
      } else {
        alert('El pago fue aprobado pero hubo un error al registrar el casillero. Por favor solicite asistencia.')
      }
    } catch (err) {
      console.error(err)
      alert('Error al guardar la transacción con tarjeta.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Cash keypad input handlers
  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setCashReceived(0)
      return
    }
    if (val === '←') {
      const str = cashReceived.toString()
      setCashReceived(str.length <= 1 ? 0 : parseInt(str.slice(0, -1)))
      return
    }
    const str = cashReceived.toString()
    const newStr = str === '0' ? val : str + val
    const parsed = parseInt(newStr)
    if (!isNaN(parsed)) {
      setCashReceived(parsed)
    }
  }

  const addPresetBill = (billVal: number) => {
    setCashReceived(prev => prev + billVal)
  }

  return (
    <div className="flex flex-col w-full min-h-screen min-h-[100dvh] bg-background text-foreground">
      
      {/* Hidden printer helper component */}
      <Ticket ref={ticketRef} record={createdRecord} />

      {/* Bancard Integration Modal */}
      <BancardModal 
        isOpen={bancardMode !== null} 
        onClose={() => setBancardMode(null)} 
        onSuccess={handleBancardSuccess} 
        amount={bancardAmount} 
        description={`Custodia Tótem - ${selectedSizeInfo?.label}`}
        clientId={document || 'totem-autoservicio'}
      />

      {/* HEADER */}
      <header className="bg-card border-b border-border px-6 py-5 text-center shadow-sm shrink-0">
        <h1 className="text-[clamp(1.8rem,4vw,3.2rem)] font-bold text-primary leading-tight">CUSTODIA SEGURA</h1>
        <p className="text-[clamp(0.9rem,2vw,1.5rem)] text-muted-foreground mt-1">Terminal de Autoservicio</p>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        
        {/* STEP 1: WELCOME */}
        {step === 1 && (
          <div className="flex flex-col items-center justify-center w-full max-w-3xl space-y-10 animate-in fade-in zoom-in duration-500">
            <Luggage className="w-[clamp(8rem,20vw,16rem)] h-[clamp(8rem,20vw,16rem)] text-primary" />
            <h2 className="text-[clamp(2rem,5vw,3.8rem)] font-extrabold text-center leading-tight">
              Bienvenido al <br/>
              Guarda Equipaje
            </h2>
            <p className="text-[clamp(1rem,2.5vw,1.5rem)] text-muted-foreground text-center">
              {availableCount} casilleros disponibles
            </p>
            <Button 
              onClick={nextStep}
              className="text-[clamp(1.2rem,3vw,2.2rem)] py-8 px-16 rounded-full h-auto shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
            >
              TOCAR PARA COMENZAR
            </Button>
          </div>
        )}

        {/* STEP 2: CEDULA / RUC */}
        {step === 2 && (
          <div className="flex flex-col w-full max-w-3xl space-y-8 animate-in slide-in-from-right-12 duration-300">
            <h2 className="text-[clamp(1.5rem,4vw,3rem)] font-bold text-center">Ingrese su Cédula o RUC</h2>
            
            <div className="space-y-4">
              <Label className="text-[clamp(1rem,2.5vw,1.8rem)] text-muted-foreground flex items-center gap-3">
                <UserIcon className="w-6 h-6 shrink-0" />
                Documento de Identidad
              </Label>
              <Input 
                type="text"
                inputMode="numeric"
                placeholder="Ej: 1234567"
                className="text-[clamp(1.5rem,4vw,3rem)] h-[clamp(3.5rem,8vw,6rem)] px-6 bg-input border-2 border-border focus:border-primary"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
              />
              <p className="text-[clamp(0.8rem,1.5vw,1.2rem)] text-muted-foreground">
                Por favor utilice el teclado de la pantalla para ingresar los datos.
              </p>
            </div>

            <div className="flex gap-4 mt-8">
              <Button onClick={prevStep} variant="secondary" className="flex-1 text-[clamp(1rem,2.5vw,1.8rem)] py-6 h-auto">
                <ArrowLeft className="mr-2 w-6 h-6 shrink-0" />
                Volver
              </Button>
              <Button 
                onClick={nextStep} 
                disabled={document.length < 4}
                className="flex-1 text-[clamp(1rem,2.5vw,1.8rem)] py-6 h-auto bg-primary hover:bg-primary/90"
              >
                Siguiente
                <ArrowRight className="ml-2 w-6 h-6 shrink-0" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: SIZE SELECTION */}
        {step === 3 && (
          <div className="flex flex-col w-full max-w-3xl space-y-8 animate-in slide-in-from-right-12 duration-300">
            <h2 className="text-[clamp(1.5rem,4vw,3rem)] font-bold text-center">Seleccione el Tamaño</h2>
            
            <div className="grid grid-cols-1 gap-5">
              {lockerSizes.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setSelectedSize(size.value as LockerSize)}
                  className={`flex items-center justify-between p-6 rounded-2xl border-4 text-left transition-all ${
                    selectedSize === size.value 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <Luggage className={`w-10 h-10 shrink-0 ${selectedSize === size.value ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <h3 className="text-[clamp(1.2rem,3vw,2.2rem)] font-bold">{size.label}</h3>
                      <p className="text-[clamp(0.8rem,1.5vw,1.2rem)] text-muted-foreground mt-1">Precio Base 24hs</p>
                    </div>
                  </div>
                  <span className="text-[clamp(1.2rem,3vw,2.5rem)] font-bold text-primary whitespace-nowrap ml-4">
                    Gs. {size.price.toLocaleString('es-PY')}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-4 mt-8">
              <Button onClick={prevStep} variant="secondary" className="flex-1 text-[clamp(1rem,2.5vw,1.8rem)] py-6 h-auto">
                <ArrowLeft className="mr-2 w-6 h-6 shrink-0" />
                Volver
              </Button>
              <Button 
                onClick={nextStep} 
                disabled={!selectedSize}
                className="flex-1 text-[clamp(1rem,2.5vw,1.8rem)] py-6 h-auto bg-primary hover:bg-primary/90"
              >
                Siguiente
                <ArrowRight className="ml-2 w-6 h-6 shrink-0" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: LOCKER SELECTION */}
        {step === 4 && (
          <div className="flex flex-col w-full max-w-4xl space-y-6 animate-in slide-in-from-right-12 duration-300">
            <div className="text-center">
              <h2 className="text-[clamp(1.5rem,4vw,3rem)] font-bold">Elija un Casillero Libre</h2>
              <p className="text-[clamp(0.8rem,1.5vw,1.2rem)] text-muted-foreground mt-2">
                Toque un casillero disponible para seleccionarlo. ({availableCount} disponibles)
              </p>
            </div>

            {/* Leyenda */}
            <div className="flex items-center justify-center gap-6 text-[clamp(0.7rem,1.2vw,1rem)]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-secondary/50 border-2 border-border"></div>
                <span className="text-muted-foreground">Libre</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-destructive/10 border-2 border-destructive/20"></div>
                <span className="text-muted-foreground">Ocupado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-primary border-2 border-primary"></div>
                <span className="text-muted-foreground">Seleccionado</span>
              </div>
            </div>

            {/* Grid de casilleros */}
            <div className="bg-card border-2 border-border rounded-2xl p-4 overflow-hidden">
              {/* Column headers */}
              <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `2.5rem repeat(${LOCKER_COLS.length}, 1fr)` }}>
                <div></div>
                {LOCKER_COLS.map((col) => (
                  <div key={col} className="text-center text-[clamp(0.7rem,1.2vw,1rem)] font-bold text-muted-foreground">
                    {col}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {lockerGrid.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid gap-2 mb-2"
                  style={{ gridTemplateColumns: `2.5rem repeat(${LOCKER_COLS.length}, 1fr)` }}
                >
                  {/* Row label */}
                  <div className="flex items-center justify-center text-[clamp(0.7rem,1.2vw,1rem)] font-bold text-muted-foreground">
                    {rowIndex}
                  </div>

                  {/* Locker cells */}
                  {row.map((locker) => {
                    if (!locker) return <div key={Math.random()} />
                    const isAvailable = !locker.isOccupied
                    const isSelected = selectedLockerId === locker.id

                    return (
                      <button
                        key={locker.id}
                        disabled={!isAvailable}
                        onClick={() => setSelectedLockerId(locker.id)}
                        className={`
                          aspect-square w-full flex flex-col items-center justify-center rounded-xl
                          text-[clamp(0.7rem,1.5vw,1.3rem)] font-bold border-3 transition-all
                          ${!isAvailable
                            ? 'bg-destructive/10 border-destructive/20 text-destructive/40 cursor-not-allowed'
                            : ''
                          }
                          ${isAvailable && !isSelected
                            ? 'bg-secondary/50 border-border hover:border-primary/50 hover:bg-primary/5 text-foreground'
                            : ''
                          }
                          ${isSelected
                            ? 'bg-primary border-primary text-primary-foreground scale-105 shadow-lg shadow-primary/30'
                            : ''
                          }
                        `}
                      >
                        {isAvailable ? (
                          <Unlock className="w-[clamp(0.8rem,1.5vw,1.2rem)] h-[clamp(0.8rem,1.5vw,1.2rem)] mb-0.5 opacity-60" />
                        ) : (
                          <Lock className="w-[clamp(0.8rem,1.5vw,1.2rem)] h-[clamp(0.8rem,1.5vw,1.2rem)] mb-0.5 opacity-40" />
                        )}
                        {locker.row}-{locker.col}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button onClick={prevStep} variant="secondary" className="flex-1 text-[clamp(1rem,2.5vw,1.8rem)] py-6 h-auto">
                <ArrowLeft className="mr-2 w-6 h-6 shrink-0" />
                Volver
              </Button>
              <Button 
                onClick={nextStep} 
                disabled={!selectedLockerId}
                className="flex-1 text-[clamp(1rem,2.5vw,1.8rem)] py-6 h-auto bg-primary hover:bg-primary/90"
              >
                Ir al Pago
                <ArrowRight className="ml-2 w-6 h-6 shrink-0" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: RESUMEN Y MÉTODOS DE PAGO */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center w-full max-w-3xl space-y-6 animate-in slide-in-from-bottom-12 duration-500 text-center">
            <h2 className="text-[clamp(1.8rem,4vw,3.2rem)] font-bold">Resumen de Custodia</h2>
            
            <div className="bg-card w-full border border-border rounded-2xl p-6 text-left space-y-4 shadow-sm">
              <div className="flex justify-between items-center text-[clamp(0.9rem,2vw,1.4rem)] border-b border-border/60 pb-3">
                <span className="text-muted-foreground">Documento:</span>
                <span className="font-bold">{document}</span>
              </div>
              <div className="flex justify-between items-center text-[clamp(0.9rem,2vw,1.4rem)] border-b border-border/60 pb-3">
                <span className="text-muted-foreground">Tamaño:</span>
                <span className="font-bold">{selectedSizeInfo?.label}</span>
              </div>
              <div className="flex justify-between items-center text-[clamp(0.9rem,2vw,1.4rem)] border-b border-border/60 pb-3">
                <span className="text-muted-foreground">Casillero:</span>
                <span className="font-bold">
                  {lockers.find(l => l.id === selectedLockerId)?.row}-{lockers.find(l => l.id === selectedLockerId)?.col}
                </span>
              </div>
              <div className="flex justify-between items-center text-[clamp(1.1rem,2.5vw,1.8rem)] pt-1">
                <span className="font-bold text-muted-foreground">Total a Pagar:</span>
                <span className="font-extrabold text-primary text-[clamp(1.3rem,3vw,2.5rem)]">
                  Gs. {entryPrice.toLocaleString('es-PY')}
                </span>
              </div>
            </div>

            {/* Cash Status Check */}
            {!isCashOpen ? (
              <div className="w-full bg-destructive/10 border border-destructive/20 rounded-2xl p-6 flex flex-col items-center gap-3 text-destructive">
                <AlertTriangle className="w-12 h-12" />
                <p className="text-[clamp(1rem,2vw,1.5rem)] font-bold">Terminal Fuera de Servicio</p>
                <p className="text-[clamp(0.8rem,1.5vw,1.2rem)] text-destructive/80">
                  La caja del día está cerrada. Por favor acérquese a un cajero para habilitar la terminal.
                </p>
              </div>
            ) : !isCashPaymentActive ? (
              <div className="w-full space-y-4">
                <p className="text-[clamp(0.9rem,1.8vw,1.3rem)] font-semibold text-muted-foreground">
                  Seleccione su Medio de Pago:
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => setIsCashPaymentActive(true)}
                    disabled={isProcessing}
                    className="h-28 text-[clamp(1.1rem,2.5vw,1.8rem)] rounded-2xl flex flex-col justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md hover:scale-[1.02]"
                  >
                    <Coins className="w-8 h-8" />
                    Pagar con Efectivo
                  </Button>
                  <Button
                    onClick={handlePayTarjeta}
                    disabled={isProcessing}
                    className="h-28 text-[clamp(1.1rem,2.5vw,1.8rem)] rounded-2xl flex flex-col justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md hover:scale-[1.02]"
                  >
                    <CreditCard className="w-8 h-8" />
                    Pagar con Tarjeta
                  </Button>
                </div>
              </div>
            ) : (
              /* ACTIVE CASH PAYMENT CALCULATOR PANEL */
              <div className="w-full bg-card border-2 border-emerald-500/30 rounded-2xl p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[clamp(1rem,2vw,1.4rem)] font-bold text-emerald-600 flex items-center gap-2">
                    <Coins className="w-6 h-6" />
                    Pago en Efectivo
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setIsCashPaymentActive(false); setCashReceived(0); }}
                    className="text-muted-foreground"
                  >
                    Cambiar Método
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Side: Display & Presets */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground text-left block mb-1">Efectivo Ingresado</Label>
                      <div className="bg-input border-2 border-border rounded-xl p-4 text-[clamp(1.5rem,3.5vw,2.5rem)] font-extrabold text-foreground flex items-center justify-between">
                        <span className="text-muted-foreground">Gs.</span>
                        <span>{cashReceived.toLocaleString('es-PY')}</span>
                      </div>
                    </div>

                    {/* Vuelto / Balance Indicators */}
                    <div className="space-y-2">
                      {cashReceived >= entryPrice ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 p-4 rounded-xl text-center">
                          <p className="text-xs font-semibold uppercase tracking-wider">Su vuelto a recibir</p>
                          <p className="text-[clamp(1.4rem,3vw,2.2rem)] font-black">
                            Gs. {(cashReceived - entryPrice).toLocaleString('es-PY')}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 p-4 rounded-xl text-center">
                          <p className="text-xs font-semibold uppercase tracking-wider">Monto Restante</p>
                          <p className="text-[clamp(1.4rem,3vw,2.2rem)] font-black">
                            Gs. {(entryPrice - cashReceived).toLocaleString('es-PY')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Preset Paraguay bills shortcuts */}
                    <div>
                      <Label className="text-xs text-muted-foreground text-left block mb-2">Billetes Rápidos (Toque para agregar)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[10000, 20000, 50000, 100000].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => addPresetBill(val)}
                            className="bg-secondary hover:bg-secondary/80 border border-border h-12 rounded-xl text-sm font-bold transition-all active:scale-95"
                          >
                            + {val.toLocaleString('es-PY')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Virtual Numeric Keypad */}
                  <div className="bg-muted/50 p-4 rounded-xl border border-border">
                    <div className="grid grid-cols-3 gap-2">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleKeypadPress(num)}
                          className="bg-card hover:bg-secondary/40 border border-border/80 h-14 rounded-xl text-xl font-bold flex items-center justify-center shadow-sm active:scale-95 transition-all"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('C')}
                        className="bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive h-14 rounded-xl text-lg font-bold flex items-center justify-center active:scale-95 transition-all"
                      >
                        Borrar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('0')}
                        className="bg-card hover:bg-secondary/40 border border-border/80 h-14 rounded-xl text-xl font-bold flex items-center justify-center shadow-sm active:scale-95 transition-all"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('←')}
                        className="bg-card hover:bg-secondary/40 border border-border/80 h-14 rounded-xl text-xl font-bold flex items-center justify-center shadow-sm active:scale-95 transition-all text-muted-foreground"
                      >
                        <Delete className="w-6 h-6" />
                      </button>
                    </div>
                    
                    {/* Extra Triple Zero Shortcut Button */}
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('000')}
                      className="w-full mt-2 bg-card hover:bg-secondary/40 border border-border/80 h-12 rounded-xl text-lg font-extrabold flex items-center justify-center shadow-sm active:scale-95 transition-all"
                    >
                      .000 (Mil)
                    </button>
                  </div>
                </div>

                {/* Confirm Cash Payment Button */}
                <Button
                  onClick={handlePayEfectivo}
                  disabled={isProcessing || cashReceived < entryPrice}
                  className="w-full py-8 text-[clamp(1.2rem,2.5vw,1.8rem)] font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Procesando...' : 'Confirmar Pago y Abrir Casillero'}
                </Button>
              </div>
            )}

            <div className="flex gap-4 w-full mt-6">
              <Button onClick={prevStep} variant="outline" className="flex-1 text-[clamp(0.9rem,2vw,1.5rem)] py-5 h-auto">
                Corregir Datos
              </Button>
              <Button onClick={resetFlow} variant="destructive" className="flex-1 text-[clamp(0.9rem,2vw,1.5rem)] py-5 h-auto">
                Cancelar e Inicio
              </Button>
            </div>
          </div>
        )}

        {/* STEP 6: SUCCESS */}
        {step === 6 && createdRecord && (
          <div className="flex flex-col items-center justify-center w-full max-w-3xl space-y-8 animate-in zoom-in duration-500 text-center">
            <CheckCircle2 className="w-[clamp(5rem,15vw,10rem)] h-[clamp(5rem,15vw,10rem)] text-primary animate-bounce" />
            <h2 className="text-[clamp(2rem,5vw,3.8rem)] font-black text-primary">¡Pago Exitoso!</h2>
            <p className="text-[clamp(1.1rem,2.5vw,1.6rem)] font-bold text-foreground">
              El Casillero <span className="bg-primary/20 text-primary px-4 py-1.5 rounded-lg">{lockers.find(l => l.id === selectedLockerId)?.row}-{lockers.find(l => l.id === selectedLockerId)?.col}</span> se ha abierto.
            </p>
            
            <div className="bg-card w-full border-2 border-border rounded-3xl p-6 space-y-5 flex flex-col items-center shadow-md">
              <p className="text-[clamp(0.8rem,1.8vw,1.2rem)] text-muted-foreground">
                Conserve este código o el ticket impreso para retirar su equipaje:
              </p>
              
              {/* Render Barcode */}
              <div className="bg-white p-3 rounded-lg border border-border">
                <Barcode value={createdRecord.code} />
              </div>
              
              <div className="text-center font-mono text-[clamp(0.9rem,2vw,1.4rem)] font-bold tracking-wider text-muted-foreground">
                {createdRecord.code}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full mt-4">
              <Button 
                onClick={handlePrint}
                variant="outline"
                className="flex-1 text-[clamp(1rem,2vw,1.5rem)] py-5 h-auto border-primary text-primary hover:bg-primary/10 flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Reimprimir Ticket
              </Button>
              <Button 
                onClick={resetFlow}
                className="flex-1 text-[clamp(1rem,2vw,1.5rem)] py-5 rounded-full h-auto bg-primary hover:bg-primary/90"
              >
                Finalizar e Inicio
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-muted px-6 py-4 text-center text-muted-foreground text-[clamp(0.7rem,1.2vw,1rem)] shrink-0">
        <p>Ante cualquier inconveniente, comuníquese con el administrador del recinto.</p>
      </footer>
    </div>
  )
}
