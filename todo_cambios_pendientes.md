# Cambios Pendientes por Aplicar (custodiaTerminalSur -> paraguay)

A continuación se detalla la lista de cambios pendientes de la rama `custodiaTerminalSur` que deben ser incorporados en la rama `paraguay` manteniendo la localización de Paraguay (Guaraníes, Cédula/RUC y sin redondeo).

## Componentes UI y Vistas

- [ ] **components/custody/locker-selection.tsx**
  - [ ] Reemplazar el menú desplegable (Select) de tamaños de equipaje por la cuadrícula visual de botones con íconos para cada tamaño (S, M, L, XL, XXL).
  - [ ] Asegurar que el precio se muestre en Guaraníes con el formato: `Gs. {precio.toLocaleString('es-PY')}`.
  - [ ] Mantener la etiqueta `Cédula / RUC` y el placeholder `Ej: 1234567 o 80012345-1`.

- [ ] **components/custody/client-registration.tsx**
  - [ ] Integrar el formateo dinámico de texto para el vuelto y los montos de efectivo recibidos utilizando `.toLocaleString('es-PY')` y `.replace(/\D/g, '')`.
  - [ ] Ocultar la sección del medio de pago en el modal de salida si el recargo es 0.
  - [ ] Simplificar la propiedad `disabled` del botón de entrega para que dependa únicamente de `isProcessingCard`.
  - [ ] Aumentar el ancho máximo del modal de múltiples registros para que sea responsivo (`sm:max-w-[850px] w-[95vw]`).
  - [ ] Mantener la localización en español (es-PY) para fechas y la etiqueta `Cédula / RUC`.

- [ ] **components/custody/ticket.tsx**
  - [ ] Cambiar la referencia del código de barras a un elemento `<img>` en lugar de `<svg>` para compatibilidad con navegadores/spoolers Android.
  - [ ] Ajustar los estilos del ticket para tener un ancho de `100%` con un `max-width` de `58mm` para evitar colapsos.
  - [ ] Mantener la moneda en Guaraníes (`Gs.`) y el formateo `es-PY`. No incluir el bloque de Boleta Electrónica/Folios.

- [ ] **components/custody/delivery-ticket.tsx**
  - [ ] Eliminar el código de barras en el ticket de retiro.
  - [ ] Ajustar el diseño a un ancho fluido (`maxWidth: '58mm'`, `width: '100%'`).
  - [ ] Mantener la moneda en Guaraníes (`Gs.`) y el formateo `es-PY`. No incluir folios de recargo.

- [ ] **app/historial/page.tsx**
  - [ ] Implementar paginación local de registros (15 registros por página).
  - [ ] Agregar la columna de Método de Pago (`PAGO`) al listado de registros.
  - [ ] Incorporar el botón con ícono de impresora para la acción de reimpresión de tickets en la tabla.
  - [ ] Mantener las etiquetas `Cédula / RUC`, `Gs. VALOR`, `es-PY` y la búsqueda por Cédula.

- [ ] **app/caja/page.tsx**
  - [ ] Integrar el diálogo para realizar "Retiro de Caja" (Giro) que requiere autorización con credenciales de Supervisor.
  - [ ] Añadir el diálogo de confirmación de cierre de caja con resumen de montos esperados y declarados.
  - [ ] Modificar los inputs numéricos de montos para que sean de tipo texto y apliquen formato en tiempo real con separadores de miles de Paraguay (`es-PY`).
  - [ ] Mostrar el desglose de ventas diferenciando ingresos en Efectivo e ingresos con Tarjeta.

- [ ] **app/admin/page.tsx**
  - [ ] Implementar la paginación local de registros de caja.
  - [ ] Incorporar la visualización de la diferencia de caja (cuadrada, faltante o sobrante) en el listado histórico de arqueos.
  - [ ] Añadir los botones y modales para la creación (`createPrice`) y eliminación (`deletePrice`) de tarifas de casilleros, además de la edición existente.
  - [ ] Formatear todos los valores de moneda a Guaraníes (`Gs.`) usando `.toLocaleString('es-PY')`.

---

## Lógica y Estado de la Aplicación

- [ ] **lib/custody-store.ts**
  - [ ] Incorporar `ingresosEfectivo` e `ingresosTarjeta` al estado e interfaz de estadísticas del turno actual.
  - [ ] En `getCurrentRegisterStats` y `closeCashRegister`, separar las sumatorias de transacciones por tipo de pago (efectivo y tarjeta) sin aplicar la ley de redondeo chileno (`Math.round`).
  - [ ] Mantener la creación de registros y entregas sin interactuar con la API de boletas electrónicas de Chile (`sendBoleta`).

- [ ] **app/actions/db-actions.ts**
  - [ ] Modificar `updatePrice` para que el parámetro `newLabel` sea opcional.
  - [ ] Agregar las funciones `createPrice` y `deletePrice` para interactuar con el modelo de base de datos de precios.

---

## Configuración y Plataforma Móvil (Capacitor)

- [ ] **package.json & package-lock.json**
  - [ ] Agregar las dependencias de Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`).
  - [ ] Añadir los scripts móviles (`cap:sync`, `cap:open`, `apk:build`).

- [ ] **Configuraciones Nativas & Plugins**
  - [ ] Integrar el archivo de configuración `capacitor.config.ts`.
  - [ ] Añadir la carpeta del proyecto Android nativo `android/` que contiene las integraciones del SDK de la impresora Bluetooth (`PrinterPlugin.java`, `MainActivity.java`, etc.).
  - [ ] Crear el servicio `lib/printer-service.ts` para interactuar con el plugin nativo.
  - [ ] Agregar el APK de Android compilado (`custodia-terminal-sur.apk`) si es necesario.
