import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.custodia.app',
  appName: 'Custodia',
  webDir: 'out',
  server: {
    // Cambie esta URL por la IP de su servidor Next.js local en desarrollo
    // o por la URL del servidor de producción (ej. https://su-dominio.com)
    // para que las Server Actions de la base de datos funcionen en el Webview.
    url: 'http://10.126.71.95:3000', 
    cleartext: true
  },
  plugins: {
    // Configuración adicional de plugins si es requerida
  }
};

export default config;
