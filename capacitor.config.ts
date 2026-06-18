import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.custodia.app',
  appName: 'Custodia',
  webDir: 'out',
  server: {
    url: 'https://new-custodia-py.netlify.app',
    cleartext: true
  }
};

export default config;
