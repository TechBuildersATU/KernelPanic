import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom has no canvas; the code rain and other canvas effects are covered by Playwright.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null })

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
