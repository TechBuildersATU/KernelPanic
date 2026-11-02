// Fonts are bundled locally (no internet at the booth). latin + latin-ext cover Turkish.
import '@fontsource/chakra-petch/latin-500.css'
import '@fontsource/chakra-petch/latin-ext-500.css'
import '@fontsource/chakra-petch/latin-600.css'
import '@fontsource/chakra-petch/latin-ext-600.css'
import '@fontsource/chakra-petch/latin-700.css'
import '@fontsource/chakra-petch/latin-ext-700.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-ext-500.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import '@fontsource/jetbrains-mono/latin-ext-700.css'
import '@fontsource/orbitron/latin-700.css'
import '@fontsource/orbitron/latin-900.css'
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { setupNativeApp } from './app/native'
import { watchFrameRate } from './app/perf'
import { getTestFlags } from './app/testFlags'
import { unlockOnFirstTouch } from './audio/engine'

setupNativeApp()
// any first touch unlocks audio, so the menu music can start before the eye is pressed
unlockOnFirstTouch()
// a slow tablet gets lighter background motion (app/perf.ts)
watchFrameRate(getTestFlags().lowPerf)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
