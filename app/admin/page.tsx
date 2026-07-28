"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { Header } from "@/components/custody/header";
import { LayoutConfigurator } from "@/components/admin/layout-configurator";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Shield,
  User as UserIcon,
  LogOut,
  ArrowLeft,
  History,
  Clock,
  BookOpen,
  Box,
  DollarSign,
  Calendar,
  TrendingUp,
  Luggage,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustodyStore } from "@/lib/custody-store";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  updatePrice,
  createPrice,
  deletePrice,
  getInitialState,
} from "@/app/actions/db-actions";
import { formatDateTime } from "@/lib/types";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface UserRow {
  id: number;
  username: string;
  role: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { currentUser, logout } = useCustodyStore();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("cajero");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<string>("cajero");
  const [editError, setEditError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Price edit dialog state
  // Dashboard state
  const {
    lockerSizes,
    hydrateState,
    cashRegisters,
    lockers,
    records,
    cashTransactions,
    getSetting,
    updateSetting,
  } = useCustodyStore();

  const currentCurrency = getSetting("currency") || "CLP";

  const handleUpdateCurrency = async (currency: "CLP" | "PYG") => {
    try {
      await updateSetting("currency", currency);
      Swal.fire({
        icon: "success",
        title: "Moneda Actualizada",
        text: `El sistema ahora opera en ${currency === "CLP" ? "Pesos Chilenos (CLP)" : "Guaraníes Paraguayos (PYG)"}.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error al actualizar",
        text: err.message,
      });
    }
  };

  const [showDeletePriceDialog, setShowDeletePriceDialog] = useState(false);
  const [deletingSize, setDeletingSize] = useState<{
    size: string;
    label: string;
  } | null>(null);

  // Pagination for cash registers
  const [currentPageRegisters, setCurrentPageRegisters] = useState(1);
  const REGISTERS_PER_PAGE = 5;

  const sortedRegisters = [...cashRegisters].sort(
    (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
  );
  const totalRegisterPages = Math.ceil(
    sortedRegisters.length / REGISTERS_PER_PAGE,
  );
  const paginatedRegisters = sortedRegisters.slice(
    (currentPageRegisters - 1) * REGISTERS_PER_PAGE,
    currentPageRegisters * REGISTERS_PER_PAGE,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && currentUser?.role === "supervisor") loadUsers();
  }, [mounted, currentUser]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Guards ──
  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <div className="text-zinc-600 font-bold uppercase tracking-wider text-xs">
          Cargando...
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "supervisor") {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4 font-sans select-none transition-colors duration-300">
        <div className="bg-[#e6e6e7] dark:bg-zinc-900 w-full max-w-md rounded-lg border border-zinc-300 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col pb-6 text-center text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
          <div className="bg-white dark:bg-zinc-850 py-6 border-b-2 border-zinc-350 dark:border-zinc-800 text-center flex flex-col items-center gap-1.5 transition-colors">
            <h1 className="text-3xl font-extrabold tracking-wider text-[#0a354c] dark:text-[#00c5ff] leading-none uppercase">
              CUSTODIA
            </h1>
            <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
              Sistema de Control de Casilleros
            </p>
          </div>

          <div className="px-6 py-6 flex flex-col items-center gap-4">
            <div className="bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-full">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="text-base font-black text-[#242424] dark:text-zinc-200 uppercase tracking-wider">
              Acceso Restringido
            </h2>
            <p className="text-xs text-zinc-650 dark:text-zinc-400 font-semibold">
              Solo los supervisores pueden acceder al panel de administración.
            </p>
            <Button
              onClick={() => router.push("/")}
              className="w-full bg-[#242424] dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold h-10 text-xs uppercase mt-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Handlers ──
  const handleCreate = async () => {
    setCreateError("");
    if (!newUsername.trim()) {
      setCreateError("Ingrese un nombre de usuario");
      return;
    }
    if (!newPassword.trim()) {
      setCreateError("Ingrese una contraseña");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createUser(
        newUsername.trim(),
        newPassword,
        newRole as "cajero" | "supervisor",
      );
      if (result.success) {
        setShowCreateDialog(false);
        setNewUsername("");
        setNewPassword("");
        setNewRole("cajero");
        await loadUsers();
      } else {
        setCreateError(result.error || "Error al crear usuario");
      }
    } catch {
      setCreateError("Error inesperado");
    } finally {
      setIsCreating(false);
    }
  };

  const openEditDialog = (user: UserRow) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword("");
    setEditRole(user.role);
    setEditError("");
    setShowEditDialog(true);
  };

  const handleEdit = async () => {
    if (!editingUser) return;
    setEditError("");
    if (!editUsername.trim()) {
      setEditError("El nombre no puede estar vacío");
      return;
    }

    setIsEditing(true);
    try {
      const updateData: any = { username: editUsername.trim(), role: editRole };
      if (editPassword.trim()) updateData.passwordHash = editPassword;

      const result = await updateUser(editingUser.id, updateData);
      if (result.success) {
        setShowEditDialog(false);
        setEditingUser(null);
        await loadUsers();
      } else {
        setEditError(result.error || "Error al actualizar");
      }
    } catch {
      setEditError("Error inesperado");
    } finally {
      setIsEditing(false);
    }
  };

  const openDeleteDialog = (user: UserRow) => {
    setDeletingUser(user);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      const result = await deleteUser(deletingUser.id);
      if (result.success) {
        setShowDeleteDialog(false);
        setDeletingUser(null);
        await loadUsers();
      }
    } catch (err) {
      console.error("Error deleting user:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // ── Render ──
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOf7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
  const startOf30Days = startOfToday - 29 * 24 * 60 * 60 * 1000;

  const ingresosHoy = cashTransactions
    .filter(
      (t) =>
        t.type === "income" && new Date(t.timestamp).getTime() >= startOfToday,
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const ingresosSemana = cashTransactions
    .filter(
      (t) =>
        t.type === "income" && new Date(t.timestamp).getTime() >= startOf7Days,
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const ingresosMes = cashTransactions
    .filter(
      (t) =>
        t.type === "income" && new Date(t.timestamp).getTime() >= startOf30Days,
    )
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center py-3 lg:py-4 px-4 lg:overflow-hidden transition-colors duration-300">
      <div className="w-full max-w-[960px] lg:max-w-[1330px] lg:h-[calc(100vh-32px)] bg-[#e6e6e7] dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 shadow-xl rounded-lg overflow-hidden flex flex-col pb-4 transition-colors duration-300">
        <Header showBack />

        <main className="flex-1 flex flex-col gap-6 p-6 overflow-y-auto min-h-0">
          {/* ── Supervisor Dashboard ── */}
          <div>
            <div className="bg-[#242424] dark:bg-zinc-800 text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider mb-4 rounded-md flex items-center gap-2 transition-colors duration-300">
              <Box className="h-4 w-4" />
              <span>Ocupación Actual</span>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-6 shadow-sm flex flex-col justify-center items-center h-[300px] text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                <h2 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-4 w-full flex items-center gap-2 uppercase tracking-wide">
                  <Box className="h-4 w-4 text-zinc-500" />
                  Estado de Casilleros
                </h2>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Ocupados",
                          value: lockers.filter((l) => l.isOccupied).length,
                        },
                        {
                          name: "Disponibles",
                          value: lockers.filter((l) => !l.isOccupied).length,
                        },
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
                      contentStyle={{
                        backgroundColor: "#242424",
                        borderColor: "#4e4e4e",
                        color: "#fff",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 shadow-sm flex flex-col justify-center text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                  <h3 className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> Total Casilleros
                  </h3>
                  <p className="text-3xl font-black text-[#242424] dark:text-[#00c5ff]">
                    {lockers.length}
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 shadow-sm flex flex-col justify-center text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                  <h3 className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Box className="h-3.5 w-3.5 text-[#00c5ff]" /> Disponibles
                  </h3>
                  <p className="text-3xl font-black text-[#00c5ff]">
                    {lockers.filter((l) => !l.isOccupied).length}
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 shadow-sm flex flex-col justify-center text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                  <h3 className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-[#4e4e4e]" /> Ocupados
                  </h3>
                  <p className="text-3xl font-black text-[#4e4e4e] dark:text-zinc-350">
                    {lockers.filter((l) => l.isOccupied).length}
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 shadow-sm flex flex-col justify-center text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                  <h3 className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Luggage className="h-3.5 w-3.5 text-amber-500" /> Total Equipajes
                  </h3>
                  <p className="text-3xl font-black text-amber-500">
                    {records.filter((r) => r.status === "Activo").length}
                  </p>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">En custodia activa</p>
                </div>
                <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 shadow-sm flex flex-col justify-center text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                  <h3 className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-red-655" /> Vencidos (+24 Hrs)
                  </h3>
                  <p className="text-3xl font-black text-red-600">
                    {
                      records.filter(
                        (r) =>
                          r.status === "Activo" &&
                          (Date.now() - new Date(r.entryTime).getTime()) /
                            (1000 * 60 * 60) >=
                            24,
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Income Metrics ── */}
          <div>
            <div className="bg-[#242424] dark:bg-zinc-800 text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider mb-4 rounded-md flex items-center gap-2 transition-colors duration-300">
              <DollarSign className="h-4 w-4 text-[#00c5ff]" />
              <span>Resumen de Recaudación</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden group text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                <div className="absolute -right-6 -top-6 text-[#00c5ff]/10 group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-32 h-32" />
                </div>
                <h3 className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#00c5ff]" /> Ingresos Hoy
                </h3>
                <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100 relative z-10">
                  {formatCurrency(ingresosHoy)}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden group text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                <div className="absolute -right-6 -top-6 text-[#0a354c]/10 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-32 h-32" />
                </div>
                <h3 className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#0a354c] dark:text-[#00c5ff]" /> Últimos 7 Días
                </h3>
                <p className="text-2xl font-black text-[#0a354c] dark:text-[#00c5ff] relative z-10">
                  {formatCurrency(ingresosSemana)}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden group text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
                <div className="absolute -right-6 -top-6 text-[#1588b3]/10 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-32 h-32" />
                </div>
                <h3 className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#1588b3] dark:text-[#00c5ff]" /> Últimos 30 Días
                </h3>
                <p className="text-2xl font-black text-[#1588b3] dark:text-[#00c5ff] relative z-10">
                  {formatCurrency(ingresosMes)}
                </p>
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
                onClick={() => {
                  setCreateError("");
                  setShowCreateDialog(true);
                }}
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
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                    Cargando usuarios...
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden border border-zinc-300 rounded-xl shadow-sm bg-white">
                <Table>
                  <TableHeader className="bg-[#242424] hover:bg-[#242424]">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">
                        ID
                      </TableHead>
                      <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">
                        USUARIO
                      </TableHead>
                      <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">
                        ROL
                      </TableHead>
                      <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10 text-right">
                        ACCIONES
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-zinc-500 font-semibold"
                        >
                          No hay usuarios registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow
                          key={user.id}
                          className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50"
                        >
                          <TableCell className="text-zinc-800 font-mono text-xs py-3">
                            {user.id}
                          </TableCell>
                          <TableCell className="text-zinc-800 font-bold text-xs py-3">
                            {user.username}
                          </TableCell>
                          <TableCell className="py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                user.role === "supervisor"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              {user.role === "supervisor"
                                ? "Supervisor"
                                : "Cajero"}
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
                                title={
                                  user.id === currentUser.id
                                    ? "No puedes eliminar tu propia cuenta"
                                    : ""
                                }
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

          {/* ── Currency Selector Section ── */}
          <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-300">
            <div className="flex flex-col gap-1">
              <span className="font-extrabold text-sm text-[#0a354c] dark:text-[#00c5ff]">
                Moneda del Sistema
              </span>
              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                Define el símbolo y formato de los cobros
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleUpdateCurrency("CLP")}
                variant={currentCurrency === "CLP" ? "default" : "outline"}
                className="h-8 text-xs font-bold px-4 rounded-full"
              >
                Pesos (CLP / $)
              </Button>
              <Button
                onClick={() => handleUpdateCurrency("PYG")}
                variant={currentCurrency === "PYG" ? "default" : "outline"}
                className="h-8 text-xs font-bold px-4 rounded-full"
              >
                Guaraníes (PYG / Gs.)
              </Button>
            </div>
          </div>

          {/* ── Layout Configuration Section ── */}
          <LayoutConfigurator />


          {/* ── Cash Register Supervision / Session History Section ── */}
          <div>
            <div className="bg-[#242424] dark:bg-zinc-800 text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider mb-4 rounded-md flex items-center gap-2 transition-colors duration-300">
              <History className="h-4 w-4 text-[#00c5ff]" />
              <span>Historial de Turnos y Cajas</span>
            </div>

            <div className="overflow-hidden border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm bg-white dark:bg-zinc-800 transition-colors duration-300">
              <Table>
                <TableHeader className="bg-[#242424] dark:bg-zinc-855 hover:bg-[#242424] dark:hover:bg-zinc-855">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10">
                      CAJERO
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10">
                      APERTURA
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10">
                      CIERRE
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">
                      INICIAL
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">
                      EFECTIVO
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">
                      TARJETA
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">
                      TOTAL VENTAS
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">
                      RETIROS
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">
                      ENTREGADO
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-right">
                      DIFERENCIA
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10 text-center">
                      ESTADO
                    </TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-[10px] h-10">
                      NOTAS
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashRegisters.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={12}
                        className="text-center py-8 text-zinc-500 font-semibold"
                      >
                        No hay turnos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRegisters.map((register) => {
                      const regTxs = cashTransactions.filter(
                        (t) => t.registerId === register.id,
                      );
                      const ingresosTarjeta =
                        Math.round(
                          regTxs
                            .filter(
                              (t) =>
                                t.type === "income" &&
                                t.description.includes("Tarjeta"),
                            )
                            .reduce((s, t) => s + t.amount, 0) / 10,
                        ) * 10;
                      const ingresosEfectivo =
                        Math.round(
                          regTxs
                            .filter(
                              (t) =>
                                t.type === "income" &&
                                !t.description.includes("Tarjeta"),
                            )
                            .reduce((s, t) => s + t.amount, 0) / 10,
                        ) * 10;
                      const gastosEfectivo =
                        Math.round(
                          regTxs
                            .filter((t) => t.type === "expense")
                            .reduce((s, t) => s + t.amount, 0) / 10,
                        ) * 10;

                      const saldoEsperadoEfectivo =
                        register.openingAmount +
                        ingresosEfectivo -
                        gastosEfectivo;
                      const diferenciaCaja =
                        register.closingAmount !== null
                          ? register.closingAmount - saldoEsperadoEfectivo
                          : null;

                      return (
                        <TableRow
                          key={register.id}
                          className="border-b border-zinc-205 dark:border-zinc-700 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-700/50"
                        >
                          <TableCell className="text-zinc-800 dark:text-zinc-200 font-bold text-xs py-3">
                            {register.openedBy || "desconocido"}
                          </TableCell>
                          <TableCell className="text-zinc-800 dark:text-zinc-350 font-semibold text-[10px] py-3">
                            {formatDateTime(register.openedAt)}
                          </TableCell>
                          <TableCell className="text-zinc-800 dark:text-zinc-350 font-semibold text-[10px] py-3">
                            {register.closedAt ? (
                              formatDateTime(register.closedAt)
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[9px]">
                                Activo ahora
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-zinc-800 dark:text-zinc-200 font-medium text-xs text-right py-3">
                            {formatCurrency(register.openingAmount)}
                          </TableCell>
                          <TableCell className="text-amber-600 dark:text-amber-400 font-semibold text-xs text-right py-3">
                            {formatCurrency(ingresosEfectivo)}
                          </TableCell>
                          <TableCell className="text-blue-600 dark:text-blue-400 font-semibold text-xs text-right py-3">
                            {formatCurrency(ingresosTarjeta)}
                          </TableCell>
                          <TableCell className="text-zinc-800 dark:text-zinc-200 font-extrabold text-xs text-right py-3">
                            {formatCurrency(ingresosEfectivo + ingresosTarjeta)}
                          </TableCell>
                          <TableCell className="text-red-650 dark:text-red-400 font-medium text-xs text-right py-3">
                            {formatCurrency(gastosEfectivo)}
                          </TableCell>
                          <TableCell className="text-zinc-800 dark:text-zinc-200 font-black text-xs text-right py-3">
                            {register.closingAmount !== null
                              ? formatCurrency(register.closingAmount)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right py-3">
                            {diferenciaCaja !== null ? (
                              <span
                                className={`text-[10px] font-black ${diferenciaCaja === 0 ? "text-emerald-600 dark:text-emerald-400" : diferenciaCaja > 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}
                              >
                                {diferenciaCaja === 0
                                  ? "Cuadrada"
                                  : diferenciaCaja > 0
                                    ? `Sobrante: +${formatCurrency(diferenciaCaja)}`
                                    : `Faltante: -${formatCurrency(Math.abs(diferenciaCaja))}`}
                              </span>
                            ) : (
                              <span className="text-zinc-500 dark:text-zinc-400 font-semibold">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                register.status === "open"
                                  ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                                  : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {register.status === "open"
                                ? "Abierta"
                                : "Cerrada"}
                            </span>
                          </TableCell>
                          <TableCell
                            className="text-zinc-500 dark:text-zinc-400 font-medium text-xs max-w-[150px] truncate py-3"
                            title={register.notes}
                          >
                            {register.notes || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between p-4 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 font-semibold transition-colors duration-300">
                <div>
                  Mostrando{" "}
                  {Math.min(
                    sortedRegisters.length,
                    (currentPageRegisters - 1) * REGISTERS_PER_PAGE + 1,
                  )}{" "}
                  a{" "}
                  {Math.min(
                    sortedRegisters.length,
                    currentPageRegisters * REGISTERS_PER_PAGE,
                  )}{" "}
                  de {sortedRegisters.length} registros
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPageRegisters((p) => Math.max(1, p - 1))
                    }
                    disabled={currentPageRegisters === 1}
                    className="h-7 text-[10px] bg-white dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 font-bold transition-colors"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPageRegisters((p) =>
                        Math.min(totalRegisterPages, p + 1),
                      )
                    }
                    disabled={
                      currentPageRegisters >= totalRegisterPages ||
                      totalRegisterPages === 0
                    }
                    className="h-7 text-[10px] bg-white dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 font-bold transition-colors"
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
        <DialogContent className="bg-[#e6e6e7] dark:bg-zinc-900 border border-zinc-350 dark:border-zinc-800 p-0 overflow-hidden rounded-xl shadow-2xl max-w-md text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
          <DialogHeader className="bg-[#242424] dark:bg-zinc-850 text-white p-4">
            <DialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-white">
              <Plus className="h-4 w-4 text-[#00c5ff]" />
              <span>Crear Nuevo Usuario</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-300 dark:text-zinc-400 text-xs mt-1">
              Ingrese los datos del nuevo usuario del sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
                Nombre de Usuario
              </Label>
              <Input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="ej. cajero2"
                className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold focus-visible:ring-[#00c5ff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
                Contraseña
              </Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold focus-visible:ring-[#00c5ff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
                Rol
              </Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold focus-visible:ring-[#00c5ff]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700">
                  <SelectItem value="cajero" className="dark:hover:bg-zinc-700">Cajero</SelectItem>
                  <SelectItem value="supervisor" className="dark:hover:bg-zinc-700">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <p className="text-xs text-red-650 font-bold">{createError}</p>
            )}
          </div>
          <DialogFooter className="bg-zinc-200/50 dark:bg-zinc-900/50 p-4 border-t border-zinc-300 dark:border-zinc-800 flex justify-end gap-3 transition-colors">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
              className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-bold h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="bg-[#242424] dark:bg-zinc-750 text-white hover:bg-zinc-800 dark:hover:bg-zinc-700 font-bold h-9 text-xs"
            >
              {isCreating ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#e6e6e7] dark:bg-zinc-900 border border-zinc-350 dark:border-zinc-800 p-0 overflow-hidden rounded-xl shadow-2xl max-w-md text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
          <DialogHeader className="bg-[#242424] dark:bg-zinc-855 text-white p-4">
            <DialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-white">
              <Pencil className="h-4 w-4 text-[#00c5ff]" />
              <span>Editar Usuario</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-300 dark:text-zinc-400 text-xs mt-1">
              Modifique los datos. Deje la contraseña vacía para mantener la
              actual.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-350 font-bold text-xs uppercase tracking-wide">
                Nombre de Usuario
              </Label>
              <Input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold focus-visible:ring-[#00c5ff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-350 font-bold text-xs uppercase tracking-wide">
                Nueva Contraseña (opcional)
              </Label>
              <Input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Dejar vacío para no cambiar"
                className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold focus-visible:ring-[#00c5ff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-350 font-bold text-xs uppercase tracking-wide">
                Rol
              </Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold focus-visible:ring-[#00c5ff]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700">
                  <SelectItem value="cajero" className="dark:hover:bg-zinc-700">Cajero</SelectItem>
                  <SelectItem value="supervisor" className="dark:hover:bg-zinc-700">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editError && (
              <p className="text-xs text-red-650 font-bold">{editError}</p>
            )}
          </div>
          <DialogFooter className="bg-zinc-200/50 dark:bg-zinc-900/50 p-4 border-t border-zinc-300 dark:border-zinc-800 flex justify-end gap-3 transition-colors">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isEditing}
              className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-bold h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isEditing}
              className="bg-[#242424] dark:bg-zinc-750 text-white hover:bg-zinc-800 dark:hover:bg-zinc-700 font-bold h-9 text-xs"
            >
              {isEditing ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#e6e6e7] dark:bg-zinc-900 border border-zinc-350 dark:border-zinc-800 p-0 overflow-hidden rounded-xl shadow-2xl max-w-sm text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
          <AlertDialogHeader className="bg-[#242424] dark:bg-zinc-850 text-white p-4">
            <AlertDialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-white">
              <Trash2 className="h-4 w-4 text-red-500" />
              <span>Eliminar Usuario</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300 dark:text-zinc-400 text-xs mt-1">
              ¿Está seguro que desea eliminar al usuario{" "}
              <strong className="text-white">{deletingUser?.username}</strong>?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-zinc-200/50 dark:bg-zinc-900/50 p-4 border-t border-zinc-300 dark:border-zinc-800 flex justify-end gap-3 transition-colors">
            <AlertDialogCancel
              disabled={isDeleting}
              className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-bold h-9 text-xs uppercase"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-650 hover:bg-red-750 text-white font-bold h-9 text-xs uppercase transition-colors"
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
