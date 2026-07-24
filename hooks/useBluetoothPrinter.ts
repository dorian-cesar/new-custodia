import { useState, useEffect } from "react";
import { BleClient, type BleDevice } from "@capacitor-community/bluetooth-le";

export function useBluetoothPrinter() {
  const [isSupported, setIsSupported] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [device, setDevice] = useState<BleDevice | null>(null);
  const [serviceUuid, setServiceUuid] = useState<string | null>(null);
  const [characteristicUuid, setCharacteristicUuid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialise on mount
  useEffect(() => {
    const init = async () => {
      try {
        if (typeof window !== "undefined" && (window as any).Capacitor) {
          await BleClient.initialize();
          setIsSupported(true);
        }
      } catch (err: any) {
        console.error("BLE Initialization failed:", err);
      }
    };
    init();
  }, []);

  const connectAndFindWritable = async (deviceId: string) => {
    // Connect
    await BleClient.connect(deviceId, (disconnectedId) => {
      console.log("Disconnected from", disconnectedId);
      setIsConnected(false);
      setDevice(null);
      setServiceUuid(null);
      setCharacteristicUuid(null);
    });

    // Discover services
    const services = await BleClient.getServices(deviceId);
    
    // Find a characteristic that supports write or writeWithoutResponse
    let foundService: string | null = null;
    let foundChar: string | null = null;

    // Standard printing service UUIDs often used in thermal printers
    const knownPrinterServices = [
      "18f0", "ae30", "e7e1a102-277b-4bb0-88b1-090630756a7c", "49535343-fe7d-41aa-8fa6-a1943c5fc7eb"
    ];

    // First try standard printer service UUIDs
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

    // If not found, look for ANY service characteristic that supports write
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
      setServiceUuid(foundService);
      setCharacteristicUuid(foundChar);
      setIsConnected(true);
      setError(null);
      console.log(`Connected! Found Service: ${foundService}, Characteristic: ${foundChar}`);
      return true;
    } else {
      await BleClient.disconnect(deviceId);
      throw new Error("No writable characteristics found on this device.");
    }
  };

  const selectAndConnectPrinter = async () => {
    try {
      setError(null);
      // Scan for any device (using system dialog)
      const selectedDevice = await BleClient.requestDevice();
      setDevice(selectedDevice);
      await connectAndFindWritable(selectedDevice.deviceId);
    } catch (err: any) {
      console.error("BLE connection error:", err);
      setError(err.message || "Error al conectar con la impresora");
      setIsConnected(false);
      setDevice(null);
    }
  };

  const disconnectPrinter = async () => {
    if (device) {
      try {
        await BleClient.disconnect(device.deviceId);
      } catch (err) {
        console.error("Error disconnecting:", err);
      }
      setIsConnected(false);
      setDevice(null);
      setServiceUuid(null);
      setCharacteristicUuid(null);
    }
  };

  const printText = async (text: string) => {
    if (!isConnected || !device || !serviceUuid || !characteristicUuid) {
      throw new Error("No hay ninguna impresora conectada.");
    }

    // Convert text to CP858/ASCII bytes for receipt printer
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);

    // ESC/POS Initialization and cut commands
    // ESC @ (Init): 0x1b, 0x40
    // LF (Line feed): 0x0a
    // GS V 66 0 (Cut): 0x1d, 0x56, 0x42, 0x00
    const initCmd = new Uint8Array([0x1b, 0x40]);
    const cutCmd = new Uint8Array([0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00]);

    // Send Init
    await writeBytes(initCmd);

    // Send payload in chunks
    await writeBytes(bytes);

    // Send Cut
    await writeBytes(cutCmd);
  };

  const writeBytes = async (bytes: Uint8Array) => {
    if (!device || !serviceUuid || !characteristicUuid) return;
    
    // BLE typical MTU limit is 20-512 bytes. 20 is safest for generic low-end BLE printers
    const chunkSize = 20;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      const dataView = new DataView(chunk.buffer);
      await BleClient.write(
        device.deviceId,
        serviceUuid,
        characteristicUuid,
        dataView
      );
      // Tiny delay to let the printer process buffer
      await new Promise(r => setTimeout(r, 15));
    }
  };

  return {
    isSupported,
    isConnected,
    device,
    error,
    selectAndConnectPrinter,
    disconnectPrinter,
    printText,
  };
}
