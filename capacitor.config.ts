import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.copom.rioverde',
  appName: 'COPOM Rio Verde',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#1e3a8a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      splashScreenDelay: 500
    },
    Network: {
      // Plugin de detecção de rede para modo offline
    },
    LocalNotifications: {
      smallIcon: "ic_stat_notification",
      iconColor: "#1e3a8a",
      sound: "notification_sound.wav",
    }
  }
};

export default config;