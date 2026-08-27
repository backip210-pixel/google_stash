import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.stashphotos',
  appName: 'Stash Photos',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: false,
        data: [
          {
            scheme: 'stashphotos',
            host: 'auth',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: {
    CapacitorBrowser: {
      // Allow the browser to handle the OAuth redirect
    },
  },
};

export default config;
