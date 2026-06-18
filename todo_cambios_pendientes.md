# Cambios Pendientes por Aplicar (custodiaTerminalSur -> paraguay)

A continuación se detalla la lista de cambios pendientes de la rama `custodiaTerminalSur` que deben ser incorporados en la rama `paraguay` manteniendo la localización de Paraguay (Guaraníes, Cédula/RUC y sin redondeo).

## Componentes UI y Vistas

- [x] **components/custody/locker-selection.tsx**
  - [x] Reemplazar el menú desplegable (Select) de tamaños de equipaje por la cuadrícula visual de botones con íconos para cada tamaño (S, M, L, XL, XXL).
  - [x] Asegurar que el precio se muestre en Guaraníes con el formato: `Gs. {precio.toLocaleString('es-PY')}`.
  - [x] Mantener la etiqueta `Cédula / RUC` y el placeholder `Ej: 1234567 o 80012345-1`.

- [x] **components/custody/client-registration.tsx**
  - [x] Integrar el formateo dinámico de texto para el vuelto y los montos de efectivo recibidos utilizando `.toLocaleString('es-PY')` y `.replace(/\D/g, '')`.
  - [x] Ocultar la sección del medio de pago en el modal de salida si el recargo es 0.
  - [x] Simplificar la propiedad `disabled` del botón de entrega para que dependa únicamente de `isProcessingCard`.
  - [x] Aumentar el ancho máximo del modal de múltiples registros para que sea responsivo (`sm:max-w-[850px] w-[95vw]`).
  - [x] Mantener la localización en español (es-PY) para fechas y la etiqueta `Cédula / RUC`.

- [x] **components/custody/ticket.tsx**
  - [x] Cambiar la referencia del código de barras a un elemento `<img>` en lugar de `<svg>` para compatibilidad con navegadores/spoolers Android.
  - [x] Ajustar los estilos del ticket para tener un ancho de `100%` con un `max-width` de `58mm` para evitar colapsos.
  - [x] Mantener la moneda en Guaraníes (`Gs.`) y el formateo `es-PY`. No incluir el bloque de Boleta Electrónica/Folios.

- [x] **components/custody/delivery-ticket.tsx**
  - [x] Eliminar el código de barras en el ticket de retiro.
  - [x] Ajustar el diseño a un ancho fluido (`maxWidth: '58mm'`, `width: '100%'`).
  - [x] Mantener la moneda en Guaraníes (`Gs.`) y el formateo `es-PY`. No incluir folios de recargo.

- [x] **app/historial/page.tsx**
  - [x] Implementar paginación local de registros (15 registros por página).
  - [x] Agregar la columna de Método de Pago (`PAGO`) al listado de registros.
  - [x] Incorporar el botón con ícono de impresora para la acción de reimpresión de tickets en la tabla.
  - [x] Mantener las etiquetas `Cédula / RUC`, `Gs. VALOR`, `es-PY` y la búsqueda por Cédula.

- [x] **app/caja/page.tsx**
  - [x] Integrar el diálogo para realizar "Retiro de Caja" (Giro) que requiere autorización con credenciales de Supervisor.
  - [x] Añadir el diálogo de confirmación de cierre de caja con resumen de montos esperados y declarados.
  - [x] Modificar los inputs numéricos de montos para que sean de tipo texto y apliquen formato en tiempo real con separadores de miles de Paraguay (`es-PY`).
  - [x] Mostrar el desglose de ventas diferenciando ingresos en Efectivo e ingresos con Tarjeta.

- [x] **app/admin/page.tsx**
  - [x] Implementar la paginación local de registros de caja.
  - [x] Incorporar la visualización de la diferencia de caja (cuadrada, faltante o sobrante) en el listado histórico de arqueos.
  - [x] Añadir los botones y modales para la creación (`createPrice`) y eliminación (`deletePrice`) de tarifas de casilleros, además de la edición existente.
  - [x] Formatear todos los valores de moneda a Guaraníes (`Gs.`) usando `.toLocaleString('es-PY')`.

---

## Lógica y Estado de la Aplicación

- [x] **lib/custody-store.ts**
  - [x] Incorporar `ingresosEfectivo` e `ingresosTarjeta` al estado e interfaz de estadísticas del turno actual.
  - [x] En `getCurrentRegisterStats` y `closeCashRegister`, separar las sumatorias de transacciones por tipo de pago (efectivo y tarjeta) sin aplicar la ley de redondeo chileno (`Math.round`).
  - [x] Mantener la creación de registros y entregas sin interactuar con la API de boletas electrónicas de Chile (`sendBoleta`).

- [x] **app/actions/db-actions.ts**
  - [x] Modificar `updatePrice` para que el parámetro `newLabel` sea opcional.
  - [x] Agregar las funciones `createPrice` y `deletePrice` para interactuar con el modelo de base de datos de precios.

---

## Configuración y Plataforma Móvil (Capacitor)

- [x] **package.json & package-lock.json**
  - [x] Agregar las dependencias de Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`).
  - [x] Añadir los scripts móviles (`cap:sync`, `cap:open`, `apk:build`).

- [x] **Configuraciones Nativas & Plugins**
  - [x] Integrar el archivo de configuración `capacitor.config.ts`.
  - [x] Añadir la carpeta del proyecto Android nativo `android/` que contiene las integraciones del SDK de la impresora Bluetooth (`PrinterPlugin.java`, `MainActivity.java`, etc.).
  - [x] Crear el servicio `lib/printer-service.ts` para interactuar con el plugin nativo.
  - [x] Agregar el APK de Android compilado (como custodia-paraguay.apk) si es necesario.
