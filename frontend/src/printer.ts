import { PrinterClient } from '@bambulab-p1screen/printer-api'
import type { DeviceRecord } from './utils/device'
import type { ServerRegion } from './utils/user'
import { getCloudUser } from './utils/user'

export const client = new PrinterClient()

export const CLOUD_MQTT_BROKERS: Record<ServerRegion, string> = {
  china: 'cn.mqtt.bambulab.com',
  global: 'us.mqtt.bambulab.com',
}

export const CLOUD_BASE_URLS: Record<ServerRegion, string> = {
  china: 'api.bambulab.cn',
  global: 'api.bambulab.com',
}

export const createMqttUrl = (host: string) => {
  const upstreamUrl = `mqtts://${host}:8883`
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${wsProtocol}://${window.location.host}/tls?url=${encodeURIComponent(upstreamUrl)}`
}

export const createFtpUrl = (host: string) => {
  const upstreamUrl = `tls://${host}:990`
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${wsProtocol}://${window.location.host}/tls?url=${encodeURIComponent(upstreamUrl)}`
}

export const createApiUrl = (host: string) => {
  return `/api/https/${host}`
}

export const getPrinterConnectionMode = () => {
  if (!client.mqttClient?.connected || !client.connectOptions) return ''
  return client.connectOptions.username === 'bblp' ? 'local' : 'cloud'
}

export const connectPrinter = (device: DeviceRecord) => {
  if (device.connect === 'cloud' && device.from !== 'local') {
    const user = getCloudUser()
    const region = device.from === 'global' ? 'global' : 'china'
    return client.connect({
      mqttUrl: createMqttUrl(CLOUD_MQTT_BROKERS[region]),
      username: user?.username ?? '',
      password: user?.accessToken ?? '',
      serial: device.serial,
    })
  }

  return client.connect({
    mqttUrl: createMqttUrl(device.ip),
    username: 'bblp',
    password: device.code,
    serial: device.serial,
  })
}
