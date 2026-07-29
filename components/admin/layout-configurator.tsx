"use client";

import { useState } from "react";
import { useCustodyStore, notifyStateChange } from "@/lib/custody-store";
import { dbSyncLayout, createPrice, updatePrice, deletePrice } from "@/app/actions/db-actions";
import { type LayoutConfig, type ShelfConfig, type LockerSizeOption } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Box, Save, AlertTriangle, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import Swal from "sweetalert2";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export function LayoutConfigurator() {
  const { layoutConfig, lockerSizes, lockers, hydrateState } = useCustodyStore();
  const [editingConfig, setEditingConfig] = useState<LayoutConfig>(layoutConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // States for Modals
  const [showCreatePriceDialog, setShowCreatePriceDialog] = useState(false);
  const [showEditPriceDialog, setShowEditPriceDialog] = useState(false);
  const [showDeletePriceDialog, setShowDeletePriceDialog] = useState(false);
  
  const [newSizeCode, setNewSizeCode] = useState("");
  const [newSizeLabel, setNewSizeLabel] = useState("");
  const [newSizePrice, setNewSizePrice] = useState("");
  
  const [editingSize, setEditingSize] = useState<{ size: string; label: string } | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const [deletingSize, setDeletingSize] = useState<{ size: string; label: string; shelfId: string } | null>(null);
  const [priceError, setPriceError] = useState("");
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  const refreshState = async () => {
    const { getInitialState } = await import("@/app/actions/db-actions");
    const stateRes = await getInitialState();
    if (stateRes.success && stateRes.data) {
      hydrateState(stateRes.data);
      setEditingConfig(stateRes.data.layoutConfig);
    }
  };

  const handleAddShelf = () => {
    const newId = prompt("Ingrese el nombre/letra del nuevo sector (ej. E):");
    if (!newId) return;
    const id = newId.trim().toUpperCase();
    if (editingConfig.shelves.some(s => s.id === id)) {
      alert("El sector ya existe.");
      return;
    }
    const newShelf: ShelfConfig = {
      id,
      sizes: lockerSizes.map(ls => ({ size: ls.value, count: 0 })),
    };
    setEditingConfig({
      ...editingConfig,
      shelves: [...editingConfig.shelves, newShelf],
    });
  };

  const handleRemoveShelf = (id: string) => {
    const occupiedInShelf = lockers.filter(
      (l) => l.col.startsWith(id) && (l.isOccupied || l.currentRecordId !== null),
    );
    if (occupiedInShelf.length > 0) {
      const labels = occupiedInShelf.map((l) => `${l.col}${l.row}`).join(", ");
      Swal.fire({
        icon: "warning",
        title: `No se puede eliminar el Sector ${id}`,
        text: `El Sector ${id} tiene equipaje guardado actualmente en los casilleros [ ${labels} ]. Debe retirar o entregar dicho equipaje en la pantalla de Cajero antes de eliminar el sector.`,
        confirmButtonColor: "#00c5ff",
      });
      return;
    }

    setEditingConfig({
      ...editingConfig,
      shelves: editingConfig.shelves.filter((s) => s.id !== id),
    });
  };

  const handleSizeCountChange = (shelfId: string, sizeValue: string, countStr: string) => {
    const count = parseInt(countStr) || 0;
    setEditingConfig({
      ...editingConfig,
      shelves: editingConfig.shelves.map((shelf) => {
        if (shelf.id === shelfId) {
          const sizeIndex = shelf.sizes.findIndex((s) => s.size === sizeValue);
          const newSizes = [...shelf.sizes];
          if (sizeIndex >= 0) {
            newSizes[sizeIndex] = { ...newSizes[sizeIndex], count };
          } else {
            newSizes.push({ size: sizeValue, count });
          }
          return { ...shelf, sizes: newSizes };
        }
        return shelf;
      }),
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await dbSyncLayout(editingConfig, lockerSizes);
      if (result.success) {
        Swal.fire("Éxito", "Layout actualizado correctamente", "success");
        await refreshState();
        notifyStateChange();
      } else {
        Swal.fire({
          icon: "warning",
          title: "Acción Bloqueada por Equipaje Ocupado",
          text: result.error || "No se pudo actualizar el layout",
          confirmButtonColor: "#00c5ff",
          confirmButtonText: "Entendido",
        });
      }
    } catch (err: any) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePrice = async () => {
    const price = parseInt(newSizePrice, 10);
    if (!newSizeCode.trim() || !newSizeLabel.trim() || isNaN(price) || price <= 0) {
      setPriceError("Complete todos los campos con valores válidos");
      return;
    }

    const newCode = newSizeCode.trim().toUpperCase();
    setIsSavingPrice(true);
    try {
      const result = await createPrice(newCode, newSizeLabel.trim(), price);
      if (result.success) {
        setShowCreatePriceDialog(false);
        setNewSizeCode("");
        setNewSizeLabel("");
        setNewSizePrice("");
        await refreshState();
        notifyStateChange();

        // Automatically ensure the new size is present in editingConfig for all sectors
        setEditingConfig((prev) => ({
          ...prev,
          shelves: prev.shelves.map((shelf) => {
            if (!shelf.sizes.some((s) => s.size === newCode)) {
              return {
                ...shelf,
                sizes: [...shelf.sizes, { size: newCode, count: 0 }],
              };
            }
            return shelf;
          }),
        }));
      } else {
        setPriceError(result.error || "Error al crear medida");
      }
    } catch (err) {
      setPriceError("Error inesperado");
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleEditPrice = async () => {
    if (!editingSize) return;
    const price = parseInt(editPrice, 10);
    if (!editLabel.trim() || isNaN(price) || price <= 0) {
      setPriceError("Complete todos los campos con valores válidos");
      return;
    }

    setIsSavingPrice(true);
    try {
      const result = await updatePrice(editingSize.size, price, editLabel.trim());
      if (result.success) {
        setShowEditPriceDialog(false);
        setEditingSize(null);
        await refreshState();
        notifyStateChange();
      } else {
        setPriceError(result.error || "Error al actualizar medida");
      }
    } catch (err) {
      setPriceError("Error inesperado");
    } finally {
      setIsSavingPrice(false);
    }
  };

  // State for assigning an existing global size to a shelf
  const [showAddSizeToShelfDialog, setShowAddSizeToShelfDialog] = useState(false);
  const [targetShelfForAdd, setTargetShelfForAdd] = useState<string | null>(null);
  const [selectedSizeForAdd, setSelectedSizeForAdd] = useState<string>("");
  const [countForAdd, setCountForAdd] = useState<string>("12");

  const openAddSizeToShelf = (shelfId: string) => {
    setTargetShelfForAdd(shelfId);
    const currentShelf = editingConfig.shelves.find((s) => s.id === shelfId);
    const activeSizes = currentShelf ? currentShelf.sizes.filter((s) => s.count > 0).map((s) => s.size) : [];
    const available = lockerSizes.filter((ls) => !activeSizes.includes(ls.value));

    if (available.length > 0) {
      setSelectedSizeForAdd(available[0].value);
    } else if (lockerSizes.length > 0) {
      setSelectedSizeForAdd(lockerSizes[0].value);
    }
    setCountForAdd("12");
    setShowAddSizeToShelfDialog(true);
  };

  const handleConfirmAddSizeToShelf = () => {
    if (!targetShelfForAdd || !selectedSizeForAdd) return;
    const count = parseInt(countForAdd) || 1;
    handleSizeCountChange(targetShelfForAdd, selectedSizeForAdd, count.toString());
    setShowAddSizeToShelfDialog(false);
  };

  const handleRemoveFromShelf = () => {
    if (!deletingSize) return;
    const targetShelfId = deletingSize.shelfId;
    const targetSize = deletingSize.size;
    const targetLabel = deletingSize.label;

    const colCode = `${targetShelfId}${targetSize}`;
    const occupiedInSize = lockers.filter(
      (l) => l.col === colCode && (l.isOccupied || l.currentRecordId !== null),
    );

    if (occupiedInSize.length > 0) {
      const labels = occupiedInSize.map((l) => `${l.col}${l.row}`).join(", ");
      setShowDeletePriceDialog(false);
      setDeletingSize(null);
      Swal.fire({
        icon: "warning",
        title: `No se puede quitar la medida ${targetLabel}`,
        text: `El Sector ${targetShelfId} tiene equipaje guardado actualmente en los casilleros [ ${labels} ]. Debe retirar o entregar el equipaje en la pantalla de Cajero antes de quitar esta medida del sector.`,
        confirmButtonColor: "#00c5ff",
      });
      return;
    }

    setEditingConfig((prev) => ({
      ...prev,
      shelves: prev.shelves.map((shelf) => {
        if (shelf.id === targetShelfId) {
          return {
            ...shelf,
            sizes: shelf.sizes.filter((s) => s.size !== targetSize),
          };
        }
        return shelf;
      }),
    }));

    setShowDeletePriceDialog(false);
    setDeletingSize(null);
    Swal.fire({
      title: "Medida Removida del Sector",
      text: `La medida ${targetLabel} ha sido quitada del Sector ${targetShelfId}. Presione "Guardar Layout" para aplicar los cambios en el sistema.`,
      icon: "info",
      confirmButtonText: "Entendido",
      confirmButtonColor: "#00c5ff",
    });
  };

  const handleDeletePrice = async () => {
    if (!deletingSize) return;
    setIsSavingPrice(true);
    try {
      const result = await deletePrice(deletingSize.size);
      if (result.success) {
        setEditingConfig((prev) => ({
          ...prev,
          shelves: prev.shelves.map((shelf) => ({
            ...shelf,
            sizes: shelf.sizes.filter((s) => s.size !== deletingSize.size),
          })),
        }));
        setShowDeletePriceDialog(false);
        setDeletingSize(null);
        await refreshState();
        Swal.fire("Eliminada", `La medida ${deletingSize.label} ha sido eliminada de todos los sectores.`, "success");
      } else {
        setPriceError(result.error || "Error al eliminar medida");
      }
    } catch (err) {
      setPriceError("Error inesperado");
    } finally {
      setIsSavingPrice(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Collapsible Header (Matching admin dark section bars) ── */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="bg-[#242424] dark:bg-zinc-800 text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-md flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-zinc-800"
      >
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4 text-[#00c5ff]" />
          <span>Configuración de Sectores y Medidas</span>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {isExpanded && (
            <div className="flex gap-2 mr-2">
              <Button
                type="button"
                onClick={handleAddShelf}
                variant="outline"
                className="h-7 text-[10px] uppercase font-bold bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-100"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo Sector
              </Button>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="h-7 text-[10px] font-bold text-white hover:bg-zinc-700 flex items-center gap-1.5 px-2 uppercase"
          >
            <span>{isExpanded ? "Ocultar" : "Mostrar"}</span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-[#00c5ff]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#00c5ff]" />}
          </Button>
        </div>
      </div>

      {/* ── Collapsible Body ── */}
      {isExpanded && (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-6 shadow-sm text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 font-semibold">
            Cree medidas globales, configure sus tarifas de precio y asigne la cantidad de casilleros en cada sector.
          </p>

          {/* ── Global Price & Size Management ── */}
          <div className="mb-6 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-900 shadow-sm">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0a354c] dark:text-[#00c5ff] flex items-center gap-2">
                <span>Tarifas y Precios de Medidas</span>
              </h3>
              <Button
                type="button"
                onClick={() => {
                  setPriceError("");
                  setShowCreatePriceDialog(true);
                }}
                variant="outline"
                size="sm"
                className="h-7 text-[10px] uppercase font-bold bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Crear Nueva Medida
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {lockerSizes.map((ls) => (
                <div
                  key={ls.value}
                  className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-850 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-xs font-black uppercase text-zinc-800 dark:text-zinc-100 block">
                      {ls.label}
                    </span>
                    <span className="text-sm font-black text-[#00c5ff] mt-1 block">
                      Gs. {ls.price.toLocaleString("es-PY")}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingSize({ size: ls.value, label: ls.label });
                      setEditPrice(ls.price.toString());
                      setEditLabel(ls.label);
                      setPriceError("");
                      setShowEditPriceDialog(true);
                    }}
                    className="mt-3 h-7 text-[10px] uppercase font-bold bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-1 w-full"
                  >
                    <Pencil className="h-3 w-3" /> Editar Precio
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {editingConfig.shelves.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm font-bold">No hay sectores configurados.</div>
            ) : (
              editingConfig.shelves.map((shelf) => {
                const activeSizesInShelf = lockerSizes.filter((ls) => {
                  const cfg = shelf.sizes.find((s) => s.size === ls.value);
                  return cfg && cfg.count > 0;
                });

                return (
                  <div key={shelf.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-850">
                    <div className="flex justify-between items-center mb-4 border-b border-zinc-200 dark:border-zinc-700 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#0a354c] dark:text-[#00c5ff]">
                        Sector {shelf.id}
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => openAddSizeToShelf(shelf.id)}
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] font-bold px-2 py-0 border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Asignar Medida
                        </Button>
                        <Button
                          onClick={() => {
                            setPriceError("");
                            setShowCreatePriceDialog(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] font-bold px-2 py-0 border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Crear Medida
                        </Button>
                        <Button onClick={() => handleRemoveShelf(shelf.id)} variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {activeSizesInShelf.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
                        <p className="text-xs text-zinc-400 font-bold">No hay medidas asignadas a este sector.</p>
                        <Button
                          onClick={() => openAddSizeToShelf(shelf.id)}
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 text-[10px] uppercase font-bold bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-100"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Asignar Medida a Sector {shelf.id}
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeSizesInShelf.map((ls) => {
                          const currentSizeConfig = shelf.sizes.find((s) => s.size === ls.value);
                          const count = currentSizeConfig ? currentSizeConfig.count : 0;
                          return (
                            <div key={ls.value} className="flex flex-col gap-1.5 p-3 border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 shadow-sm relative group">
                              <div className="flex justify-between items-start">
                                <label className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase leading-tight truncate pr-14">
                                  {ls.label} <span className="text-zinc-400 font-medium lowercase ml-1">(Gs. {ls.price})</span>
                                </label>
                                <div className="absolute top-2 right-2 flex gap-1 z-10">
                                  <button
                                    onClick={() => {
                                      setEditingSize({ size: ls.value, label: ls.label });
                                      setEditPrice(ls.price.toString());
                                      setEditLabel(ls.label);
                                      setPriceError("");
                                      setShowEditPriceDialog(true);
                                    }}
                                    className="p-1 text-zinc-500 hover:text-blue-500 bg-zinc-100 dark:bg-zinc-800 rounded"
                                    title="Editar medida"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingSize({ size: ls.value, label: ls.label, shelfId: shelf.id });
                                      setPriceError("");
                                      setShowDeletePriceDialog(true);
                                    }}
                                    className="p-1 text-zinc-500 hover:text-red-500 bg-zinc-100 dark:bg-zinc-800 rounded"
                                    title="Quitar / Eliminar medida"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mt-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={count}
                                  onChange={(e) => handleSizeCountChange(shelf.id, ls.value, e.target.value)}
                                  className="h-7 w-20 text-xs font-mono font-bold"
                                />
                                <span className="text-[10px] text-zinc-500 font-semibold uppercase">casilleros asignados</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-6 flex items-center gap-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 p-4 rounded-xl border border-amber-300 dark:border-amber-900/60 shadow-sm">
            <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold uppercase tracking-wider">
                Protección de Seguridad de Equipajes
              </span>
              <p className="text-[11px] font-medium leading-relaxed">
                Si intenta reducir casilleros o eliminar un sector con equipajes ocupados actualmente, el sistema <strong>bloqueará la acción e indicará los casilleros exactos que debe retirar/entregar en la pantalla de Cajero</strong> antes de poder guardar los cambios.
              </p>
            </div>
          </div>

          {/* ── Save Layout Button below the last sector ── */}
          <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-10 px-6 text-xs uppercase font-bold bg-[#00c5ff] hover:bg-[#00a3d4] text-white shadow-md flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando Layout..." : "Guardar Layout"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Create Price Dialog ── */}
      <Dialog open={showCreatePriceDialog} onOpenChange={setShowCreatePriceDialog}>
        <DialogContent className="bg-[#e6e6e7] dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-0 overflow-hidden rounded-xl shadow-2xl max-w-md">
          <DialogHeader className="bg-[#242424] text-white p-4">
            <DialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
              <Plus className="h-4 w-4 text-[#00c5ff]" />
              <span>Nueva Medida Global</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-300 text-xs mt-1">
              Esta medida estará disponible en todos los estantes.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
                Código (ej. XL)
              </Label>
              <Input
                type="text"
                value={newSizeCode}
                onChange={(e) => setNewSizeCode(e.target.value.toUpperCase())}
                className="bg-white dark:bg-zinc-800 border-zinc-300 uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
                Nombre (ej. Maleta Grande)
              </Label>
              <Input
                type="text"
                value={newSizeLabel}
                onChange={(e) => setNewSizeLabel(e.target.value)}
                className="bg-white dark:bg-zinc-800 border-zinc-300"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
                Precio (Gs.)
              </Label>
              <Input
                type="number"
                value={newSizePrice}
                onChange={(e) => setNewSizePrice(e.target.value)}
                className="bg-white dark:bg-zinc-800 border-zinc-300"
                min="0"
                step="100"
              />
            </div>
            {priceError && <p className="text-xs text-red-600 font-bold">{priceError}</p>}
          </div>
          <DialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreatePriceDialog(false)} disabled={isSavingPrice} className="h-9 text-xs font-bold">
              Cancelar
            </Button>
            <Button onClick={handleCreatePrice} disabled={isSavingPrice} className="h-9 text-xs font-bold bg-[#242424] text-white">
              {isSavingPrice ? "Creando..." : "Crear Medida"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Price Dialog ── */}
      <Dialog open={showEditPriceDialog} onOpenChange={setShowEditPriceDialog}>
        <DialogContent className="bg-[#e6e6e7] dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-0 overflow-hidden rounded-xl shadow-2xl max-w-md">
          <DialogHeader className="bg-[#242424] text-white p-4">
            <DialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
              <Pencil className="h-4 w-4 text-[#00c5ff]" />
              <span>Editar Medida</span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
                Nombre / Descripción
              </Label>
              <Input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="bg-white dark:bg-zinc-800 border-zinc-300"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
                Precio (Gs.)
              </Label>
              <Input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="bg-white dark:bg-zinc-800 border-zinc-300"
                min="0"
                step="100"
              />
            </div>
            {priceError && <p className="text-xs text-red-600 font-bold">{priceError}</p>}
          </div>
          <DialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowEditPriceDialog(false)} disabled={isSavingPrice} className="h-9 text-xs font-bold">
              Cancelar
            </Button>
            <Button onClick={handleEditPrice} disabled={isSavingPrice} className="h-9 text-xs font-bold bg-[#242424] text-white">
              {isSavingPrice ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete / Remove Price Confirmation ── */}
      <AlertDialog open={showDeletePriceDialog} onOpenChange={setShowDeletePriceDialog}>
        <AlertDialogContent className="bg-[#e6e6e7] dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-0 overflow-hidden rounded-xl shadow-2xl max-w-md">
          <AlertDialogHeader className="bg-[#242424] text-white p-4">
            <AlertDialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-white">
              <Trash2 className="h-4 w-4 text-red-500" />
              <span>Quitar o Eliminar Medida</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300 text-xs mt-1">
              ¿Cómo desea proceder con la medida <strong>{deletingSize?.label}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="p-4 space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-lg flex flex-col gap-1">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase">
                1. Quitar solo del Sector {deletingSize?.shelfId}
              </span>
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                Establece la cantidad en 0 casilleros para este sector. La medida seguirá disponible en los demás sectores.
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 rounded-lg flex flex-col gap-1">
              <span className="text-xs font-bold text-red-900 dark:text-red-200 uppercase">
                2. Eliminar de TODOS los sectores (Global)
              </span>
              <p className="text-[11px] text-red-700 dark:text-red-300">
                Borra la medida por completo del sistema y de todos los estantes.
              </p>
            </div>

            {priceError && <p className="text-xs text-red-600 font-bold">{priceError}</p>}
          </div>

          <AlertDialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex flex-col sm:flex-row justify-end gap-2">
            <AlertDialogCancel disabled={isSavingPrice} className="h-9 text-xs font-bold sm:mr-auto">
              Cancelar
            </AlertDialogCancel>

            <Button
              type="button"
              onClick={handleRemoveFromShelf}
              disabled={isSavingPrice}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs"
            >
              Quitar de Sector {deletingSize?.shelfId}
            </Button>

            <Button
              type="button"
              onClick={handleDeletePrice}
              disabled={isSavingPrice}
              className="bg-red-600 hover:bg-red-700 text-white font-bold h-9 text-xs"
            >
              {isSavingPrice ? "Eliminando..." : "Eliminar de Todos"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Assign Size to Sector Dialog ── */}
      <Dialog open={showAddSizeToShelfDialog} onOpenChange={setShowAddSizeToShelfDialog}>
        <DialogContent className="bg-[#e6e6e7] dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-0 overflow-hidden rounded-xl shadow-2xl max-w-md">
          <DialogHeader className="bg-[#242424] text-white p-4">
            <DialogTitle className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
              <Plus className="h-4 w-4 text-[#00c5ff]" />
              <span>Asignar Medida a Sector {targetShelfForAdd}</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-300 text-xs mt-1">
              Seleccione una medida disponible y defina cuántos casilleros tendrá en el Sector {targetShelfForAdd}.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
                Medida
              </Label>
              <select
                value={selectedSizeForAdd}
                onChange={(e) => setSelectedSizeForAdd(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200"
              >
                {lockerSizes.map((ls) => (
                  <option key={ls.value} value={ls.value}>
                    {ls.label} (Gs. {ls.price})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
                Cantidad de Casilleros
              </Label>
              <Input
                type="number"
                value={countForAdd}
                onChange={(e) => setCountForAdd(e.target.value)}
                className="bg-white dark:bg-zinc-800 border-zinc-300"
                min="1"
              />
            </div>
          </div>
          <DialogFooter className="bg-zinc-200/50 p-4 border-t border-zinc-300 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAddSizeToShelfDialog(false)} className="h-9 text-xs font-bold">
              Cancelar
            </Button>
            <Button onClick={handleConfirmAddSizeToShelf} className="h-9 text-xs font-bold bg-[#00c5ff] hover:bg-[#00a3d4] text-white">
              Asignar a Sector {targetShelfForAdd}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
