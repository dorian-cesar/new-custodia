import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.custodia.py',
  appName: 'custodia-py',
  webDir: 'out',
  server: {
    url: 'https://custodia-py.netlify.app',
    cleartext: true
  }
};

export default config;
