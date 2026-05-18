export type DeviceSource = 'cloud' | 'lan'

export type DeviceItem = {
  name: string
  ip: string
  serial: string
  code: string
  from: DeviceSource
}

export const DEVICE_STORAGE_KEY = 'device'
export const CURRENT_DEVICE_KEY = 'current_device'

const normalizeDevice = (value: unknown): DeviceItem => ({
  name: String((value as Record<string, unknown>)?.name ?? '').trim(),
  ip: String((value as Record<string, unknown>)?.ip ?? '').trim(),
  serial: String((value as Record<string, unknown>)?.serial ?? '').trim(),
  code: String((value as Record<string, unknown>)?.code ?? '').trim(),
  from: (value as Record<string, unknown>)?.from === 'cloud' ? 'cloud' : 'lan',
})

const writeDevices = (devices: DeviceItem[]) => {
  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(devices))
}

export const getDevices = (): DeviceItem[] => {
  try {
    const raw = localStorage.getItem(DEVICE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter(item => item && typeof item === 'object').map(normalizeDevice)
    }
    if (parsed && typeof parsed === 'object') {
      return [normalizeDevice(parsed)]
    }
    return []
  } catch {
    return []
  }
}

export const addDevice = (device: DeviceItem) => {
  const next = normalizeDevice(device)
  const devices = getDevices()
  const index = devices.findIndex(item => item.serial === next.serial)
  if (index >= 0) {
    devices[index] = next
  } else {
    devices.push(next)
  }
  writeDevices(devices)
}

export const removeDevice = (serial: string) => {
  const next = getDevices().filter(item => item.serial !== serial)
  writeDevices(next)
}

export const getCurrentDevice = (): DeviceItem | null => {
  const devices = getDevices()
  if (devices.length === 0) return null

  const currentSerial = localStorage.getItem(CURRENT_DEVICE_KEY) ?? ''
  if (!currentSerial) {
    return devices[0]
  }
  return devices.find(item => item.serial === currentSerial) ?? devices[0]
}

export const setCurrentDevice = (serial: string) => {
  localStorage.setItem(CURRENT_DEVICE_KEY, serial)
}
