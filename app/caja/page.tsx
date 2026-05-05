'use client'

import { useState, useEffect } from 'react'
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
  } = useCustodyStore()

  const [mounted, setMounted] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [showOpenDialog, setShowOpenDialog] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [error, setError] = useState('')
  const [supervisorUsername, setSupervisorUsername] = useState('')
  const [supervisorPassword, setSupervisorPassword] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isCashOpen = currentCashRegister?.status === 'open'
  const stats = getCurrentRegisterStats()

  const currentTransactions = currentCashRegister
    ? cashTransactions.filter((t) => t.registerId === currentCashRegister.id)
    : []

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

      await closeCashRegister(amount, notes)
      setClosingAmount('')
      setNotes('')
      setSupervisorUsername('')
      setSupervisorPassword('')
      setShowCloseDialog(false)
      
      // Auto logout according to requirements
      logout()
    } catch (err) {
      setError('Error al verificar credenciales')
    } finally {
      setIsVerifying(false)
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
              <Button
                onClick={() => setShowCloseDialog(true)}
                variant="destructive"
                className="gap-2"
              >
                <Lock className="h-4 w-4" />
                Cerrar Caja
              </Button>
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
                    <TableHead className="text-muted-foreground text-right">MONTO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTransactions.map((tx) => (
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
                      <TableCell
                        className={`text-right font-medium ${
                          tx.type === 'income' ? 'text-primary' : 'text-destructive'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
                  <TableHead className="text-muted-foreground text-right">MONTO INICIAL</TableHead>
                  <TableHead className="text-muted-foreground text-right">VENTAS</TableHead>
                  <TableHead className="text-muted-foreground text-right">MONTO FINAL</TableHead>
                  <TableHead className="text-muted-foreground">ESTADO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashRegisters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay registros de caja
                    </TableCell>
                  </TableRow>
                ) : (
                  cashRegisters.map((register) => (
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
                      <TableCell className="text-primary text-right font-medium">
                        ${register.totalSales.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-foreground text-right">
                        {register.closingAmount !== null
                          ? `$${register.closingAmount.toLocaleString()}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            register.status === 'open'
                              ? 'text-primary font-medium'
                              : 'text-muted-foreground'
                          }
                        >
                          {register.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
                type="number"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
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
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monto inicial:</span>
                <span className="text-foreground">
                  ${currentCashRegister?.openingAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ventas totales:</span>
                <span className="text-primary">${stats.totalSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium border-t border-border pt-2">
                <span className="text-foreground">Saldo esperado:</span>
                <span className="text-accent">${stats.balance.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Monto Contado</Label>
              <Input
                type="number"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                placeholder="0"
                className="bg-input"
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
    </div>
  )
}
