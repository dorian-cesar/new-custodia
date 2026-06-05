'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Plus, Pencil, Trash2, Shield,
  User as UserIcon, LogOut, ArrowLeft,
  History, Clock, BookOpen, Box,
  DollarSign, Calendar, TrendingUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useCustodyStore } from '@/lib/custody-store'
import { getUsers, createUser, updateUser, deleteUser, updatePrice, createPrice, deletePrice, getInitialState } from '@/app/actions/db-actions'
import { formatDateTime } from '@/lib/types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface UserRow {
  id: number
  username: string
  role: string
}

export default function AdminPage() {
  const router = useRouter()
  const { currentUser, logout } = useCustodyStore()

  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<string>('cajero')
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRole, setEditRole] = useState<string>('cajero')
  const [editError, setEditError] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Price edit dialog state
  // Dashboard state
  const { lockerSizes, hydrateState, cashRegisters, lockers, records, cashTransactions } = useCustodyStore()
  const [showEditPriceDialog, setShowEditPriceDialog] = useState(false)
  const [editingSize, setEditingSize] = useState<{size: string, label: string} | null>(null)
  const [editPrice, setEditPrice] = useState<string>('')
  const [editLabel, setEditLabel] = useState<string>('')
  const [priceError, setPriceError] = useState('')
  const [isSavingPrice, setIsSavingPrice] = useState(false)

  const [showCreatePriceDialog, setShowCreatePriceDialog] = useState(false)
  const [newSizeCode, setNewSizeCode] = useState('')
  const [newSizeLabel, setNewSizeLabel] = useState('')
  const [newSizePrice, setNewSizePrice] = useState('')
  
  const [showDeletePriceDialog, setShowDeletePriceDialog] = useState(false)
  const [deletingSize, setDeletingSize] = useState<{size: string, label: string} | null>(null)

  // Pagination for cash registers
  const [currentPageRegisters, setCurrentPageRegisters] = useState(1)
  const REGISTERS_PER_PAGE = 5
  
  const sortedRegisters = [...cashRegisters].sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
  const totalRegisterPages = Math.ceil(sortedRegisters.length / REGISTERS_PER_PAGE)
  const paginatedRegisters = sortedRegisters.slice((currentPageRegisters - 1) * REGISTERS_PER_PAGE, currentPageRegisters * REGISTERS_PER_PAGE)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (mounted && currentUser?.role === 'supervisor') loadUsers()
  }, [mounted, currentUser])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Guards ──
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Cargando...</div>
      </div>
    )
  }

  if (!currentUser || currentUser.role !== 'supervisor') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card w-full max-w-md rounded-xl border border-border p-8 shadow-lg text-center">
          <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Acceso Restringido</h2>
          <p className="text-muted-foreground mb-6">
            Solo los supervisores pueden acceder al panel de administración.
          </p>
          <Button onClick={() => router.push('/')} className="bg-primary hover:bg-primary/90">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Inicio
          </Button>
        </div>
      </div>
    )
  }

  // ── Handlers ──
  const handleCreate = async () => {
    setCreateError('')
    if (!newUsername.trim()) { setCreateError('Ingrese un nombre de usuario'); return }
    if (!newPassword.trim()) { setCreateError('Ingrese una contraseña'); return }

    setIsCreating(true)
    try {
      const result = await createUser(newUsername.trim(), newPassword, newRole as 'cajero' | 'supervisor')
      if (result.success) {
        setShowCreateDialog(false)
        setNewUsername(''); setNewPassword(''); setNewRole('cajero')
        await loadUsers()
      } else {
        setCreateError(result.error || 'Error al crear usuario')
      }
    } catch { setCreateError('Error inesperado') }
    finally { setIsCreating(false) }
  }

  const openEditDialog = (user: UserRow) => {
    setEditingUser(user)
    setEditUsername(user.username)
    setEditPassword('')
    setEditRole(user.role)
    setEditError('')
    setShowEditDialog(true)
  }

  const handleEdit = async () => {
    if (!editingUser) return
    setEditError('')
    if (!editUsername.trim()) { setEditError('El nombre no puede estar vacío'); return }

    setIsEditing(true)
    try {
      const updateData: any = { username: editUsername.trim(), role: editRole }
      if (editPassword.trim()) updateData.passwordHash = editPassword

      const result = await updateUser(editingUser.id, updateData)
      if (result.success) {
        setShowEditDialog(false)
        setEditingUser(null)
        await loadUsers()
      } else {
        setEditError(result.error || 'Error al actualizar')
      }
    } catch { setEditError('Error inesperado') }
    finally { setIsEditing(false) }
  }

  const openDeleteDialog = (user: UserRow) => {
    setDeletingUser(user)
    setShowDeleteDialog(true)
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    setIsDeleting(true)
    try {
      const result = await deleteUser(deletingUser.id)
      if (result.success) {
        setShowDeleteDialog(false)
        setDeletingUser(null)
        await loadUsers()
      }
    } catch (err) { console.error('Error deleting user:', err) }
    finally { setIsDeleting(false) }
  }

  const handleLogout = () => { logout(); router.push('/') }

  // ── Price Handlers ──
  const openEditPriceDialog = (sizeObj: { value: string, label: string, price: number }) => {
    setEditingSize({ size: sizeObj.value, label: sizeObj.label })
    setEditPrice(sizeObj.price.toString())
    setEditLabel(sizeObj.label)
    setPriceError('')
    setShowEditPriceDialog(true)
  }

  const handleEditPrice = async () => {
    if (!editingSize) return
    const newPrice = parseInt(editPrice, 10)
    if (isNaN(newPrice) || newPrice <= 0) {
      setPriceError('Ingrese un precio válido')
      return
    }
    if (!editLabel.trim()) {
      setPriceError('El nombre no puede estar vacío')
      return
    }

    setIsSavingPrice(true)
    try {
      const result = await updatePrice(editingSize.size, newPrice, editLabel.trim())
      if (result.success) {
        setShowEditPriceDialog(false)
        setEditingSize(null)
        // Refresh full DB state to update store
        const res = await getInitialState()
        if (res.success && res.data) hydrateState(res.data)
      } else {
        setPriceError(result.error || 'Error al actualizar precio')
      }
    } catch (err) {
      console.error(err)
      setPriceError('Error inesperado')
    } finally {
      setIsSavingPrice(false)
    }
  }

  const handleCreatePrice = async () => {
    const newPrice = parseInt(newSizePrice, 10)
    if (!newSizeCode.trim()) { setPriceError('El código (tamaño) es requerido'); return }
    if (!newSizeLabel.trim()) { setPriceError('El nombre es requerido'); return }
    if (isNaN(newPrice) || newPrice <= 0) { setPriceError('Ingrese un precio válido'); return }

    setIsSavingPrice(true)
    try {
      const result = await createPrice(newSizeCode.trim().toUpperCase(), newSizeLabel.trim(), newPrice)
      if (result.success) {
        setShowCreatePriceDialog(false)
        setNewSizeCode(''); setNewSizeLabel(''); setNewSizePrice('')
        const res = await getInitialState()
        if (res.success && res.data) hydrateState(res.data)
      } else {
        setPriceError(result.error || 'Error al crear tamaño')
      }
    } catch (err) {
      setPriceError('Error inesperado')
    } finally {
      setIsSavingPrice(false)
    }
  }

  const handleDeletePrice = async () => {
    if (!deletingSize) return
    setIsSavingPrice(true)
    try {
      const result = await deletePrice(deletingSize.size)
      if (result.success) {
        setShowDeletePriceDialog(false)
        setDeletingSize(null)
        const res = await getInitialState()
        if (res.success && res.data) hydrateState(res.data)
      } else {
        setPriceError(result.error || 'Error al eliminar tamaño')
      }
    } catch (err) {
      setPriceError('Error inesperado')
    } finally {
      setIsSavingPrice(false)
    }
  }

  // ── Render ──
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOf7Days = startOfToday - (6 * 24 * 60 * 60 * 1000)
  const startOf30Days = startOfToday - (29 * 24 * 60 * 60 * 1000)

  const ingresosHoy = cashTransactions
    .filter(t => t.type === 'income' && new Date(t.timestamp).getTime() >= startOfToday)
    .reduce((sum, t) => sum + t.amount, 0)

  const ingresosSemana = cashTransactions
    .filter(t => t.type === 'income' && new Date(t.timestamp).getTime() >= startOf7Days)
    .reduce((sum, t) => sum + t.amount, 0)

  const ingresosMes = cashTransactions
    .filter(t => t.type === 'income' && new Date(t.timestamp).getTime() >= startOf30Days)
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Panel de Administración</h1>
            <p className="text-sm text-muted-foreground">Gestión de Usuarios del Sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground capitalize">
              {currentUser.username}
            </span>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={handleLogout}
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* ── Supervisor Dashboard ── */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1 bg-card rounded-xl p-6 border border-border flex flex-col justify-center items-center h-[300px]">
            <h2 className="text-lg font-semibold text-card-foreground mb-4 w-full flex items-center gap-2">
              <Box className="h-5 w-5 text-muted-foreground" />
              Ocupación Actual
            </h2>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Ocupados', value: lockers.filter(l => l.isOccupied).length },
                    { name: 'Disponibles', value: lockers.filter(l => !l.isOccupied).length }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="var(--color-primary, #3b82f6)" />
                  <Cell fill="var(--color-muted, #94a3b8)" />
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-card, #1e293b)', borderColor: 'var(--color-border, #334155)', color: '#fff', borderRadius: '8px' }} 
                  itemStyle={{ color: '#fff' }} 
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-4 border border-border flex flex-col justify-center">
              <h3 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Total Casilleros
              </h3>
              <p className="text-3xl font-bold text-foreground">{lockers.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border flex flex-col justify-center">
              <h3 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                <Box className="h-3.5 w-3.5 text-emerald-500" /> Disponibles
              </h3>
              <p className="text-3xl font-bold text-emerald-500">{lockers.filter(l => !l.isOccupied).length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border flex flex-col justify-center">
              <h3 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-amber-500" /> Ocupados
              </h3>
              <p className="text-3xl font-bold text-amber-500">{lockers.filter(l => l.isOccupied).length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border flex flex-col justify-center">
              <h3 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-destructive" /> +24 Horas
              </h3>
              <p className="text-3xl font-bold text-destructive">
                {records.filter(r => r.status === 'Activo' && (Date.now() - new Date(r.entryTime).getTime()) / (1000 * 60 * 60) >= 24).length}
              </p>
            </div>
          </div>
        </div>

        {/* ── Income Metrics ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-xl p-5 border border-border flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 text-emerald-500/10 group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="w-32 h-32" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" /> Ingresos Hoy
            </h3>
            <p className="text-3xl font-bold text-foreground relative z-10">${ingresosHoy.toLocaleString('es-CL')}</p>
          </div>
          <div className="bg-card rounded-xl p-5 border border-border flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 text-primary/10 group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-32 h-32" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Ingresos Últimos 7 Días
            </h3>
            <p className="text-3xl font-bold text-foreground relative z-10">${ingresosSemana.toLocaleString('es-CL')}</p>
          </div>
          <div className="bg-card rounded-xl p-5 border border-border flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 text-indigo-500/10 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-32 h-32" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" /> Ingresos Últimos 30 Días
            </h3>
            <p className="text-3xl font-bold text-foreground relative z-10">${ingresosMes.toLocaleString('es-CL')}</p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          {/* Title + Create button */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-card-foreground">Usuarios del Sistema</h2>
              <span className="text-sm text-muted-foreground ml-2">({users.length})</span>
            </div>
            <Button
              onClick={() => { setCreateError(''); setShowCreateDialog(true) }}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Nuevo Usuario
            </Button>
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-muted-foreground">Cargando usuarios...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">ID</TableHead>
                    <TableHead className="text-muted-foreground">USUARIO</TableHead>
                    <TableHead className="text-muted-foreground">ROL</TableHead>
                    <TableHead className="text-muted-foreground text-right">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No hay usuarios registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} className="border-border">
                        <TableCell className="text-foreground font-mono">{user.id}</TableCell>
                        <TableCell className="text-foreground font-medium">{user.username}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.role === 'supervisor'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-accent/20 text-accent'
                          }`}>
                            {user.role === 'supervisor'
                              ? <Shield className="h-3 w-3" />
                              : <UserIcon className="h-3 w-3" />
                            }
                            {user.role === 'supervisor' ? 'Supervisor' : 'Cajero'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(user)} className="gap-1">
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              variant="outline" size="sm"
                              onClick={() => openDeleteDialog(user)}
                              className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20"
                              disabled={user.id === currentUser.id}
                              title={user.id === currentUser.id ? 'No puedes eliminar tu propia cuenta' : ''}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* ── Prices Section ── */}
        <div className="bg-card rounded-xl p-6 border border-border mt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-card-foreground">Precios de Casilleros</h2>
            </div>
            <Button
              onClick={() => { setPriceError(''); setShowCreatePriceDialog(true) }}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Nuevo Tamaño
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">TAMAÑO</TableHead>
                  <TableHead className="text-muted-foreground">PRECIO ACTUAL</TableHead>
                  <TableHead className="text-muted-foreground text-right">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lockerSizes.map((sizeObj) => (
                  <TableRow key={sizeObj.value} className="border-border">
                    <TableCell className="text-foreground font-medium">{sizeObj.label}</TableCell>
                    <TableCell className="text-foreground">${sizeObj.price.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditPriceDialog(sizeObj)} className="gap-1">
                          <Pencil className="h-3.5 w-3.5" />
                          Modificar
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          onClick={() => { setDeletingSize({ size: sizeObj.value, label: sizeObj.label }); setShowDeletePriceDialog(true); }}
                          className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Cash Register Supervision / Session History Section ── */}
        <div className="bg-card rounded-xl p-6 border border-border mt-8">
          <div className="flex items-center gap-2 mb-6">
            <History className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-card-foreground">Historial de Turnos y Cajas</h2>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">CAJERO</TableHead>
                  <TableHead className="text-muted-foreground">APERTURA</TableHead>
                  <TableHead className="text-muted-foreground">CIERRE</TableHead>
                  <TableHead className="text-muted-foreground">MONTO INICIAL</TableHead>
                  <TableHead className="text-muted-foreground">EN EFECTIVO</TableHead>
                  <TableHead className="text-muted-foreground">EN TARJETA</TableHead>
                  <TableHead className="text-muted-foreground">VENTAS TOTALES</TableHead>
                  <TableHead className="text-muted-foreground">RETIROS</TableHead>
                  <TableHead className="text-muted-foreground">MONTO FINAL (EFECTIVO)</TableHead>
                  <TableHead className="text-muted-foreground">DIFERENCIA</TableHead>
                  <TableHead className="text-muted-foreground">ESTADO</TableHead>
                  <TableHead className="text-muted-foreground">NOTAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashRegisters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No hay turnos registrados
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
                        <TableCell className="text-foreground font-medium">{register.openedBy || 'desconocido'}</TableCell>
                        <TableCell className="text-foreground text-sm">{formatDateTime(register.openedAt)}</TableCell>
                        <TableCell className="text-foreground text-sm">
                          {register.closedAt ? formatDateTime(register.closedAt) : <span className="text-emerald-500 font-medium">Activo ahora</span>}
                        </TableCell>
                        <TableCell className="text-foreground">${register.openingAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-foreground text-amber-500">${ingresosEfectivo.toLocaleString()}</TableCell>
                        <TableCell className="text-foreground text-blue-500">${ingresosTarjeta.toLocaleString()}</TableCell>
                        <TableCell className="text-foreground font-semibold">${(ingresosEfectivo + ingresosTarjeta).toLocaleString()}</TableCell>
                        <TableCell className="text-destructive font-medium">${gastosEfectivo.toLocaleString()}</TableCell>
                        <TableCell className="text-foreground font-semibold">
                          {register.closingAmount !== null ? `$${register.closingAmount.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          {diferenciaCaja !== null ? (
                            <span className={`text-xs font-bold ${diferenciaCaja === 0 ? 'text-emerald-500' : diferenciaCaja > 0 ? 'text-blue-500' : 'text-destructive'}`}>
                              {diferenciaCaja === 0 ? 'Cuadrada ✓' : diferenciaCaja > 0 ? `Sobrante: +$${diferenciaCaja.toLocaleString()}` : `Faltante: -$${Math.abs(diferenciaCaja).toLocaleString()}`}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            register.status === 'open' 
                              ? 'bg-emerald-500/20 text-emerald-500' 
                              : 'bg-zinc-500/20 text-zinc-400'
                          }`}>
                            {register.status === 'open' ? 'Abierta' : 'Cerrada'}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={register.notes}>
                          {register.notes || '-'}
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

      {/* ── Create User Dialog ── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Crear Nuevo Usuario
            </DialogTitle>
            <DialogDescription>Ingrese los datos del nuevo usuario del sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de Usuario</Label>
              <Input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                placeholder="ej. cajero2" className="bg-input" />
            </div>
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••" className="bg-input" />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cajero">Cajero</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreateDialog(false)} disabled={isCreating}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90" disabled={isCreating}>
              {isCreating ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Usuario
            </DialogTitle>
            <DialogDescription>
              Modifique los datos. Deje la contraseña vacía para mantener la actual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre de Usuario</Label>
              <Input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="bg-input" />
            </div>
            <div className="space-y-2">
              <Label>Nueva Contraseña (opcional)</Label>
              <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Dejar vacío para no cambiar" className="bg-input" />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cajero">Cajero</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowEditDialog(false)} disabled={isEditing}>Cancelar</Button>
            <Button onClick={handleEdit} className="bg-primary hover:bg-primary/90" disabled={isEditing}>
              {isEditing ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar Usuario
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar al usuario{' '}
              <strong className="text-foreground">{deletingUser?.username}</strong>?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Edit Price Dialog ── */}
      <Dialog open={showEditPriceDialog} onOpenChange={setShowEditPriceDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Modificar Tamaño y Precio
            </DialogTitle>
            <DialogDescription>
              Edite el nombre o precio para el tamaño <strong className="text-foreground">{editingSize?.size}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre / Descripción</Label>
              <Input 
                type="text" 
                value={editLabel} 
                onChange={(e) => setEditLabel(e.target.value)} 
                className="bg-input" 
              />
            </div>
            <div className="space-y-2">
              <Label>Precio ($)</Label>
              <Input 
                type="number" 
                value={editPrice} 
                onChange={(e) => setEditPrice(e.target.value)} 
                className="bg-input" 
                min="0"
                step="100"
              />
            </div>
            {priceError && <p className="text-sm text-destructive">{priceError}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowEditPriceDialog(false)} disabled={isSavingPrice}>Cancelar</Button>
            <Button onClick={handleEditPrice} className="bg-primary hover:bg-primary/90" disabled={isSavingPrice}>
              {isSavingPrice ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Price Dialog ── */}
      <Dialog open={showCreatePriceDialog} onOpenChange={setShowCreatePriceDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nuevo Tamaño de Casillero
            </DialogTitle>
            <DialogDescription>
              Agregue un nuevo tamaño y su precio asociado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Código / Tamaño (ej. XXXL)</Label>
              <Input 
                type="text" 
                value={newSizeCode} 
                onChange={(e) => setNewSizeCode(e.target.value.toUpperCase())} 
                className="bg-input uppercase" 
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre / Descripción</Label>
              <Input 
                type="text" 
                value={newSizeLabel} 
                onChange={(e) => setNewSizeLabel(e.target.value)} 
                className="bg-input" 
                placeholder="ej. XXXL Equipaje Especial"
              />
            </div>
            <div className="space-y-2">
              <Label>Precio ($)</Label>
              <Input 
                type="number" 
                value={newSizePrice} 
                onChange={(e) => setNewSizePrice(e.target.value)} 
                className="bg-input" 
                min="0"
                step="100"
              />
            </div>
            {priceError && <p className="text-sm text-destructive">{priceError}</p>}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreatePriceDialog(false)} disabled={isSavingPrice}>Cancelar</Button>
            <Button onClick={handleCreatePrice} className="bg-primary hover:bg-primary/90" disabled={isSavingPrice}>
              {isSavingPrice ? 'Creando...' : 'Crear Tamaño'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Price Confirmation ── */}
      <AlertDialog open={showDeletePriceDialog} onOpenChange={setShowDeletePriceDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar Tamaño
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar el tamaño{' '}
              <strong className="text-foreground">{deletingSize?.label}</strong>?
              Esta acción eliminará la tarifa, pero los casilleros existentes no se verán afectados directamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingPrice}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePrice}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isSavingPrice}
            >
              {isSavingPrice ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
