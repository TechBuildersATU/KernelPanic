import { useEffect, useEffectEvent } from 'react'
import { CloseIcon, QrIcon } from './icons'
import s from './SocialDialog.module.css'

export const SOCIAL_URL = 'linktr.ee/atutechbuilders'
/** The club's Linktree QR (from the club folder, Desktop/Kulüp). */
export const SOCIAL_QR_SRC = '/social/linktree-qr.png'
/** A dialog nobody closes goes away by itself (the booth must not stay stuck on it). */
const AUTO_CLOSE_MS = 45_000

/** "Bizi takip edin": the club's Linktree QR over the room. A tap outside closes it. */
export function SocialDialog({ onClose }: { onClose: () => void }) {
  const close = useEffectEvent(onClose)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    const id = window.setTimeout(() => close(), AUTO_CLOSE_MS)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(id)
    }
  }, [])

  return (
    <div
      className={s.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Sosyal medya hesaplarımız"
      data-testid="social-dialog"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={s.box}>
        <button
          type="button"
          className={s.close}
          aria-label="Kapat"
          data-testid="social-close"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        <p className={s.eyebrow}>
          <QrIcon />
          ATÜ TECHBUILDERS · SOSYAL MEDYA
        </p>
        <h2 className={s.title}>Bizi takip edin!</h2>
        <p className={s.lead}>Telefonunun kamerasıyla okut: bütün hesaplarımız tek bağlantıda.</p>
        <div className={s.qr}>
          <img src={SOCIAL_QR_SRC} alt={`${SOCIAL_URL} QR kodu`} data-testid="social-qr" />
        </div>
        <p className={s.url}>{SOCIAL_URL}</p>
      </div>
    </div>
  )
}
