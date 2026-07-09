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

// Access native plugin safely on client-side only (always null on web-only platform)
const getPrinterPlugin = () => {
  return null
}

export const printerService = {
  isNative(): boolean {
    return false
  },

  async getBluetoothDevices(): Promise<BluetoothDevice[]> {
    return []
  },

  async getUsbDevices(): Promise<string[]> {
    return []
  },

  async connectPrinter(address: string, mode: number): Promise<any> {
    throw new Error('Native printing is not available on Web platform')
  },

  async disconnectPrinter(): Promise<any> {
    return
  },

  async getPrinterStatus(): Promise<PrinterStatus> {
    return { connected: false, status: 'Plataforma web (Impresión del sistema)', address: '', mode: 0 }
  },

  async printTestTicket(): Promise<boolean> {
    return false
  },

  async printEntryTicket(
    record: any,
    sizeLabel: string,
    lockerDisplay: string,
    paymentMethod: string
  ): Promise<boolean> {
    return false
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
    return false
  },
}
