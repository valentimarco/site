import type { NuxtApp } from '#app'

const CACHE_TTL = 1000 * 60 * 60 // 1 hour (GitHub API rate limit)

export function getCachedData(key: string, nuxtApp: NuxtApp) {
  let data = nuxtApp.payload.data[key] || nuxtApp.static.data[key]
  if (!data) {
    if (!import.meta.client) return
    const item = localStorage.getItem(`cache:${key}`)
    if (item) {
      try {
        data = JSON.parse(item)
        if (!data) return
      }
      catch (error) {
        console.error(error)
        return
      }
    }
    else return
  }

  const expirationDate = new Date(data.fetchedAt)
  expirationDate.setTime(expirationDate.getTime() + CACHE_TTL)
  const isExpired = expirationDate.getTime() < Date.now()
  if (isExpired) {
    if (import.meta.client) localStorage.removeItem(`cache:${key}`)
    return
  }

  return data
}

export function setCachedData<T>(key: string, data: T): T & { fetchedAt: Date } {
  const res = { ...data, fetchedAt: new Date() }
  if (import.meta.client) localStorage.setItem(`cache:${key}`, JSON.stringify(res))
  return res
}
