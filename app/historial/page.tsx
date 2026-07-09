'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { History, Search, Filter, Ruler, Printer } from 'lucide-react'
import { Header } from '@/components/custody/header'
import { Ticket } from '@/components/custody/ticket'
import { Button } from '@/components/ui/button'
import { printerService } from '@/lib/printer-service'
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
  const { records, lockers, lockerSizes, cashTransactions } = useCustodyStore()
  const [mounted, setMounted] = useState(false)
  const [searchDocument, setSearchDocument] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSize, setFilterSize] = useState<string>('all')

  const ticketRef = useRef<HTMLDivElement>(null)
  const [recordToPrint, setRecordToPrint] = useState<any>(null)
  const [paymentMethodToPrint, setPaymentMethodToPrint] = useState<string>('Efectivo')

  const handlePrintAction = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: 'Reimpresion_Ticket',
  })

  useEffect(() => {
    if (recordToPrint) {
      if (printerService.isNative()) {
        const sizeLabel = lockerSizes.find((s) => s.value === recordToPrint.size)?.label || recordToPrint.size
        const locker = lockers.find((l) => l.id === recordToPrint.lockerId)
        const lockerDisplay = locker ? `${locker.col}${locker.row}` : recordToPrint.lockerId.toString()
        printerService.printEntryTicket(recordToPrint, sizeLabel, lockerDisplay, paymentMethodToPrint)
        setRecordToPrint(null)
      } else {
        // Pequeño delay para asegurar que el componente Ticket y el SVG terminen de renderizar
        const timer = setTimeout(() => {
          handlePrintAction()
          setRecordToPrint(null)
        }, 300)
        return () => clearTimeout(timer)
      }
    }
  }, [recordToPrint, handlePrintAction, lockers, lockerSizes, paymentMethodToPrint])

  const triggerReprint = (record: any, paymentMethod: string) => {
    setPaymentMethodToPrint(paymentMethod)
    setRecordToPrint(record)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  const filteredRecords = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    return records.filter((record) => {
      // Limit history to the last 30 days
      const matchesDate = new Date(record.entryTime).getTime() >= thirtyDaysAgo
      if (!matchesDate) return false

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
    return locker ? `${locker.col}${locker.row}` : lockerId
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
    <div className="min-h-screen bg-zinc-100 flex flex-col items-center py-3 lg:py-4 px-4 lg:overflow-hidden">
      <div className="w-full max-w-[960px] lg:max-w-[1330px] lg:h-[calc(100vh-32px)] bg-[#d7d7d8] border border-zinc-400 shadow-xl rounded-lg overflow-hidden flex flex-col pb-4">
        <Header showBack />

        <main className="flex-1 flex flex-col gap-4 p-6 min-h-0">
          <div className="bg-[#242424] text-white py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-md flex items-center gap-2">
            <History className="h-4 w-4" />
            <span>Historial de Casilleros (Últimos 30 Días)</span>
          </div>

          {/* Filters */}
          <div className="space-y-4 mb-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs text-zinc-700 font-bold uppercase tracking-wide">
                  <Search className="h-3 w-3" />
                  Buscar por Documento
                </Label>
                <Input
                  value={searchDocument}
                  onChange={(e) => setSearchDocument(e.target.value)}
                  placeholder="RUT / DNI / Pasaporte"
                  className="bg-white border border-zinc-300 text-zinc-900 font-semibold focus-visible:ring-[#242424]"
                />
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs text-zinc-700 font-bold uppercase tracking-wide">
                  <Filter className="h-3 w-3" />
                  Estado
                </Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-white border border-zinc-300 text-zinc-900 font-bold focus-visible:ring-[#242424] w-full">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-zinc-900 font-semibold">
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Entregado">Entregado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs text-zinc-700 font-bold uppercase tracking-wide">
                  <Ruler className="h-3 w-3" />
                  Tamaño
                </Label>
                <Select value={filterSize} onValueChange={setFilterSize}>
                  <SelectTrigger className="bg-white border border-zinc-300 text-zinc-900 font-bold focus-visible:ring-[#242424] w-full">
                    <SelectValue placeholder="Todas las tallas" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-zinc-900 font-semibold">
                    <SelectItem value="all">Todas las tallas</SelectItem>
                    {lockerSizes.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleSearch} 
                className="w-full sm:w-auto px-6 bg-[#242424] hover:bg-zinc-800 text-white font-bold h-9 text-xs uppercase"
              >
                <Search className="h-3.5 w-3.5 mr-2" />
                Buscar
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 flex flex-col min-h-0 border border-zinc-300 rounded-xl shadow-sm bg-white overflow-hidden">
            <div className="flex-1 overflow-y-auto min-h-0">
              <Table>
                <TableHeader className="bg-[#242424] hover:bg-[#242424] sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">CÓDIGO / RUT</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10"># CASILLERO</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">RUT/DNI</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">ENTRADA</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">SALIDA</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">TAMAÑO</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">PAGO</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">ESTADO</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10">$ VALOR</TableHead>
                    <TableHead className="text-white font-extrabold uppercase tracking-wider text-xs h-10 text-center">ACCIÓN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-zinc-500 font-semibold">
                        No se encontraron registros
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRecords.map((record) => {
                      // Obtener la transaccion de pago si es que ya existe
                      const txs = cashTransactions?.filter(t => t.recordId === record.id) || []
                      let paymentStr = '-'
                      if (txs.length > 0) {
                        const methods = new Set<string>()
                        txs.forEach(t => {
                          if (t.description.includes('Efectivo')) methods.add('Efectivo')
                          if (t.description.includes('Tarjeta')) methods.add('Tarjeta')
                        })
                        if (methods.size > 0) {
                          paymentStr = Array.from(methods).join(' / ')
                        }
                      }

                      return (
                        <TableRow key={record.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                          <TableCell className="font-mono font-bold text-xs py-3 text-[#242424]">
                            {record.code}
                          </TableCell>
                          <TableCell className="text-zinc-800 font-semibold text-xs py-3">{getLockerDisplay(record.lockerId)}</TableCell>
                          <TableCell className="text-zinc-800 font-semibold text-xs py-3">{record.clientDocument}</TableCell>
                          <TableCell className="text-zinc-800 text-xs py-3">
                            {formatDateTime(record.entryTime)}
                          </TableCell>
                          <TableCell className="text-zinc-800 text-xs py-3">
                            {record.exitTime ? formatDateTime(record.exitTime) : '-'}
                          </TableCell>
                          <TableCell className="text-zinc-800 font-bold text-xs py-3">{getSizeLabel(record.size)}</TableCell>
                          <TableCell className="py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              paymentStr.includes('Efectivo') ? 'bg-amber-500/10 text-amber-600' :
                              paymentStr.includes('Tarjeta') ? 'bg-blue-500/10 text-blue-600' :
                              'bg-zinc-100 text-zinc-500'
                            }`}>
                              {paymentStr}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <span
                              className={`text-xs font-bold uppercase ${
                                record.status === 'Activo'
                                  ? 'text-[#0a354c]'
                                  : 'text-zinc-500'
                              }`}
                            >
                              {record.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-zinc-800 font-black text-xs py-3">
                            $ {record.price.toLocaleString('es-CL')}
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => triggerReprint(record, paymentStr.includes('Tarjeta') ? 'Tarjeta' : 'Efectivo')}
                              className="h-7 w-7 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-full border border-zinc-200"
                              title="Reimprimir Ticket"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 text-xs text-zinc-500 border-t border-zinc-200 bg-zinc-50/50 font-semibold">
                <div>
                  Mostrando {Math.min(filteredRecords.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} a {Math.min(filteredRecords.length, currentPage * ITEMS_PER_PAGE)} de {filteredRecords.length} registros
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-7 text-[10px] bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 font-bold"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || totalPages === 0}
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

      {/* Hidden ticket for printing */}
      <Ticket record={recordToPrint} paymentMethod={paymentMethodToPrint} ref={ticketRef} />
    </div>
  )
}
