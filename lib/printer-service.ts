import { formatCurrency } from "./utils";

export interface BluetoothDevice {
  name: string;
  address: string;
}

export interface PrinterStatus {
  connected: boolean;
  status: string;
  address: string;
  mode: number;
}

// Module-level connection state
let connectedDeviceId: string | null = null;
let printerServiceUuid: string | null = null;
let printerCharacteristicUuid: string | null = null;
let connectionStatusText: string = "Sin conectar";

// Dynamic import helper to prevent SSR compilation errors in Next.js
const getBleClient = async () => {
  if (typeof window === "undefined" || !(window as any).Capacitor) {
    return null;
  }
  const { BleClient } = await import("@capacitor-community/bluetooth-le");
  return BleClient;
};

// Raw byte write utility using 20-byte packet chunking for BLE stability
const writeBytes = async (bytes: Uint8Array): Promise<boolean> => {
  if (!connectedDeviceId || !printerServiceUuid || !printerCharacteristicUuid) {
    return false;
  }
  const BleClient = await getBleClient();
  if (!BleClient) return false;

  try {
    const chunkSize = 20;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      const dataView = new DataView(chunk.buffer);
      await BleClient.write(
        connectedDeviceId,
        printerServiceUuid,
        printerCharacteristicUuid,
        dataView
      );
      // Wait 15ms to allow thermal printer buffer digestion
      await new Promise(r => setTimeout(r, 15));
    }
    return true;
  } catch (err) {
    console.error("Error writing to printer characteristic:", err);
    return false;
  }
};

const writeText = async (text: string): Promise<boolean> => {
  const encoder = new TextEncoder();
  return await writeBytes(encoder.encode(text));
};

// ESC/POS Command Constants
const ESC_INIT = new Uint8Array([0x1b, 0x40]);
const ESC_ALIGN_LEFT = new Uint8Array([0x1b, 0x61, 0x00]);
const ESC_ALIGN_CENTER = new Uint8Array([0x1b, 0x61, 0x01]);
const ESC_BOLD_ON = new Uint8Array([0x1b, 0x45, 0x01]);
const ESC_BOLD_OFF = new Uint8Array([0x1b, 0x45, 0x00]);
const ESC_DOUBLE_SIZE_ON = new Uint8Array([0x1d, 0x21, 0x11]);
const ESC_DOUBLE_SIZE_OFF = new Uint8Array([0x1d, 0x21, 0x00]);
const ESC_CUT = new Uint8Array([0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00]); // Feed 4 lines & cut

export const printerService = {
  isNative(): boolean {
    return typeof window !== "undefined" && !!(window as any).Capacitor;
  },

  async getBluetoothDevices(): Promise<BluetoothDevice[]> {
    if (!this.isNative()) return [];
    const BleClient = await getBleClient();
    if (!BleClient) return [];

    try {
      await BleClient.initialize();
      const devices: BluetoothDevice[] = [];
      const seen = new Set<string>();

      // Scan for any BLE devices for 4 seconds
      await BleClient.requestLEScan({}, (result) => {
        if (result.device && result.device.name) {
          if (!seen.has(result.device.deviceId)) {
            seen.add(result.device.deviceId);
            devices.push({
              name: result.device.name,
              address: result.device.deviceId,
            });
          }
        }
      });

      await new Promise((r) => setTimeout(r, 4000));
      await BleClient.stopLEScan();
      return devices;
    } catch (err: any) {
      console.error("BLE Scanning error:", err);
      throw new Error("No se pudo escanear: " + err.message);
    }
  },

  async getUsbDevices(): Promise<string[]> {
    // USB is not supported natively via BLE client
    return [];
  },

  async connectPrinter(address: string, mode: number): Promise<any> {
    if (!this.isNative()) {
      throw new Error("Impresión nativa no disponible en web.");
    }
    const BleClient = await getBleClient();
    if (!BleClient) {
      throw new Error("Plugin BLE no inicializado.");
    }

    try {
      connectionStatusText = "Conectando...";
      await BleClient.initialize();

      // Establish BLE connection
      await BleClient.connect(address, (disconnectedId) => {
        console.log("Disconnected from printer:", disconnectedId);
        connectedDeviceId = null;
        printerServiceUuid = null;
        printerCharacteristicUuid = null;
        connectionStatusText = "Desconectado";
      });

      connectedDeviceId = address;

      // Discover GATT services and characteristics
      const services = await BleClient.getServices(address);

      // Common custom write service/characteristic UUIDs for thermal printers
      const knownPrinterServices = [
        "18f0", "ae30", "e7e1a102-277b-4bb0-88b1-090630756a7c", "49535343-fe7d-41aa-8fa6-a1943c5fc7eb"
      ];

      let foundService: string | null = null;
      let foundChar: string | null = null;

      // Step 1: Look for known printing service UUIDs
      for (const service of services) {
        const sUuid = service.uuid.toLowerCase();
        const isKnown = knownPrinterServices.some(k => sUuid.includes(k));
        if (isKnown) {
          const char = service.characteristics.find(
            c => c.properties.write || c.properties.writeWithoutResponse
          );
          if (char) {
            foundService = service.uuid;
            foundChar = char.uuid;
            break;
          }
        }
      }

      // Step 2: Fallback to any characteristic that accepts write commands
      if (!foundChar) {
        for (const service of services) {
          const char = service.characteristics.find(
            c => c.properties.write || c.properties.writeWithoutResponse
          );
          if (char) {
            foundService = service.uuid;
            foundChar = char.uuid;
            break;
          }
        }
      }

      if (foundService && foundChar) {
        printerServiceUuid = foundService;
        printerCharacteristicUuid = foundChar;
        connectionStatusText = "Conectado";
        return { status: "Conectado" };
      } else {
        await BleClient.disconnect(address);
        connectedDeviceId = null;
        connectionStatusText = "Imposible escribir";
        throw new Error("No se encontró una característica de escritura disponible.");
      }
    } catch (err: any) {
      connectedDeviceId = null;
      printerServiceUuid = null;
      printerCharacteristicUuid = null;
      connectionStatusText = "Error de conexión";
      console.error("BLE Connect failed:", err);
      throw err;
    }
  },

  async disconnectPrinter(): Promise<any> {
    if (connectedDeviceId) {
      const BleClient = await getBleClient();
      if (BleClient) {
        try {
          await BleClient.disconnect(connectedDeviceId);
        } catch (err) {
          console.error("Disconnect call error:", err);
        }
      }
    }
    connectedDeviceId = null;
    printerServiceUuid = null;
    printerCharacteristicUuid = null;
    connectionStatusText = "Sin conectar";
  },

  async getPrinterStatus(): Promise<PrinterStatus> {
    return {
      connected: !!connectedDeviceId,
      status: this.isNative() ? connectionStatusText : "Plataforma web (Impresión del sistema)",
      address: connectedDeviceId || "",
      mode: 0, // Always BLE mode (0)
    };
  },

  async printTestTicket(): Promise<boolean> {
    if (!connectedDeviceId) return false;
    try {
      await writeBytes(ESC_INIT);
      await writeBytes(ESC_ALIGN_CENTER);
      await writeBytes(ESC_DOUBLE_SIZE_ON);
      await writeText("NODO CUSTODIA\n");
      await writeBytes(ESC_DOUBLE_SIZE_OFF);
      await writeText("==============================\n");
      await writeBytes(ESC_ALIGN_LEFT);
      await writeText("Este es un ticket de prueba\nde impresion Bluetooth.\n");
      await writeText(`Fecha: ${new Date().toLocaleString()}\n`);
      await writeBytes(ESC_ALIGN_CENTER);
      await writeText("==============================\n");
      await writeText("¡Conectado exitosamente!\n");
      await writeBytes(ESC_CUT);
      return true;
    } catch (err) {
      console.error("Test print error:", err);
      return false;
    }
  },

  async printEntryTicket(
    record: any,
    sizeLabel: string,
    lockerDisplay: string,
    paymentMethod: string,
  ): Promise<boolean> {
    console.log("printerService: printEntryTicket called with", { record, sizeLabel, lockerDisplay, paymentMethod, connectedDeviceId });
    if (!connectedDeviceId) {
      console.warn("printerService: printEntryTicket failed - connectedDeviceId is null!");
      return false;
    }
    try {
      const formattedDate = new Date(record.entryTime).toLocaleString("es-PY");
      
      await writeBytes(ESC_INIT);
      await writeBytes(ESC_ALIGN_CENTER);
      await writeBytes(ESC_DOUBLE_SIZE_ON);
      await writeBytes(ESC_BOLD_ON);
      await writeText("NODO CUSTODIA\n");
      await writeBytes(ESC_DOUBLE_SIZE_OFF);
      await writeBytes(ESC_BOLD_OFF);
      await writeText("--------------------------------\n");
      await writeBytes(ESC_BOLD_ON);
      await writeText("TICKET DE INGRESO\n");
      await writeBytes(ESC_BOLD_OFF);
      await writeText("--------------------------------\n\n");
      
      await writeBytes(ESC_ALIGN_LEFT);
      await writeText(`CODIGO:      ${record.code}\n`);
      await writeText(`DOCUMENTO:   ${record.clientDocument}\n`);
      await writeText(`CASILLERO:   ${lockerDisplay} (${sizeLabel})\n`);
      await writeText(`FECHA ENTR.: ${formattedDate}\n`);
      await writeText(`PAGO INGR.:  ${paymentMethod}\n`);
      await writeBytes(ESC_BOLD_ON);
      await writeText(`TOTAL PAGADO:${formatCurrency(record.price)}\n\n`);
      await writeBytes(ESC_BOLD_OFF);

      await writeBytes(ESC_ALIGN_CENTER);
      await writeText("--------------------------------\n");
      await writeText("Guarde este ticket para\nretirar su equipaje.\n");
      await writeText("¡Muchas gracias!\n");
      await writeBytes(ESC_CUT);
      return true;
    } catch (err) {
      console.error("Entry print error:", err);
      return false;
    }
  },

  async printDeliveryTicket(
    record: any,
    sizeLabel: string,
    lockerDisplay: string,
    paymentMethod: string,
    extraHours: number,
    extraAmount: number,
    extraFolio?: number | null,
  ): Promise<boolean> {
    console.log("printerService: printDeliveryTicket called with", { record, sizeLabel, lockerDisplay, paymentMethod, extraHours, extraAmount, extraFolio, connectedDeviceId });
    if (!connectedDeviceId) {
      console.warn("printerService: printDeliveryTicket failed - connectedDeviceId is null!");
      return false;
    }
    try {
      const entryDate = new Date(record.entryTime).toLocaleString("es-PY");
      const exitDate = new Date().toLocaleString("es-PY");
      
      await writeBytes(ESC_INIT);
      await writeBytes(ESC_ALIGN_CENTER);
      await writeBytes(ESC_DOUBLE_SIZE_ON);
      await writeBytes(ESC_BOLD_ON);
      await writeText("NODO CUSTODIA\n");
      await writeBytes(ESC_DOUBLE_SIZE_OFF);
      await writeBytes(ESC_BOLD_OFF);
      await writeText("--------------------------------\n");
      await writeBytes(ESC_BOLD_ON);
      await writeText("COMPROBANTE DE RETIRO\n");
      await writeBytes(ESC_BOLD_OFF);
      await writeText("--------------------------------\n\n");
      
      await writeBytes(ESC_ALIGN_LEFT);
      await writeText(`CODIGO:      ${record.code}\n`);
      await writeText(`DOCUMENTO:   ${record.clientDocument}\n`);
      await writeText(`CASILLERO:   ${lockerDisplay} (${sizeLabel})\n`);
      await writeText(`FECHA ENTR.: ${entryDate}\n`);
      await writeText(`FECHA SAL.:  ${exitDate}\n`);
      
      if (extraHours > 0) {
        await writeText(`HRS EXTRAS:  ${Math.ceil(extraHours)} hrs\n`);
        await writeText(`PAGO EXTRA:  ${paymentMethod}\n`);
        if (extraFolio) {
          await writeText(`FOLIO BOLETA:${extraFolio}\n`);
        }
        await writeBytes(ESC_BOLD_ON);
        await writeText(`RECARGO:     ${formatCurrency(extraAmount)}\n`);
        await writeBytes(ESC_BOLD_OFF);
      } else {
        await writeText("SIN CARGOS ADICIONALES\n");
      }
      await writeText("\n");

      await writeBytes(ESC_ALIGN_CENTER);
      await writeText("--------------------------------\n");
      await writeText("Equipaje retirado a conformidad\n");
      await writeText("¡Gracias por su visita!\n");
      await writeBytes(ESC_CUT);
      return true;
    } catch (err) {
      console.error("Delivery print error:", err);
      return false;
    }
  },

  async printClosureTicket(data: any): Promise<boolean> {
    if (!connectedDeviceId) return false;
    try {
      const openedStr = new Date(data.openedAt).toLocaleString("es-PY");
      const closedStr = new Date(data.closedAt).toLocaleString("es-PY");
      
      await writeBytes(ESC_INIT);
      await writeBytes(ESC_ALIGN_CENTER);
      await writeBytes(ESC_DOUBLE_SIZE_ON);
      await writeBytes(ESC_BOLD_ON);
      await writeText("NODO CUSTODIA\n");
      await writeBytes(ESC_DOUBLE_SIZE_OFF);
      await writeBytes(ESC_BOLD_OFF);
      await writeText("--------------------------------\n");
      await writeBytes(ESC_BOLD_ON);
      await writeText("CIERRE DE CAJA\n");
      await writeBytes(ESC_BOLD_OFF);
      await writeText("--------------------------------\n\n");
      
      await writeBytes(ESC_ALIGN_LEFT);
      await writeText(`CAJERO:      ${data.cajero}\n`);
      await writeText(`SUPERVISOR:  ${data.supervisor}\n`);
      await writeText(`APERTURA:    ${openedStr}\n`);
      await writeText(`CIERRE:      ${closedStr}\n`);
      await writeText("--------------------------------\n");
      
      await writeText(`MONTO APERT.:${formatCurrency(data.openingAmount)}\n`);
      await writeText(`INGR. EFECT.:${formatCurrency(data.ingresosEfectivo)}\n`);
      await writeText(`INGR. TARJ.: ${formatCurrency(data.ingresosTarjeta)}\n`);
      await writeText(`EGRESOS EF.: ${formatCurrency(data.gastosEfectivo)}\n`);
      await writeText("--------------------------------\n");
      
      await writeBytes(ESC_BOLD_ON);
      await writeText(`SALDO ESP.:  ${formatCurrency(data.expectedAmount)}\n`);
      await writeText(`SALDO DECL.: ${formatCurrency(data.declaredAmount)}\n`);
      
      const diff = data.difference;
      if (diff === 0) {
        await writeText("DIFERENCIA:  CAJA CUADRADA\n");
      } else if (diff > 0) {
        await writeText(`DIFERENCIA:  +${formatCurrency(diff)} (SOBRANTE)\n`);
      } else {
        await writeText(`DIFERENCIA:  -${formatCurrency(Math.abs(diff))} (FALTANTE)\n`);
      }
      await writeBytes(ESC_BOLD_OFF);
      
      if (data.notes) {
        await writeText(`\nNOTAS:\n${data.notes}\n`);
      }
      
      if (data.withdrawals && data.withdrawals.length > 0) {
        await writeText("\nRETIROS DE CAJA:\n");
        for (const w of data.withdrawals) {
          const wTime = new Date(w.timestamp).toLocaleTimeString("es-PY");
          await writeText(`- [${wTime}] ${formatCurrency(w.amount)}\n  Motivo: ${w.description}\n`);
        }
      }
      
      await writeText("\n");
      await writeBytes(ESC_ALIGN_CENTER);
      await writeText("--------------------------------\n");
      await writeText("Firma Cajero      Firma Superv.\n\n\n\n");
      await writeBytes(ESC_CUT);
      return true;
    } catch (err) {
      console.error("Closure print error:", err);
      return false;
    }
  },

  async printWithdrawalTicket(
    amount: number,
    cajero: string,
    supervisor: string,
    reason: string,
    timestamp: string,
  ): Promise<boolean> {
    if (!connectedDeviceId) return false;
    try {
      const timeStr = new Date(timestamp).toLocaleString("es-PY");
      
      await writeBytes(ESC_INIT);
      await writeBytes(ESC_ALIGN_CENTER);
      await writeBytes(ESC_DOUBLE_SIZE_ON);
      await writeBytes(ESC_BOLD_ON);
      await writeText("NODO CUSTODIA\n");
      await writeBytes(ESC_DOUBLE_SIZE_OFF);
      await writeBytes(ESC_BOLD_OFF);
      await writeText("--------------------------------\n");
      await writeBytes(ESC_BOLD_ON);
      await writeText("VALE DE RETIRO DE CAJA\n");
      await writeBytes(ESC_BOLD_OFF);
      await writeText("--------------------------------\n\n");
      
      await writeBytes(ESC_ALIGN_LEFT);
      await writeText(`FECHA/HORA:  ${timeStr}\n`);
      await writeText(`CAJERO:      ${cajero}\n`);
      await writeText(`SUPERVISOR:  ${supervisor}\n`);
      await writeBytes(ESC_BOLD_ON);
      await writeText(`MONTO RET.:  ${formatCurrency(amount)}\n\n`);
      await writeBytes(ESC_BOLD_OFF);
      await writeText(`MOTIVO:\n${reason}\n\n`);
      
      await writeBytes(ESC_ALIGN_CENTER);
      await writeText("--------------------------------\n");
      await writeText("Firma Cajero      Firma Superv.\n\n\n\n");
      await writeBytes(ESC_CUT);
      return true;
    } catch (err) {
      console.error("Withdrawal print error:", err);
      return false;
    }
  },

  async printTransbankVoucher(data: any): Promise<boolean> {
    if (!connectedDeviceId) return false;
    try {
      const formatTimestamp = (ts: string) => {
        if (/^\d{8}\s\d{6}$/.test(ts)) {
          const day = ts.substring(0, 2);
          const month = ts.substring(2, 4);
          const year = ts.substring(4, 8);
          const hour = ts.substring(9, 11);
          const min = ts.substring(11, 13);
          const sec = ts.substring(13, 15);
          return `${day}-${month}-${year} ${hour}:${min}:${sec}`;
        }
        return ts;
      };

      const printTime = data.timestamp 
        ? formatTimestamp(data.timestamp) 
        : new Date().toLocaleString("es-PY");

      await writeBytes(ESC_INIT);
      await writeBytes(ESC_ALIGN_CENTER);
      await writeBytes(ESC_BOLD_ON);
      await writeText("COMPROBANTE DE PAGO\n");
      await writeText("TRANSBANK POS\n");
      await writeBytes(ESC_BOLD_OFF);
      await writeText("--------------------------------\n\n");
      
      await writeBytes(ESC_ALIGN_LEFT);
      await writeText(`Comercio:    Custodia Equipaje\n`);
      await writeText(`Ticket/Doc:  ${data.ticketNumber}\n`);
      await writeText(`Fecha/Hora:  ${printTime}\n`);
      await writeText("--------------------------------\n");
      await writeText(`N° Operacion:${data.operationNumber}\n`);
      await writeText(`Cod. Autoriz:${data.authorizationCode}\n`);
      await writeText("--------------------------------\n\n");
      
      await writeBytes(ESC_ALIGN_RIGHT);
      await writeBytes(ESC_BOLD_ON);
      await writeText(`TOTAL: ${formatCurrency(data.amount)}\n\n`);
      await writeBytes(ESC_BOLD_OFF);
      
      await writeBytes(ESC_ALIGN_CENTER);
      await writeBytes(ESC_BOLD_ON);
      await writeText("TRANSACCION APROBADA\n");
      await writeBytes(ESC_BOLD_OFF);
      await writeText("Copia Cliente\n");
      await writeBytes(ESC_CUT);
      return true;
    } catch (err) {
      console.error("Voucher print error:", err);
      return false;
    }
  },
};
