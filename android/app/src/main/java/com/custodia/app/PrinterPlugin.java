package com.custodia.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import net.posprinter.posprinterface.IMyBinder;
import net.posprinter.posprinterface.ProcessData;
import net.posprinter.posprinterface.UiExecute;
import net.posprinter.service.PosprinterService;
import net.posprinter.utils.DataForSendToPrinterPos80;
import net.posprinter.utils.PosPrinterDev;

import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(
    name = "PrinterPlugin",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            }
        )
    }
)
public class PrinterPlugin extends Plugin {
    private static final String TAG = "PrinterPlugin";
    public static IMyBinder binder = null;
    private boolean printerConnected = false;
    private String printerStatus = "Sin conectar";
    private String printerAddress = "";
    private int printerMode = 0; // 0: BT, 1: USB, 2: NET

    private final ServiceConnection printerConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            binder = (IMyBinder) service;
            Log.d(TAG, "Printer Service Connected");
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            binder = null;
            printerConnected = false;
            printerStatus = "Servicio desconectado";
            Log.d(TAG, "Printer Service Disconnected");
        }
    };

    @Override
    public void load() {
        super.load();
        try {
            Intent intent = new Intent(getContext(), PosprinterService.class);
            getContext().bindService(intent, printerConnection, Context.BIND_AUTO_CREATE);
            Log.d(TAG, "Binding PosprinterService");
        } catch (Exception e) {
            Log.e(TAG, "Error binding printer service: " + e.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        try {
            if (binder != null && printerConnected) {
                binder.disconnectCurrentPort(new UiExecute() {
                    @Override
                    public void onsucess() {}
                    @Override
                    public void onfailed() {}
                });
            }
            getContext().unbindService(printerConnection);
        } catch (Exception e) {
            Log.e(TAG, "Error unbinding printer service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getBluetoothDevices(PluginCall call) {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            call.reject("Bluetooth no disponible en este dispositivo");
            return;
        }

        if (!adapter.isEnabled()) {
            call.reject("El Bluetooth está desactivado");
            return;
        }

        try {
            Set<BluetoothDevice> bondedDevices = adapter.getBondedDevices();
            JSArray devices = new JSArray();
            if (bondedDevices != null) {
                for (BluetoothDevice device : bondedDevices) {
                    JSObject devObj = new JSObject();
                    devObj.put("name", device.getName() != null ? device.getName() : "Dispositivo desconocido");
                    devObj.put("address", device.getAddress());
                    devices.put(devObj);
                }
            }
            JSObject result = new JSObject();
            result.put("devices", devices);
            call.resolve(result);
        } catch (SecurityException e) {
            call.reject("Permiso de Bluetooth no concedido", e);
        }
    }

    @PluginMethod
    public void getUsbDevices(PluginCall call) {
        try {
            List<String> usbPaths = PosPrinterDev.GetUsbPathNames(getContext());
            JSArray devices = new JSArray();
            if (usbPaths != null) {
                for (String path : usbPaths) {
                    devices.put(path);
                }
            }
            JSObject result = new JSObject();
            result.put("devices", devices);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error al listar dispositivos USB: " + e.getMessage());
        }
    }

    @PluginMethod
    public void connectPrinter(PluginCall call) {
        if (binder == null) {
            call.reject("El servicio de impresora no está disponible");
            return;
        }

        final String address = call.getString("address");
        final Integer mode = call.getInt("mode", 0); // 0: BT, 1: USB, 2: NET

        if (address == null || address.trim().isEmpty()) {
            call.reject("Dirección de la impresora requerida");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                UiExecute execute = new UiExecute() {
                    @Override
                    public void onsucess() {
                        printerConnected = true;
                        printerAddress = address;
                        printerMode = mode;
                        printerStatus = (mode == 0 ? "BT: " : (mode == 1 ? "USB: " : "NET: ")) + address;
                        
                        // Register listener to detect disconnects
                        binder.acceptdatafromprinter(new UiExecute() {
                            @Override
                            public void onsucess() {}
                            @Override
                            public void onfailed() {
                                printerConnected = false;
                                printerStatus = "Impresora desconectada";
                            }
                        });
                        
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("status", printerStatus);
                        call.resolve(ret);
                    }

                    @Override
                    public void onfailed() {
                        printerConnected = false;
                        printerStatus = "Fallo de conexión";
                        call.reject("Fallo al conectar con la impresora en " + address);
                    }
                };

                if (mode == 0) { // BT
                    binder.connectBtPort(address, execute);
                } else if (mode == 1) { // USB
                    binder.connectUsbPort(getContext(), address, execute);
                } else { // NET
                    binder.connectNetPort(address, 9100, execute);
                }
            } catch (Exception e) {
                call.reject("Excepción al conectar: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void disconnectPrinter(PluginCall call) {
        if (binder == null) {
            call.reject("Servicio no disponible");
            return;
        }

        getActivity().runOnUiThread(() -> {
            binder.disconnectCurrentPort(new UiExecute() {
                @Override
                public void onsucess() {
                    printerConnected = false;
                    printerStatus = "Sin conectar";
                    printerAddress = "";
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                }

                @Override
                public void onfailed() {
                    call.reject("Fallo al desconectar la impresora");
                }
            });
        });
    }

    @PluginMethod
    public void getPrinterStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("connected", printerConnected);
        ret.put("status", printerStatus);
        ret.put("address", printerAddress);
        ret.put("mode", printerMode);
        call.resolve(ret);
    }

    @PluginMethod
    public void printTicket(PluginCall call) {
        if (binder == null || !printerConnected) {
            call.reject("Impresora no conectada");
            return;
        }

        final String header = call.getString("header", "CUSTODIA DE EQUIPAJE");
        final String title = call.getString("title", "INGRESO");
        final JSArray linesArray = call.getArray("lines");
        final String barcode = call.getString("barcode");

        final List<String> lines = new ArrayList<>();
        if (linesArray != null) {
            try {
                for (int i = 0; i < linesArray.length(); i++) {
                    lines.add(linesArray.getString(i));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error parsing lines: " + e.getMessage());
            }
        }

        getActivity().runOnUiThread(() -> {
            binder.writeDataByYouself(new UiExecute() {
                @Override
                public void onsucess() {
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                }

                @Override
                public void onfailed() {
                    call.reject("Fallo al imprimir ticket");
                }
            }, new ProcessData() {
                @Override
                public List<byte[]> processDataBeforeSend() {
                    ArrayList<byte[]> data = new ArrayList<>();
                    data.add(DataForSendToPrinterPos80.initializePrinter());
                    data.add(DataForSendToPrinterPos80.selectAlignment(1)); // Center
                    data.add(DataForSendToPrinterPos80.selectOrCancelBoldModel(1)); // Bold
                    data.add(bytes(header + "\n"));
                    data.add(bytes(title + "\n"));
                    data.add(DataForSendToPrinterPos80.selectOrCancelBoldModel(0)); // Regular
                    data.add(DataForSendToPrinterPos80.selectAlignment(0)); // Left
                    data.add(bytes("--------------------------------\n"));
                    
                    for (String line : lines) {
                        data.add(bytes(line + "\n"));
                    }
                    data.add(bytes("--------------------------------\n"));
                    
                    if (barcode != null && !barcode.trim().isEmpty()) {
                        data.add(DataForSendToPrinterPos80.selectAlignment(1)); // Center
                        data.add(DataForSendToPrinterPos80.setBarcodeWidth(2));
                        data.add(DataForSendToPrinterPos80.setBarcodeHeight(90));
                        data.add(DataForSendToPrinterPos80.selectHRICharacterPrintPosition(2)); // Underneath
                        
                        String cleanedBarcode = barcode.replaceAll("[^A-Za-z0-9]", "");
                        if (cleanedBarcode.isEmpty()) cleanedBarcode = "CUSTODIA";
                        
                        data.add(DataForSendToPrinterPos80.printBarcode(73, cleanedBarcode.length(), cleanedBarcode));
                        data.add(DataForSendToPrinterPos80.printAndFeedLine());
                        data.add(DataForSendToPrinterPos80.printAndFeedLine());
                    }
                    
                    data.add(DataForSendToPrinterPos80.printAndFeed(8));
                    data.add(DataForSendToPrinterPos80.selectCutPagerModerAndCutPager(66, 1)); // Cut paper
                    return data;
                }
            });
        });
    }

    private byte[] bytes(String value) {
        try {
            return value.getBytes("GBK");
        } catch (UnsupportedEncodingException e) {
            return value.getBytes();
        }
    }
}
