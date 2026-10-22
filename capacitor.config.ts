import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lfonline.game',
  appName: 'LF Online',
  webDir: 'packages/client/dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0a0a0c',
      showSpinner: false,
    },
  },
};

export default config;
