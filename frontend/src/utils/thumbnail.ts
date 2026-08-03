const thumbnailUrlCache = new Map<string, string>()

export const getCachedThumbnailUrl = (key: string) => thumbnailUrlCache.get(key) ?? ''

export const setCachedThumbnailUrl = (key: string, url: string) => {
  thumbnailUrlCache.set(key, url)
}
