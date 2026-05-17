import { PrinterClient } from '@bambulab-p1screen/printer-api'
import type { DeviceItem } from './utils/device'

export const client = new PrinterClient()

const createMqttUrl = (ip: string) => {
  const upstreamUrl = `mqtts://${ip}:8883`
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${wsProtocol}://${window.location.host}/mqtt?url=${encodeURIComponent(upstreamUrl)}`
}

export const connectPrinter = (device: DeviceItem) => {
  return client.connect({
    ip: device.ip,
    serial: device.serial,
    code: device.code,
    mqttUrl: createMqttUrl(device.ip),
  })
}
