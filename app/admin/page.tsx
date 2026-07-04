'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/custody/header'
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
import { getUsers, createUser, updateUser, deleteUser, updatePrice, createPrice, deletePrice, getInitialState, forceCloseCashRegister } from '@/app/actions/db-actions'
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

  // Force Close state
  const [showForceCloseDialog, setShowForceCloseDialog] = useState(false)
  const [registerIdToForceClose, setRegisterIdToForceClose] = useState<number | null>(null)
  const [cashierUsernameToForceClose, setCashierUsernameToForceClose] = useState('')
  const [isForceClosing, setIsForceClosing] = useState(false)

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
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <div className="text-zinc-600 font-bold uppercase tracking-wider text-xs">Cargando...</div>
      </div>
    )
  }

  if (!currentUser || currentUser.role !== 'supervisor') {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4 font-sans select-none">
        <div className="bg-[#d7d7d8] w-full max-w-md rounded-lg border border-zinc-400 shadow-xl overflow-hidden flex flex-col pb-6 text-center">
          <div className="bg-white py-6 border-b-2 border-zinc-300 text-center flex flex-col items-center gap-1.5">
            <div className="flex items-center">
              <span className="text-3xl font-extrabold tracking-tight select-none flex items-center">
                <span className="text-[#0a354c] leading-none">n</span>
                <span className="inline-block w-4.5 h-4.5 rounded-full border-4 border-[#1588b3] mx-0.5 align-middle" style={{ borderWidth: '3.5px' }} />
                <span className="text-[#0a354c] leading-none">d</span>
                <span className="inline-block w-4.5 h-4.5 rounded-full border-4 border-[#1588b3] mx-0.5 align-middle" style={{ borderWidth: '3.5px' }} />
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-wider text-[#242424] leading-tight">CUSTODIA</h1>
            <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">Sistema de Control de Casilleros</p>
          </div>

          <div className="px-6 py-6 flex flex-col items-center gap-4">
            <div className="bg-red-100 text-red-600 p-3 rounded-full">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="text-base font-black text-[#242424] uppercase tracking-wider">Acceso Restringido</h2>
            <p className="text-xs text-zinc-600 font-semibold">
              Solo los supervisores pueden acceder al panel de administración.
            </p>
            <Button onClick={() => router.push('/')} className="w-full bg-[#242424] hover:bg-zinc-800 text-white font-bold h-10 text-xs uppercase mt-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Inicio
            </Button>
          </div>
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

  const openForceCloseDialog = (registerId: number, username: string) => {
    setRegisterIdToForceClose(registerId)
    setCashierUsernameToForceClose(username)
    setShowForceCloseDialog(true)
  }

  const handleForceClose = async () => {
    if (registerIdToForceClose === null) return
    setIsForceClosing(true)
    try {
      const result = await forceCloseCashRegister(registerIdToForceClose)
      if (result.success) {
        setShowForceCloseDialog(false)
        setRegisterIdToForceClose(null)
        setCashierUsernameToForceClose('')
        // Refresh local store state
        const res = await getInitialState()
        if (res.success && res.data) hydrateState(res.data)
      } else {
        alert(result.error || 'Error al forzar el cierre del turno')
      }
    } catch (err) {
      console.error(err)
      alert('Error inesperado al forzar el cierre')
    } finally {
      setIsForceClosing(false)
    }
  }

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
    <div className="min-h-screen bg-zinc-100 flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-[960px] bg-[#d7d7d8] border border-zinc-400 shadow-xl rounded-lg overflow-hidden flex flex-col pb-6">
        <Header showBack />

        <main className="flex-1 flex flex-col gap-6 p-6">
          {/* ── Supervisor Dashboard ── */}
          <div>
            <div className="bg-[#242424] text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider mb-4 rounded-md flex items-center gap-2">
              <Box className="h-4 w-4" />
              <span>Ocupación Actual y Estadísticas</span>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white border border-zinc-300 rounded-xl p-6 shadow-sm flex flex-col justify-center items-center h-[300px]">
                <h2 className="text-xs font-bold text-zinc-700 mb-4 w-full flex items-center gap-2 uppercase tracking-wide">
                  <Box className="h-4 w-4 text-zinc-500" />
                  Estado de Casilleros
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
                      <Cell fill="#4e4e4e" /> {/* Ocupado color */}
                      <Cell fill="#00c5ff" /> {/* Disponible color */}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#242424', borderColor: '#4e4e4e', color: '#fff', borderRadius: '8px' }} 
                      itemStyle={{ color: '#fff' }} 
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-white border border-zinc-300 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                  <h3 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> Total Casilleros
                  </h3>
                  <p className="text-3xl font-black text-[#242424]">{lockers.length}</p>
                </div>
                <div className="bg-white border border-zinc-300 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                  <h3 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Box className="h-3.5 w-3.5 text-[#00c5ff]" /> Disponibles
                  </h3>
                  <p className="text-3xl font-black text-[#00c5ff]">{lockers.filter(l => !l.isOccupied).length}</p>
                </div>
                <div className="bg-white border border-zinc-300 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                  <h3 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-[#4e4e4e]" /> Ocupados
                  </h3>
                  <p className="text-3xl font-black text-[#4e4e4e]">{lockers.filter(l => l.isOccupied).length}</p>
                </div>
                <div className="bg-white border border-zinc-300 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                  <h3 className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-red-600" /> Vencidos (+24 Hrs)
                  </h3>
                  <p className="text-3xl font-black text-red-600">
                    {records.filter(r => r.status === 'Activo' && (Date.now() - new Date(r.entryTime).getTime()) / (1000 * 60 * 60) >= 24).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Income Metrics ── */}
          <div>
            <div className="bg-[#242424] text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider mb-4 rounded-md flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>Resumen de Recaudación</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-zinc-300 rounded-xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 text-[#00c5ff]/10 group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-32 h-32" />
                </div>
                <h3 className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#00c5ff]" /> Ingresos Hoy
                </h3>
                <p className="text-2xl font-black text-zinc-800 relative z-10">${ingresosHoy.toLocaleString('es-CL')}</p>
              </div>
              <div className="bg-white border border-zinc-300 rounded-xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 text-[#0a354c]/10 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-32 h-32" />
                </div>
                <h3 className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#0a354c]" /> Últimos 7 Días
                </h3>
                <p className="text-2xl font-black text-[#0a354c] relative z-10">${ingresosSemana.toLocaleString('es-CL')}</p>
              </div>
              <div className="bg-white border border-zinc-300 rounded-xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 text-[#1588b3]/10 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-32 h-32" />
                </div>
                <h3 className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#1588b3]" /> Últimos 30 Días
                </h3>
                <p className="text-2xl font-black text-[#1588b3] relative z-10">${ingresosMes.toLocaleString('es-CL')}</p>
              </div>
            </div>
          </div>

          {/* ── System Users Section ── */}
          <div>
            <div className="bg-[#242424] text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider mb-4 rounded-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Usuarios del Sistema ({users.length})</span>
              </div>
              <Button
                onClick={() => { setCreateError(''); setShowCreateDialog(true) }}
                className="h-7 text-[10px] uppercase font-bold bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-100"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nuevo Usuario
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12 bg-white border border-zinc-300 rounded-xl shadow-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 rounded-full border-4 border-[#00c5ff] border-t-transparent animate-spin" />
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Cargando usuarios...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden border border-zinc-300 rounded-xl shadow-sm bg-white">
                <Table>
                  <TableHeader className="bg-[#242424] hover:bg-[#242424]">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">ID</TableHead>
                      <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">USUARIO</TableHead>
                      <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">ROL</TableHead>
                      <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10 text-right">ACCIONES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-zinc-500 font-semibold">
                          No hay usuarios registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                          <TableCell className="text-zinc-800 font-mono text-xs py-3">{user.id}</TableCell>
                          <TableCell className="text-zinc-800 font-bold text-xs py-3">
                            <div className="flex items-center gap-2">
                              <span>{user.username}</span>
                              {(() => {
                                const openReg = cashRegisters.find(r => r.status === 'open' && r.openedBy === user.username);
                                return openReg ? (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => openForceCloseDialog(openReg.id, user.username)}
                                    className="h-5 px-1.5 text-[8px] uppercase font-extrabold bg-red-600 hover:bg-red-750 text-white rounded"
                                  >
                                    Forzar Cierre
                                  </Button>
                                ) : null;
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              user.role === 'supervisor'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-zinc-100 text-zinc-500'
                            }`}>
                              {user.role === 'supervisor' ? 'Supervisor' : 'Cajero'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openEditDialog(user)} 
                                className="h-7 text-[10px] uppercase font-bold bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-100"
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="outline" 
                                size="sm"
                                onClick={() => openDeleteDialog(user)}
                                className="h-7 text-[10px] uppercase font-bold bg-white text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600"
                                disabled={user.id === currentUser.id}
                                title={user.id === currentUser.id ? 'No puedes eliminar tu propia cuenta' : ''}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
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
          <div>
            <div className="bg-[#242424] text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider mb-4 rounded-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Precios de Casilleros</span>
              </div>
              <Button
                onClick={() => { setPriceError(''); setShowCreatePriceDialog(true) }}
                className="h-7 text-[10px] uppercase font-bold bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-100"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nuevo Tamaño
              </Button>
            </div>
            
            <div className="overflow-hidden border border-zinc-300 rounded-xl shadow-sm bg-white">
              <Table>
                <TableHeader className="bg-[#242424] hover:bg-[#242424]">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">TAMAÑO</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">PRECIO ACTUAL</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10 text-right">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lockerSizes.map((sizeObj) => (
                    <TableRow key={sizeObj.value} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                      <TableCell className="text-zinc-800 font-bold text-xs py-3">{sizeObj.label}</TableCell>
                      <TableCell className="text-zinc-800 font-black text-xs py-3">${sizeObj.price.toLocaleString('es-CL')}</TableCell>
                      <TableCell className="text-right py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openEditPriceDialog(sizeObj)} 
                            className="h-7 text-[10px] uppercase font-bold bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-100"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Modificar
                          </Button>
                          <Button
                            variant="outline" 
                            size="sm"
                            onClick={() => { setDeletingSize({ size: sizeObj.value, label: sizeObj.label }); setShowDeletePriceDialog(true); }}
                            className="h-7 text-[10px] uppercase font-bold bg-white text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
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
          <div>
            <div className="bg-[#242424] text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider mb-4 rounded-md flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>Historial de Turnos y Cajas</span>
            </div>
            
            <div className="overflow-hidden border border-zinc-300 rounded-xl shadow-sm bg-white">
              <Table>
                <TableHeader className="bg-[#242424] hover:bg-[#242424]">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10">CAJERO</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10">APERTURA</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10">CIERRE</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">INICIAL</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">EFECTIVO</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">TARJETA</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">TOTAL VENTAS</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">RETIROS</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">ENTREGADO</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">DIFERENCIA</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-center">ESTADO</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10">NOTAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashRegisters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-zinc-500 font-semibold">
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
                        <TableRow key={register.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                          <TableCell className="text-zinc-800 font-bold text-xs py-3">{register.openedBy || 'desconocido'}</TableCell>
                          <TableCell className="text-zinc-800 font-semibold text-[10px] py-3">{formatDateTime(register.openedAt)}</TableCell>
                          <TableCell className="text-zinc-800 font-semibold text-[10px] py-3">
                            {register.closedAt ? formatDateTime(register.closedAt) : <span className="text-emerald-600 font-bold uppercase text-[9px]">Activo ahora</span>}
                          </TableCell>
                          <TableCell className="text-zinc-800 font-medium text-xs text-right py-3">${register.openingAmount.toLocaleString()}</TableCell>
                          <TableCell className="text-amber-600 font-semibold text-xs text-right py-3">${ingresosEfectivo.toLocaleString()}</TableCell>
                          <TableCell className="text-blue-600 font-semibold text-xs text-right py-3">${ingresosTarjeta.toLocaleString()}</TableCell>
                          <TableCell className="text-zinc-800 font-extrabold text-xs text-right py-3">${(ingresosEfectivo + ingresosTarjeta).toLocaleString()}</TableCell>
                          <TableCell className="text-red-650 font-medium text-xs text-right py-3">${gastosEfectivo.toLocaleString()}</TableCell>
                          <TableCell className="text-zinc-800 font-black text-xs text-right py-3">
                            {register.closingAmount !== null ? `$${register.closingAmount.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-right py-3">
                            {diferenciaCaja !== null ? (
                              <span className={`text-[10px] font-black ${diferenciaCaja === 0 ? 'text-emerald-600' : diferenciaCaja > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {diferenciaCaja === 0 ? 'Cuadrada' : diferenciaCaja > 0 ? `Sobrante: +$${diferenciaCaja.toLocaleString()}` : `Faltante: -$${Math.abs(diferenciaCaja).toLocaleString()}`}
                              </span>
                            ) : (
                              <span className="text-zinc-500 font-semibold">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                register.status === 'open' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-zinc-100 text-zinc-500'
                              }`}>
                                {register.status === 'open' ? 'Abierta' : 'Cerrada'}
                              </span>
                              {register.status === 'open' && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => openForceCloseDialog(register.id, register.openedBy || 'desconocido')}
                                  className="h-auto p-0 text-[8px] uppercase font-bold text-red-600 hover:text-red-800 underline"
                                >
                                  Forzar Cierre
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-500 font-medium text-xs max-w-[150px] truncate py-3" title={register.notes}>
                            {register.notes || '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between p-4 text-xs text-zinc-500 border-t border-zinc-200 bg-zinc-50/50 font-semibold">
                <div>
                  Mostrando {Math.min(sortedRegisters.length, (currentPageRegisters - 1) * REGISTERS_PER_PAGE + 1)} a {Math.min(sortedRegisters.length, currentPageRegisters * REGISTERS_PER_PAGE)} de {sortedRegisters.length} registros
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPageRegisters(p => Math.max(1, p - 1))}
                    disabled={currentPageRegisters === 1}
                    className="h-7 text-[10px] bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 font-bold"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPageRegisters(p => Math.min(totalRegisterPages, p + 1))}
                    disabled={currentPageRegisters >= totalRegisterPages || totalRegisterPages === 0}
                    className="h-7 text-[10px] bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 font-bold"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Create User Dialog ── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden rounded-xl shadow-2xl max-w-md">
          <DialogHeader className="bg-[#242424] text-white p-4">
            <DialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
              <Plus className="h-4 w-4" />
              <span>Crear Nuevo Usuario</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-300 text-xs mt-1">
              Ingrese los datos del nuevo usuario del sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">Nombre de Usuario</Label>
              <Input 
                type="text" 
                value={newUsername} 
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="ej. cajero2" 
                className="bg-white border border-zinc-300 text-zinc-900 font-semibold focus-visible:ring-[#242424]" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">Contraseña</Label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••" 
                className="bg-white border border-zinc-300 text-zinc-900 font-semibold focus-visible:ring-[#242424]" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">Rol</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-white border border-zinc-300 text-zinc-900 font-semibold focus-visible:ring-[#242424]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="cajero">Cajero</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && <p className="text-xs text-red-600 font-bold">{createError}</p>}
          </div>
          <DialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)} 
              disabled={isCreating}
              className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={isCreating}
              className="bg-[#242424] text-white hover:bg-zinc-800 font-bold h-9 text-xs"
            >
              {isCreating ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden rounded-xl shadow-2xl max-w-md">
          <DialogHeader className="bg-[#242424] text-white p-4">
            <DialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
              <Pencil className="h-4 w-4" />
              <span>Editar Usuario</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-300 text-xs mt-1">
              Modifique los datos. Deje la contraseña vacía para mantener la actual.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">Nombre de Usuario</Label>
              <Input 
                type="text" 
                value={editUsername} 
                onChange={(e) => setEditUsername(e.target.value)} 
                className="bg-white border border-zinc-300 text-zinc-900 font-semibold focus-visible:ring-[#242424]" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">Nueva Contraseña (opcional)</Label>
              <Input 
                type="password" 
                value={editPassword} 
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Dejar vacío para no cambiar" 
                className="bg-white border border-zinc-300 text-zinc-900 font-semibold focus-visible:ring-[#242424]" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">Rol</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="bg-white border border-zinc-300 text-zinc-900 font-semibold focus-visible:ring-[#242424]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="cajero">Cajero</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editError && <p className="text-xs text-red-600 font-bold">{editError}</p>}
          </div>
          <DialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowEditDialog(false)} 
              disabled={isEditing}
              className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEdit} 
              disabled={isEditing}
              className="bg-[#242424] text-white hover:bg-zinc-800 font-bold h-9 text-xs"
            >
              {isEditing ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden rounded-xl shadow-2xl max-w-sm">
          <AlertDialogHeader className="bg-[#242424] text-white p-4">
            <AlertDialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
              <Trash2 className="h-4 w-4 text-red-500" />
              <span>Eliminar Usuario</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300 text-xs mt-1">
              ¿Está seguro que desea eliminar al usuario <strong className="text-white">{deletingUser?.username}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
            <AlertDialogCancel 
              disabled={isDeleting}
              className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold h-9 text-xs uppercase"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-650 hover:bg-red-750 text-white font-bold h-9 text-xs uppercase"
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Force Close Confirmation ── */}
      <AlertDialog open={showForceCloseDialog} onOpenChange={setShowForceCloseDialog}>
        <AlertDialogContent className="bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden rounded-xl shadow-2xl max-w-sm">
          <AlertDialogHeader className="bg-[#242424] text-white p-4">
            <AlertDialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
              <LogOut className="h-4 w-4 text-red-500" />
              <span>Forzar Cierre de Turno</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300 text-xs mt-1">
              ¿Está seguro que desea forzar el cierre del turno del cajero <strong className="text-white">{cashierUsernameToForceClose}</strong>?
              <br/><br/>
              Se calculará el monto de efectivo esperado según las transacciones registradas hasta este momento y el turno quedará cerrado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
            <AlertDialogCancel 
              disabled={isForceClosing}
              className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold h-9 text-xs uppercase"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceClose}
              className="bg-red-650 hover:bg-red-750 text-white font-bold h-9 text-xs uppercase"
              disabled={isForceClosing}
            >
              {isForceClosing ? 'Cerrando...' : 'Forzar Cierre'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Edit Price Dialog ── */}
      <Dialog open={showEditPriceDialog} onOpenChange={setShowEditPriceDialog}>
        <DialogContent className="bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden rounded-xl shadow-2xl max-w-md">
          <DialogHeader className="bg-[#242424] text-white p-4">
            <DialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
              <Pencil className="h-4 w-4" />
              <span>Modificar Tamaño y Precio</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-300 text-xs mt-1">
              Edite el nombre o precio para el tamaño <strong className="text-white">{editingSize?.size}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">Nombre / Descripción</Label>
              <Input 
                type="text" 
                value={editLabel} 
                onChange={(e) => setEditLabel(e.target.value)} 
                className="bg-white border border-zinc-300 text-zinc-900 font-semibold focus-visible:ring-[#242424]" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">Precio ($)</Label>
              <Input 
                type="number" 
                value={editPrice} 
                onChange={(e) => setEditPrice(e.target.value)} 
                className="bg-white border border-zinc-300 text-zinc-900 font-semibold focus-visible:ring-[#242424]" 
                min="0"
                step="100"
              />
            </div>
            {priceError && <p className="text-xs text-red-600 font-bold">{priceError}</p>}
          </div>
          <DialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowEditPriceDialog(false)} 
              disabled={isSavingPrice}
              className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEditPrice} 
              disabled={isSavingPrice}
              className="bg-[#242424] text-white hover:bg-zinc-800 font-bold h-9 text-xs"
            >
              {isSavingPrice ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Price Dialog ── */}
      <Dialog open={showCreatePriceDialog} onOpenChange={setShowCreatePriceDialog}>
        <DialogContent className="bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden rounded-xl shadow-2xl max-w-md">
          <DialogHeader className="bg-[#242424] text-white p-4">
            <DialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
              <Plus className="h-4 w-4" />
              <span>Nuevo Tamaño de Casillero</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-300 text-xs mt-1">
              Agregue un nuevo tamaño y su precio asociado.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">Código / Tamaño (ej. XXXL)</Label>
              <Input 
                type="text" 
                value={newSizeCode} 
                onChange={(e) => setNewSizeCode(e.target.value.toUpperCase())} 
                className="bg-white border border-zinc-300 text-zinc-900 font-semibold focus-visible:ring-[#242424] uppercase" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">Nombre / Descripción</Label>
              <Input 
                type="text" 
                value={newSizeLabel} 
                onChange={(e) => setNewSizeLabel(e.target.value)} 
                className="bg-white border border-zinc-300 text-zinc-900 font-semibold focus-visible:ring-[#242424]" 
                placeholder="ej. XXXL Equipaje Especial"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 font-bold text-xs uppercase tracking-wide">Precio ($)</Label>
              <Input 
                type="number" 
                value={newSizePrice} 
                onChange={(e) => setNewSizePrice(e.target.value)} 
                className="bg-white border border-zinc-300 text-zinc-900 font-semibold focus-visible:ring-[#242424]" 
                min="0"
                step="100"
              />
            </div>
            {priceError && <p className="text-xs text-red-600 font-bold">{priceError}</p>}
          </div>
          <DialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowCreatePriceDialog(false)} 
              disabled={isSavingPrice}
              className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreatePrice} 
              disabled={isSavingPrice}
              className="bg-[#242424] text-white hover:bg-zinc-800 font-bold h-9 text-xs"
            >
              {isSavingPrice ? 'Creando...' : 'Crear Tamaño'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Price Confirmation ── */}
      <AlertDialog open={showDeletePriceDialog} onOpenChange={setShowDeletePriceDialog}>
        <AlertDialogContent className="bg-[#d7d7d8] border border-zinc-400 p-0 overflow-hidden rounded-xl shadow-2xl max-w-sm">
          <AlertDialogHeader className="bg-[#242424] text-white p-4">
            <Trash2 className="h-4 w-4 text-red-500" />
            <AlertDialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
              <span>Eliminar Tamaño</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300 text-xs mt-1">
              ¿Está seguro que desea eliminar el tamaño <strong className="text-white">{deletingSize?.label}</strong>? Esta acción eliminará la tarifa, pero los casilleros existentes no se verán afectados directamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
            <AlertDialogCancel 
              disabled={isSavingPrice}
              className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-bold h-9 text-xs uppercase"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePrice}
              className="bg-red-600 hover:bg-red-700 text-white font-bold h-9 text-xs uppercase"
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
