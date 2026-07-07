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

  async getBluetoothDevices(): Promise<BluetoothDevice[]> {
    const plugin = getPrinterPlugin()
    if (!plugin) return []
    try {
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
      `Pagado (${paymentMethod}): Gs. ${record.price.toLocaleString('es-CL')}`,
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
      `Base Pagada: Gs. ${record.price.toLocaleString('es-CL')}`
    )

    if (extraAmount > 0) {
      lines.push(
        `Hrs Extra: ${extraHours.toFixed(2)}`,
        `Recargo: Gs. ${extraAmount.toLocaleString('es-CL')}`
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
}
