import type { CapacitorConfig } from '@capacitor/cli'

// Android app (APK) around the same web build: `npm run apk` (scripts/build-apk.mjs).
const config: CapacitorConfig = {
  appId: 'com.atutechbuilders.kernelpanic',
  appName: 'KERNEL PANIC',
  webDir: 'dist',
  android: {
    // the booth tablet may have no internet: nothing is loaded from outside the app
    allowMixedContent: false,
    backgroundColor: '#090E1D',
  },
  plugins: {
    // MainActivity hides the system bars itself and the stage scales to fit, so Capacitor's
    // safe-area handling stays off (it also logged errors while injecting its CSS)
    SystemBars: { insetsHandling: 'disable' },
  },
}

export default config
