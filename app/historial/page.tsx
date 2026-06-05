'use client'

import { useState, useMemo, useEffect } from 'react'
import { History, Search, Filter, Ruler } from 'lucide-react'
import { Header } from '@/components/custody/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCustodyStore } from '@/lib/custody-store'
import { formatDateTime, type LockerSize } from '@/lib/types'

export default function HistorialPage() {
  const { records, lockers, lockerSizes } = useCustodyStore()
  const [mounted, setMounted] = useState(false)
  const [searchDocument, setSearchDocument] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSize, setFilterSize] = useState<string>('all')

  useEffect(() => {
    setMounted(true)
  }, [])

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesDocument = searchDocument
        ? record.clientDocument.toLowerCase().includes(searchDocument.toLowerCase()) ||
          record.code.toLowerCase().includes(searchDocument.toLowerCase())
        : true
      const matchesStatus = filterStatus === 'all' || record.status === filterStatus
      const matchesSize = filterSize === 'all' || record.size === filterSize
      return matchesDocument && matchesStatus && matchesSize
    })
  }, [records, searchDocument, filterStatus, filterSize])

  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 15

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchDocument, filterStatus, filterSize])

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE)
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  }, [filteredRecords, currentPage])

  const getSizeLabel = (size: LockerSize) => {
    return lockerSizes.find((s) => s.value === size)?.label || size
  }

  const getLockerDisplay = (lockerId: number) => {
    const locker = lockers.find(l => l.id === lockerId)
    return locker ? `${locker.row},${locker.col}` : lockerId
  }

  const handleSearch = () => {
    // Filter is already reactive, this is just for UX
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
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center gap-2 mb-6">
            <History className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-card-foreground">Historial de Casilleros</h2>
          </div>

          {/* Filters */}
          <div className="grid sm:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                Buscar por Documento
              </Label>
              <Input
                value={searchDocument}
                onChange={(e) => setSearchDocument(e.target.value)}
                placeholder="RUT / DNI / Pasaporte"
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                Estado
              </Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Entregado">Entregado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Ruler className="h-4 w-4" />
                Tamano
              </Label>
              <Select value={filterSize} onValueChange={setFilterSize}>
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Todas las tallas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tallas</SelectItem>
                  {lockerSizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-transparent">Buscar</Label>
              <Button onClick={handleSearch} className="w-full bg-accent hover:bg-accent/90">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">CÓDIGO / RUT</TableHead>
                  <TableHead className="text-muted-foreground"># CASILLERO</TableHead>
                  <TableHead className="text-muted-foreground">RUT/DNI</TableHead>
                  <TableHead className="text-muted-foreground">ENTRADA</TableHead>
                  <TableHead className="text-muted-foreground">SALIDA</TableHead>
                  <TableHead className="text-muted-foreground">TAMANO</TableHead>
                  <TableHead className="text-muted-foreground">ESTADO</TableHead>
                  <TableHead className="text-muted-foreground">$ VALOR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron registros
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record) => (
                    <TableRow key={record.id} className="border-border">
                      <TableCell className="font-mono text-sm text-foreground">
                        {record.code}
                      </TableCell>
                      <TableCell className="text-foreground">{getLockerDisplay(record.lockerId)}</TableCell>
                      <TableCell className="text-foreground">{record.clientDocument}</TableCell>
                      <TableCell className="text-foreground">
                        {formatDateTime(record.entryTime)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {record.exitTime ? formatDateTime(record.exitTime) : '-'}
                      </TableCell>
                      <TableCell className="text-foreground">{getSizeLabel(record.size)}</TableCell>
                      <TableCell>
                        <span
                          className={
                            record.status === 'Activo'
                              ? 'text-primary font-medium'
                              : 'text-muted-foreground'
                          }
                        >
                          {record.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-foreground">
                        ${record.price.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <div>
              Mostrando {Math.min(filteredRecords.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} a {Math.min(filteredRecords.length, currentPage * ITEMS_PER_PAGE)} de {filteredRecords.length} registros
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || totalPages === 0}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
