const THUMBNAIL_URLS_STORAGE_KEY = 'thumbnail_urls'

const readCache = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(THUMBNAIL_URLS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {}
  } catch {
    return {}
  }
}

export const getCachedThumbnailUrl = (key: string) => readCache()[key] ?? ''

export const setCachedThumbnailUrl = (key: string, url: string) => {
  try {
    const cache = readCache()
    cache[key] = url
    localStorage.setItem(THUMBNAIL_URLS_STORAGE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.warn(`[thumbnail] failed to persist cache: ${error}`)
  }
}
