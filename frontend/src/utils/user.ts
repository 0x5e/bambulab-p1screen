export type ServerRegion = 'china' | 'global'

export type CloudUserInfo = {
  accessToken: string
  account: string
  avatar?: string
  id?: string
  nickname?: string
  region: ServerRegion
  username: string
}

export const CLOUD_USER_STORAGE_KEY = 'user'

const normalizeCloudUser = (value: unknown): CloudUserInfo => {
  const data = value as Record<string, unknown>
  const region = data?.region === 'global' ? 'global' : 'china'

  return {
    accessToken: String(data?.accessToken ?? ''),
    account: String(data?.account ?? '').trim(),
    region,
    username: String(data?.username ?? '').trim(),
  }
}

export const getCloudUser = (): CloudUserInfo | null => {
  try {
    const raw = localStorage.getItem(CLOUD_USER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    const user = normalizeCloudUser(parsed)
    if (!user.accessToken || !user.account || !user.username) {
      return null
    }
    return user
  } catch {
    return null
  }
}

export const setCloudUser = (user: CloudUserInfo) => {
  localStorage.setItem(CLOUD_USER_STORAGE_KEY, JSON.stringify(normalizeCloudUser(user)))
}

export const removeCloudUser = () => {
  localStorage.removeItem(CLOUD_USER_STORAGE_KEY)
}

export const getCloudUserId = (username: string) => {
  const id = username.replace(/^u_/, '')
  return id || username
}

export const getCloudUserAvatarText = (user: CloudUserInfo) => {
  return (user.nickname || user.id || user.username || user.account).slice(0, 1).toUpperCase()
}
