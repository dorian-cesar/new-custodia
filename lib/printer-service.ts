import { Capacitor } from '@capacitor/core'

export interface BluetoothDevice {
  name: string
  address: string
}

export interface PrinterStatus {
  connected: boolean
  status: string
  address: string
  mode: number
}

// Access native plugin safely on client-side only
const getPrinterPlugin = () => {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    return (Capacitor as any).Plugins.PrinterPlugin
  }
  return null
}

export const printerService = {
  isNative(): boolean {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform()
  },

  async checkAndRequestBluetoothPermission(): Promise<boolean> {
    const plugin = getPrinterPlugin()
    if (!plugin) return true
    try {
      if (typeof plugin.checkPermissions === 'function') {
        const check = await plugin.checkPermissions()
        if (check.bluetooth === 'granted') {
          return true
        }
        if (typeof plugin.requestPermissions === 'function') {
          const req = await plugin.requestPermissions()
          return req.bluetooth === 'granted'
        }
      }
      return false
    } catch (err) {
      console.warn('Fallo al verificar/solicitar permisos de Bluetooth:', err)
      return true // Continuar por si acaso el plugin maneja internamente la llamada
    }
  },

  async getBluetoothDevices(): Promise<BluetoothDevice[]> {
    const plugin = getPrinterPlugin()
    if (!plugin) return []
    try {
      const hasPermission = await this.checkAndRequestBluetoothPermission()
      if (!hasPermission) {
        throw new Error('Permisos de Bluetooth no concedidos')
      }
      const res = await plugin.getBluetoothDevices()
      return res.devices || []
    } catch (err) {
      console.error('getBluetoothDevices failed:', err)
      throw err
    }
  },

  async getUsbDevices(): Promise<string[]> {
    const plugin = getPrinterPlugin()
    if (!plugin) return []
    try {
      const res = await plugin.getUsbDevices()
      return res.devices || []
    } catch (err) {
      console.error('getUsbDevices failed:', err)
      throw err
    }
  },

  async connectPrinter(address: string, mode: number): Promise<any> {
    const plugin = getPrinterPlugin()
    if (!plugin) throw new Error('Capacitor native platform not available')
    
    if (mode === 0) { // Bluetooth
      const hasPermission = await this.checkAndRequestBluetoothPermission()
      if (!hasPermission) {
        throw new Error('Permisos de Bluetooth no concedidos para conectar')
      }
    }
    
    return await plugin.connectPrinter({ address, mode })
  },

  async disconnectPrinter(): Promise<any> {
    const plugin = getPrinterPlugin()
    if (!plugin) return
    return await plugin.disconnectPrinter()
  },

  async getPrinterStatus(): Promise<PrinterStatus> {
    const plugin = getPrinterPlugin()
    if (!plugin) {
      return { connected: false, status: 'Plataforma web (Impresión del sistema)', address: '', mode: 0 }
    }
    try {
      return await plugin.getPrinterStatus()
    } catch (err) {
      return { connected: false, status: 'Error al obtener estado', address: '', mode: 0 }
    }
  },

  async printTestTicket(): Promise<boolean> {
    const plugin = getPrinterPlugin()
    if (!plugin) return false
    try {
      const dateStr = new Date().toLocaleString('es-CL')
      await plugin.printTicket({
        header: 'CUSTODIA TERMINAL SUR',
        title: 'PRUEBA DE IMPRESION',
        lines: [
          'Impresora operativa',
          `Fecha: ${dateStr}`,
          'Capacitor Android Plugin listo.',
        ],
        barcode: 'PRUEBA123456',
      })
      return true
    } catch (err) {
      console.error('Test print failed:', err)
      return false
    }
  },

  async printEntryTicket(
    record: any,
    sizeLabel: string,
    lockerDisplay: string,
    paymentMethod: string
  ): Promise<boolean> {
    const plugin = getPrinterPlugin()
    if (!plugin) return false

    const dateStr = new Date(record.entryTime).toLocaleString('es-CL')
    const lines = [
      `Entrada: ${dateStr}`,
      `Cliente: ${record.clientDocument}`,
      `Tipo: ${sizeLabel}`,
      `Casillero: ${lockerDisplay}`,
    ]

    if (record.folio) {
      // Add electronica folio details at the top of lines
      lines.unshift(
        'BOLETA ELECTRÓNICA',
        `FOLIO N° ${record.folio}`,
        '--------------------------------'
      )
    }

    lines.push(
      '--------------------------------',
      `Pagado (${paymentMethod}): $${record.price.toLocaleString('es-CL')}`,
      'Guarde este ticket para retiro'
    )

    try {
      await plugin.printTicket({
        header: 'CUSTODIA DE EQUIPAJE',
        title: 'INGRESO',
        lines: lines,
        barcode: record.code,
      })
      return true
    } catch (err) {
      console.error('Print entry ticket failed:', err)
      return false
    }
  },

  async printDeliveryTicket(
    record: any,
    sizeLabel: string,
    lockerDisplay: string,
    paymentMethod: string,
    extraHours: number,
    extraAmount: number,
    extraFolio?: number | null
  ): Promise<boolean> {
    const plugin = getPrinterPlugin()
    if (!plugin) return false

    const entryStr = new Date(record.entryTime).toLocaleString('es-CL')
    const exitStr = new Date().toLocaleString('es-CL')

    const lines = [
      `Entrada: ${entryStr}`,
      `Salida: ${exitStr}`,
      `Cliente: ${record.clientDocument}`,
      `Código: ${record.code}`,
      `Tipo: ${sizeLabel}`,
      `Casillero: ${lockerDisplay}`,
      `Medio de Pago: ${paymentMethod}`,
    ]

    if (extraFolio) {
      lines.unshift(
        'BOLETA ELECTRÓNICA',
        `FOLIO RECARGO N° ${extraFolio}`,
        '--------------------------------'
      )
    }

    lines.push(
      '--------------------------------',
      `Base Pagada: $${record.price.toLocaleString('es-CL')}`
    )

    if (extraAmount > 0) {
      lines.push(
        `Hrs Extra: ${extraHours.toFixed(2)}`,
        `Recargo: $${extraAmount.toLocaleString('es-CL')}`
      )
    }

    lines.push(
      '--------------------------------',
      '¡Gracias por su preferencia!'
    )

    try {
      await plugin.printTicket({
        header: 'RETIRO DE EQUIPAJE',
        title: 'RETIRO',
        lines: lines,
        barcode: null, // No barcode on exit ticket
      })
      return true
    } catch (err) {
      console.error('Print delivery ticket failed:', err)
      return false
    }
  },

  async printWithdrawalTicket(
    amount: number,
    cajero: string,
    supervisor: string,
    reason: string,
    timestamp: string
  ): Promise<boolean> {
    const plugin = getPrinterPlugin()
    if (!plugin) return false

    const dateStr = new Date(timestamp).toLocaleString('es-CL')
    const lines = [
      'COMPROBANTE DE RETIRO',
      '--------------------------------',
      `Fecha: ${dateStr}`,
      `Cajero: ${cajero}`,
      `Supervisor: ${supervisor}`,
      `Motivo: ${reason || 'Retiro de caja'}`,
      '--------------------------------',
      `MONTO RETIRADO: $${amount.toLocaleString('es-CL')}`,
      '--------------------------------',
      '\n\n',
      'Firma Cajero    Firma Supervisor',
      '\n\n',
    ]

    try {
      await plugin.printTicket({
        header: 'CUSTODIA TERMINAL SUR',
        title: 'RETIRO DE EFECTIVO',
        lines: lines,
        barcode: null,
      })
      return true
    } catch (err) {
      console.error('Print withdrawal ticket failed:', err)
      return false
    }
  },

  async printClosureTicket(data: any): Promise<boolean> {
    const plugin = getPrinterPlugin()
    if (!plugin) return false

    const openStr = new Date(data.openedAt).toLocaleString('es-CL')
    const closeStr = new Date(data.closedAt).toLocaleString('es-CL')
    
    const diffText = data.difference === 0 
      ? 'CUADRADA ✓' 
      : data.difference > 0 
        ? `SOBRANTE: +$${data.difference.toLocaleString('es-CL')}` 
        : `FALTANTE: -$${Math.abs(data.difference).toLocaleString('es-CL')}`

    const lines = [
      'COMPROBANTE DE CIERRE DE CAJA',
      '--------------------------------',
      `Cajero: ${data.cajero}`,
      `Apertura: ${openStr}`,
      `Cierre: ${closeStr}`,
      '--------------------------------',
      `Monto Inicial: $${data.openingAmount.toLocaleString('es-CL')}`,
      `Ventas Efectivo: $${data.salesCash.toLocaleString('es-CL')}`,
      `Ventas Tarjeta: $${data.salesCard.toLocaleString('es-CL')}`,
      `Retiros: -$${data.withdrawals.toLocaleString('es-CL')}`,
      '--------------------------------',
      `Monto Esperado: $${data.expectedAmount.toLocaleString('es-CL')}`,
      `Monto Declarado: $${data.declaredAmount.toLocaleString('es-CL')}`,
      `Diferencia: ${diffText}`,
      '--------------------------------',
      `Observaciones: ${data.notes || 'Ninguna'}`,
      '--------------------------------',
      '\n\n',
      'Firma Cajero    Firma Supervisor',
      '\n\n',
    ]

    try {
      await plugin.printTicket({
        header: 'CUSTODIA TERMINAL SUR',
        title: 'CIERRE DE CAJA (ARQUEO)',
        lines: lines,
        barcode: null,
      })
      return true
    } catch (err) {
      console.error('Print closure ticket failed:', err)
      return false
    }
  },
}
