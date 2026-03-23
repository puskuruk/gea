import { Store } from '@geajs/core'

const CACHE_NAME = 'gea-api'

export class FetchStore<T = unknown> extends Store {
  data: T | null = null
  error: string | null = null
  isLoading = false
  isFromCache = false

  async fetch(url: string, options?: RequestInit): Promise<T> {
    this.isLoading = true
    this.error = null
    try {
      const request = new Request(url, options)
      const response = await fetch(request)
      const cloned = response.clone()
      const result: T = await response.json()
      this.data = result
      this.isFromCache = false
      const cache = await caches.open(CACHE_NAME)
      await cache.put(request, cloned)
      return result
    } catch (err) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cache = await caches.open(CACHE_NAME)
        const cached = await cache.match(url)
        if (cached) {
          const result: T = await cached.json()
          this.data = result
          this.isFromCache = true
          return result
        }
      }
      this.error = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      this.isLoading = false
    }
  }
}
