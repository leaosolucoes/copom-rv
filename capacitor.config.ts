import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.668e639ddc0b4b7aab49c9f19cc751b2',
  appName: 'rio-verde-sossego-denuncias',
  webDir: 'dist',
  server: {
    url: 'https://668e639d-dc0b-4b7a-ab49-c9f19cc751b2.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#16a34a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff'
    }
  }
};

export default config;