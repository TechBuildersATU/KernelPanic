import { flushSync } from 'react-dom'

let latest = 0

/**
 * Switches screens with a cross-fade: the old screen dissolves as a picture while the new one
 * rises live on top of the world, which keeps running underneath (View Transitions, styled in
 * fx.css). The screen layer only gets its transition name during a switch — a named element is
 * isolated, and the result transition's blend layers must see the world through it.
 * Without the API (old WebView, jsdom) the screen simply changes.
 */
export function switchScreen(update: () => void): void {
  if (
    typeof document.startViewTransition !== 'function' ||
    document.visibilityState !== 'visible'
  ) {
    update()
    return
  }
  const id = ++latest
  const root = document.documentElement
  root.dataset.switching = ''
  const transition = document.startViewTransition(() => flushSync(update))
  const quiet = () => {}
  transition.ready.catch(quiet)
  transition.updateCallbackDone.catch(quiet)
  transition.finished.catch(quiet).finally(() => {
    if (id === latest) delete root.dataset.switching
  })
}
