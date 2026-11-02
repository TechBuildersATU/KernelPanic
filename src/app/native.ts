import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/** Running inside the APK (Capacitor), not in a browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Inside the APK: the Android back button must never close the game at the booth. With a
 * listener in place Capacitor no longer exits on back; the press is simply ignored.
 */
export function setupNativeApp(): void {
  if (!Capacitor.isNativePlatform()) return
  void App.addListener('backButton', () => {})
}
