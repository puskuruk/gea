import { Store } from '@geajs/core'

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  }
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export class PwaStore extends Store {
  isOnline = false
  isInstallable = false
  isInstalled = false
  hasUpdate = false
  registrationError: string | null = null

  _deferredPrompt: BeforeInstallPromptEvent | null = null
  _registration: ServiceWorkerRegistration | null = null

  constructor() {
    super()
    if (typeof window === 'undefined') return

    this.isOnline = navigator.onLine
    this.isInstalled = window.matchMedia('(display-mode: standalone)').matches

    window.addEventListener('online', () => {
      this.isOnline = true
    })
    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this._deferredPrompt = e
      this.isInstallable = true
    })

    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      this.isInstalled = e.matches
    })
  }

  async promptInstall(): Promise<boolean> {
    if (!this._deferredPrompt) return false
    this._deferredPrompt.prompt()
    const { outcome } = await this._deferredPrompt.userChoice
    this._deferredPrompt = null
    this.isInstallable = false
    return outcome === 'accepted'
  }

  applyUpdate(): void {
    const waiting = this._registration?.waiting
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' })
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          window.location.reload()
        },
        { once: true }
      )
    }
  }

  register(swUrl = '/sw.js'): void {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        this._registration = reg
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.hasUpdate = true
            }
          })
        })
      })
      .catch((err) => {
        this.registrationError = err instanceof Error ? err.message : String(err)
      })
  }
}
