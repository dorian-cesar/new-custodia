'use client'

import { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { WithdrawalTicket } from '@/components/custody/withdrawal-ticket'
import { printerService } from '@/lib/printer-service'
import {
  DollarSign,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Receipt,
  Clock,
  AlertCircle,
  History,
} from 'lucide-react'
import { Header } from '@/components/custody/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCustodyStore } from '@/lib/custody-store'
import { formatDateTime } from '@/lib/types'
import { verifySupervisor } from '@/app/actions/db-actions'

export default function CajaPage() {
  const {
    currentCashRegister,
    cashRegisters,
    cashTransactions,
    openCashRegister,
    closeCashRegister,
    getCurrentRegisterStats,
    logout,
    addTransaction,
  } = useCustodyStore()

  const [mounted, setMounted] = useState(false)
  const [withdrawalData, setWithdrawalData] = useState<{
    amount: number
    cajero: string
    supervisor: string
    reason: string
    timestamp: string
  } | null>(null)

  const withdrawalTicketRef = useRef<HTMLDivElement>(null)
  const handlePrintWithdrawal = useReactToPrint({
    contentRef: withdrawalTicketRef,
    documentTitle: 'Comprobante_Retiro',
  })
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [showOpenDialog, setShowOpenDialog] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  
  // Giro State
  const [showGiroDialog, setShowGiroDialog] = useState(false)
  const [giroAmount, setGiroAmount] = useState('')
  const [giroReason, setGiroReason] = useState('')
  const [isProcessingGiro, setIsProcessingGiro] = useState(false)

  const [error, setError] = useState('')
  const [supervisorUsername, setSupervisorUsername] = useState('')
  const [supervisorPassword, setSupervisorPassword] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Pagination for cash registers
  const [currentPageRegisters, setCurrentPageRegisters] = useState(1)
  const REGISTERS_PER_PAGE = 5

  const sortedRegisters = [...cashRegisters].sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
  const totalRegisterPages = Math.ceil(sortedRegisters.length / REGISTERS_PER_PAGE)
  const paginatedRegisters = sortedRegisters.slice((currentPageRegisters - 1) * REGISTERS_PER_PAGE, currentPageRegisters * REGISTERS_PER_PAGE)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (showCloseDialog && stats) {
      setClosingAmount(stats.balance.toString())
    }
  }, [showCloseDialog, stats])

  useEffect(() => {
    if (showGiroDialog && stats) {
      setGiroAmount(stats.balance.toString())
    }
  }, [showGiroDialog, stats])

  useEffect(() => {
    if (withdrawalData) {
      if (!printerService.isNative()) {
        handlePrintWithdrawal()
      }
    }
  }, [withdrawalData])

  const isCashOpen = currentCashRegister?.status === 'open'
  const stats = getCurrentRegisterStats()

  // Pagination for transactions
  const [currentTxPage, setCurrentTxPage] = useState(1)
  const TX_PER_PAGE = 15

  const currentTransactions = currentCashRegister
    ? cashTransactions.filter((t) => t.registerId === currentCashRegister.id)
    : []

  const totalTxPages = Math.ceil(currentTransactions.length / TX_PER_PAGE)
  const paginatedTransactions = currentTransactions.slice((currentTxPage - 1) * TX_PER_PAGE, currentTxPage * TX_PER_PAGE)

  const ingresosTarjeta = stats.ingresosTarjeta || 0
  const ingresosEfectivo = stats.ingresosEfectivo || 0
  const saldoEsperadoEfectivo = stats.balance
  
  const montoContado = parseFloat(closingAmount)
  const diferenciaCaja = !isNaN(montoContado) ? montoContado - saldoEsperadoEfectivo : null

  const handleOpenCash = () => {
    setError('')
    const amount = parseFloat(openingAmount)
    if (isNaN(amount) || amount < 0) {
      setError('Ingrese un monto valido')
      return
    }
    openCashRegister(amount, notes)
    setOpeningAmount('')
    setNotes('')
    setShowOpenDialog(false)
  }

  // State for confirm close dialog
  const [showConfirmCloseDialog, setShowConfirmCloseDialog] = useState(false)
  const [closeSummary, setCloseSummary] = useState<{ expected: number, declared: number, difference: number } | null>(null)

  const handleCloseCash = async () => {
    setError('')
    const amount = parseFloat(closingAmount)
    if (isNaN(amount) || amount < 0) {
      setError('Ingrese un monto válido')
      return
    }
    
    if (!supervisorUsername.trim() || !supervisorPassword.trim()) {
      setError('Debe ingresar las credenciales de un supervisor')
      return
    }

    setIsVerifying(true)
    try {
      const authResult = await verifySupervisor(supervisorUsername, supervisorPassword)
      if (!authResult.success) {
        setError(authResult.error || 'Credenciales de supervisor incorrectas')
        setIsVerifying(false)
        return
      }

      // Instead of closing immediately, we show the confirmation dialog
      const expected = stats.balance
      const difference = amount - expected

      setCloseSummary({ expected, declared: amount, difference })
      setShowCloseDialog(false)
      setShowConfirmCloseDialog(true)
      
    } catch (err) {
      setError('Error al verificar credenciales')
    } finally {
      setIsVerifying(false)
    }
  }

  const confirmAndExecuteClose = async () => {
    if (!closeSummary) return
    setIsVerifying(true)
    try {
      await closeCashRegister(closeSummary.declared, notes)
      setClosingAmount('')
      setNotes('')
      setSupervisorUsername('')
      setSupervisorPassword('')
      setShowConfirmCloseDialog(false)
      setCloseSummary(null)
      
      // Auto logout according to requirements
      logout()
    } catch (err) {
      setError('Error al cerrar la caja')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleGiro = async () => {
    setError('')
    const amount = parseFloat(giroAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Ingrese un monto válido para el retiro')
      return
    }

    if (!supervisorUsername.trim() || !supervisorPassword.trim()) {
      setError('Debe ingresar las credenciales de un supervisor')
      return
    }

    setIsVerifying(true)
    setIsProcessingGiro(true)
    try {
      const authResult = await verifySupervisor(supervisorUsername, supervisorPassword)
      if (!authResult.success) {
        setError(authResult.error || 'Credenciales de supervisor incorrectas')
        setIsVerifying(false)
        setIsProcessingGiro(false)
        return
      }

      await addTransaction('expense', amount, `Retiro de Caja: ${giroReason.trim()}`)
      
      const timestamp = new Date().toISOString()
      const data = {
        amount,
        cajero: currentCashRegister?.openedBy || 'desconocido',
        supervisor: supervisorUsername,
        reason: giroReason.trim(),
        timestamp
      }
      setWithdrawalData(data)

      if (printerService.isNative()) {
        await printerService.printWithdrawalTicket(
          amount,
          data.cajero,
          data.supervisor,
          data.reason,
          timestamp
        )
      }

      setGiroAmount('')
      setGiroReason('')
      setSupervisorUsername('')
      setSupervisorPassword('')
      setShowGiroDialog(false)
    } catch (err) {
      setError('Error al procesar el retiro')
    } finally {
      setIsVerifying(false)
      setIsProcessingGiro(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showBack />

      <main className="container mx-auto px-6 py-8">
        {/* Current Cash Register Status */}
        <div className="bg-card rounded-xl p-6 border border-border mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-card-foreground">Estado de Caja</h2>
            </div>
            {isCashOpen ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowGiroDialog(true)}
                  variant="outline"
                  className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 dark:text-amber-500"
                >
                  <TrendingDown className="h-4 w-4" />
                  Retiro de Caja
                </Button>
                <Button
                  onClick={() => setShowCloseDialog(true)}
                  variant="destructive"
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Cerrar Caja
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowOpenDialog(true)}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Unlock className="h-4 w-4" />
                Abrir Caja
              </Button>
            )}
          </div>

          {isCashOpen ? (
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Apertura</span>
                </div>
                <p className="text-foreground font-medium">
                  {currentCashRegister && formatDateTime(currentCashRegister.openedAt)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Monto inicial: ${currentCashRegister?.openingAmount.toLocaleString()}
                </p>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Ventas</span>
                </div>
                <p className="text-2xl font-bold text-primary">${stats.totalSales.toLocaleString()}</p>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Receipt className="h-4 w-4" />
                  <span className="text-sm">Transacciones</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stats.totalTransactions}</p>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Saldo Actual</span>
                </div>
                <p className="text-2xl font-bold text-accent">${stats.balance.toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-foreground">La caja esta cerrada</p>
                <p className="text-sm text-muted-foreground">
                  Debe abrir la caja para comenzar a registrar custodias
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Current Session Transactions */}
        {isCashOpen && currentTransactions.length > 0 && (
          <div className="bg-card rounded-xl p-6 border border-border mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-card-foreground">
                Transacciones de la Sesion Actual
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">HORA</TableHead>
                    <TableHead className="text-muted-foreground">TIPO</TableHead>
                    <TableHead className="text-muted-foreground">DESCRIPCION</TableHead>
                    <TableHead className="text-muted-foreground">PAGO</TableHead>
                    <TableHead className="text-muted-foreground text-right">MONTO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((tx) => {
                    let paymentStr = '-'
                    if (tx.description.includes('Efectivo')) paymentStr = 'Efectivo'
                    else if (tx.description.includes('Tarjeta')) paymentStr = 'Tarjeta'

                    return (
                    <TableRow key={tx.id} className="border-border">
                      <TableCell className="text-foreground">
                        {formatDateTime(tx.timestamp)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            tx.type === 'income'
                              ? 'flex items-center gap-1 text-primary'
                              : 'flex items-center gap-1 text-destructive'
                          }
                        >
                          {tx.type === 'income' ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {tx.type === 'income' ? 'Ingreso' : 'Egreso'}
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground">{tx.description}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          paymentStr === 'Efectivo' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' :
                          paymentStr === 'Tarjeta' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-500' :
                          'bg-secondary text-muted-foreground'
                        }`}>
                          {paymentStr}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          tx.type === 'income' ? 'text-primary' : 'text-destructive'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {currentTransactions.length > 0 && (
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground border-t border-border/50 pt-4">
                <div>
                  Mostrando {Math.min(currentTransactions.length, (currentTxPage - 1) * TX_PER_PAGE + 1)} a {Math.min(currentTransactions.length, currentTxPage * TX_PER_PAGE)} de {currentTransactions.length} registros
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentTxPage(p => Math.max(1, p - 1))}
                    disabled={currentTxPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentTxPage(p => Math.min(totalTxPages, p + 1))}
                    disabled={currentTxPage >= totalTxPages || totalTxPages === 0}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cash Register History */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-card-foreground">Historial de Cajas</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">APERTURA</TableHead>
                  <TableHead className="text-muted-foreground">CIERRE</TableHead>
                  <TableHead className="text-muted-foreground text-right">INICIAL</TableHead>
                  <TableHead className="text-muted-foreground text-right">VENTAS</TableHead>
                  <TableHead className="text-muted-foreground text-right">RETIROS</TableHead>
                  <TableHead className="text-muted-foreground text-right">MONTO</TableHead>
                  <TableHead className="text-muted-foreground text-right">CIERRE DE CAJA</TableHead>
                  <TableHead className="text-muted-foreground text-right">DIFERENCIA</TableHead>
                  <TableHead className="text-muted-foreground">ESTADO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRegisters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No hay registros de caja
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRegisters.map((register) => {
                    const regTxs = cashTransactions.filter(t => t.registerId === register.id)
                    const ingresosTarjeta = Math.round(regTxs.filter(t => t.type === 'income' && t.description.includes('Tarjeta')).reduce((s, t) => s + t.amount, 0) / 10) * 10
                    const ingresosEfectivo = Math.round(regTxs.filter(t => t.type === 'income' && !t.description.includes('Tarjeta')).reduce((s, t) => s + t.amount, 0) / 10) * 10
                    const gastosEfectivo = Math.round(regTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) / 10) * 10

                    const saldoEsperadoEfectivo = register.openingAmount + ingresosEfectivo - gastosEfectivo
                    const diferenciaCaja = register.closingAmount !== null ? register.closingAmount - saldoEsperadoEfectivo : null

                    return (
                    <TableRow key={register.id} className="border-border">
                      <TableCell className="text-foreground">
                        {formatDateTime(register.openedAt)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {register.closedAt ? formatDateTime(register.closedAt) : '-'}
                      </TableCell>
                      <TableCell className="text-foreground text-right">
                        ${register.openingAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-amber-500 font-medium text-xs">Efectivo: ${ingresosEfectivo.toLocaleString()}</span>
                          <span className="text-blue-500 font-medium text-xs">Tarjeta: ${ingresosTarjeta.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-destructive text-right font-medium">
                        ${gastosEfectivo.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-accent text-right font-medium">
                        ${saldoEsperadoEfectivo.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-foreground text-right font-bold">
                        {register.closingAmount !== null
                          ? `$${register.closingAmount.toLocaleString()}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {diferenciaCaja !== null ? (
                          <span className={`text-xs font-bold ${diferenciaCaja === 0 ? 'text-emerald-500' : diferenciaCaja > 0 ? 'text-blue-500' : 'text-destructive'}`}>
                            {diferenciaCaja === 0 ? 'Cuadrada ✓' : diferenciaCaja > 0 ? `Sobrante: +$${diferenciaCaja.toLocaleString()}` : `Faltante: -$${Math.abs(diferenciaCaja).toLocaleString()}`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            register.status === 'open'
                              ? 'bg-emerald-500/20 text-emerald-500'
                              : 'bg-zinc-500/20 text-zinc-400'
                          }`}
                        >
                          {register.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </span>
                      </TableCell>
                    </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <div>
                Mostrando {Math.min(sortedRegisters.length, (currentPageRegisters - 1) * REGISTERS_PER_PAGE + 1)} a {Math.min(sortedRegisters.length, currentPageRegisters * REGISTERS_PER_PAGE)} de {sortedRegisters.length} registros
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPageRegisters(p => Math.max(1, p - 1))}
                  disabled={currentPageRegisters === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPageRegisters(p => Math.min(totalRegisterPages, p + 1))}
                  disabled={currentPageRegisters >= totalRegisterPages || totalRegisterPages === 0}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Open Cash Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              Abrir Caja
            </DialogTitle>
            <DialogDescription>
              Ingrese el monto inicial para comenzar la sesion de caja
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto Inicial</Label>
              <Input
                type="text"
                value={openingAmount ? Number(openingAmount).toLocaleString('es-CL') : ''}
                onChange={(e) => setOpeningAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones de apertura..."
                className="bg-input"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowOpenDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpenCash} className="bg-primary hover:bg-primary/90">
              Abrir Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Cash Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Cerrar Caja
            </DialogTitle>
            <DialogDescription>
              Ingrese el monto final contado en caja para cerrar la sesion
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-secondary/40 rounded-md p-2 flex flex-col justify-center">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Monto Inicial</span>
                <span className="text-sm font-semibold text-foreground">${currentCashRegister?.openingAmount.toLocaleString()}</span>
              </div>
              <div className="bg-secondary/40 rounded-md p-2 flex flex-col justify-center">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Total Ventas</span>
                <span className="text-sm font-semibold text-primary">${stats.totalSales.toLocaleString()}</span>
              </div>
              <div className="bg-secondary/40 rounded-md p-2 flex flex-col justify-center">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">En Efectivo</span>
                <span className="text-sm font-semibold text-foreground">${ingresosEfectivo.toLocaleString()}</span>
              </div>
              <div className="bg-secondary/40 rounded-md p-2 flex flex-col justify-center">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Por Tarjeta</span>
                <span className="text-sm font-semibold text-muted-foreground">${ingresosTarjeta.toLocaleString()}</span>
              </div>
              <div className="col-span-2 bg-accent/10 border border-accent/20 rounded-md p-2.5 flex justify-between items-center mt-1">
                <span className="text-xs font-bold text-accent uppercase tracking-wider">Efectivo Físico Esperado</span>
                <span className="text-lg font-black text-accent">${saldoEsperadoEfectivo.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Label>Monto Físico Contado (Efectivo)</Label>
                {diferenciaCaja !== null && (
                  <span className={`text-xs font-bold ${diferenciaCaja === 0 ? 'text-emerald-500' : diferenciaCaja > 0 ? 'text-blue-500' : 'text-destructive'}`}>
                    {diferenciaCaja === 0 ? 'Caja Cuadrada ✓' : diferenciaCaja > 0 ? `Sobrante: +$${diferenciaCaja.toLocaleString()}` : `Faltante: -$${Math.abs(diferenciaCaja).toLocaleString()}`}
                  </span>
                )}
              </div>
              <Input
                type="text"
                value={closingAmount ? Number(closingAmount).toLocaleString('es-CL') : ''}
                onChange={(e) => setClosingAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className={`bg-input ${diferenciaCaja !== null && diferenciaCaja !== 0 ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones de cierre..."
                className="bg-input"
              />
            </div>
            <div className="space-y-4 border-t border-border pt-4 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-destructive" />
                <h4 className="font-medium text-destructive">Autorización de Supervisor Requerida</h4>
              </div>
              <div className="space-y-2">
                <Label>Usuario Supervisor</Label>
                <Input
                  type="text"
                  value={supervisorUsername}
                  onChange={(e) => setSupervisorUsername(e.target.value)}
                  placeholder="ej. admin"
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Contraseña Supervisor</Label>
                <Input
                  type="password"
                  value={supervisorPassword}
                  onChange={(e) => setSupervisorPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-input"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCloseDialog(false)} disabled={isVerifying}>
              Cancelar
            </Button>
            <Button onClick={handleCloseCash} variant="destructive" disabled={isVerifying}>
              {isVerifying ? 'Verificando...' : 'Cerrar Caja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Giro de Caja Dialog */}
      <Dialog open={showGiroDialog} onOpenChange={setShowGiroDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-500" />
              Realizar Retiro de Caja
            </DialogTitle>
            <DialogDescription>
              Retire efectivo de la caja actual. Esta acción requiere autorización del supervisor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto a Retirar ($)</Label>
              <Input
                type="text"
                value={giroAmount ? Number(giroAmount).toLocaleString('es-CL') : ''}
                onChange={(e) => setGiroAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo del Retiro (Opcional)</Label>
              <Input
                type="text"
                value={giroReason}
                onChange={(e) => setGiroReason(e.target.value)}
                placeholder="Ej: Límite de caja excedido, pago a proveedor..."
                className="bg-input"
              />
            </div>
            
            <div className="space-y-4 border-t border-border pt-4 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-amber-500" />
                <h4 className="font-medium text-amber-600 dark:text-amber-500">Autorización de Supervisor Requerida</h4>
              </div>
              <div className="space-y-2">
                <Label>Usuario Supervisor</Label>
                <Input
                  type="text"
                  value={supervisorUsername}
                  onChange={(e) => setSupervisorUsername(e.target.value)}
                  placeholder="ej. admin"
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Contraseña Supervisor</Label>
                <Input
                  type="password"
                  value={supervisorPassword}
                  onChange={(e) => setSupervisorPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-input"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowGiroDialog(false)} disabled={isVerifying || isProcessingGiro}>
              Cancelar
            </Button>
            <Button onClick={handleGiro} className="bg-amber-500 hover:bg-amber-600 text-white" disabled={isVerifying || isProcessingGiro}>
              {isVerifying || isProcessingGiro ? 'Procesando...' : 'Confirmar Retiro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Close Register Dialog */}
      <Dialog open={showConfirmCloseDialog} onOpenChange={setShowConfirmCloseDialog}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="h-5 w-5 text-primary" />
              Confirmar Cierre de Caja
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Por favor, revisa el resumen del cierre antes de confirmar. <strong>Esta acción cerrará tu sesión automáticamente.</strong>
            </DialogDescription>
          </DialogHeader>
          
          {closeSummary && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Monto Esperado (Efectivo)</span>
                  <span className="font-medium">${closeSummary.expected.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Cierre de Caja (Declarado)</span>
                  <span className="font-medium">${closeSummary.declared.toLocaleString()}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Diferencia</span>
                  <span className={`font-bold ${closeSummary.difference === 0 ? 'text-emerald-500' : closeSummary.difference > 0 ? 'text-blue-500' : 'text-destructive'}`}>
                    {closeSummary.difference === 0 
                      ? 'Cuadrada ✓' 
                      : closeSummary.difference > 0 
                        ? `Sobrante: +$${closeSummary.difference.toLocaleString()}` 
                        : `Faltante: -$${Math.abs(closeSummary.difference).toLocaleString()}`
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowConfirmCloseDialog(false)
              setShowCloseDialog(true) // let them edit the amount
            }} disabled={isVerifying}>
              Volver y Editar
            </Button>
            <Button onClick={confirmAndExecuteClose} disabled={isVerifying}>
              {isVerifying ? 'Cerrando Caja...' : 'Confirmar y Salir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <WithdrawalTicket ref={withdrawalTicketRef} data={withdrawalData} />
    </div>
  )
}
