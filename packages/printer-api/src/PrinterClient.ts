import mqtt, { type MqttClient } from 'mqtt'
import ipaddr from 'ipaddr.js'
import { type DeviceState } from './device'
import {
  FanType,
  TemperatureType,
  LightType,
  PrintSpeedLevel,
} from './enums'

export enum PrinterEvent {
  MQTT_STATE_CHANGE = 'mqtt.state_change',
  PRINT_PUSH_STATUS = 'print.push_status',
  PRINT_PROJECT_FILE = 'print.project_file',
}

export type PrinterClientConnectOptions = {
  mqttUrl: string
  username: string
  password: string
  serial: string
}

export class PrinterClient {
  private sequenceId = 0
  private reportTopic = ''
  private requestTopic = ''
  private readonly pendingPublishes = new Map<string, {
    resolve: (value: any) => void
    reject: (reason?: any) => void
  }>()
  private listeners: Record<string, ((params: any) => void)[]> = {}

  mqttClient: MqttClient | null = null
  lastError: Error | null = null
  device: DeviceState = {}

  on(event: PrinterEvent, callback: (params: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  off(event: PrinterEvent, callback: (params: any) => void) {
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
  }

  private emit(event: PrinterEvent, params: any) {
    if (!this.listeners[event]) return
    this.listeners[event].forEach(cb => cb(params))
  }

  /**
   * Opens an MQTT-over-WebSocket connection to the backend tunnel.
   * @param mqttUrl MQTT-over-WebSocket backend tunnel URL.
   * @param username MQTT username.
   * @param password MQTT password.
   * @param serial Printer serial number.
   * @returns The MQTT client instance when connection is initiated, otherwise null.
   */
  connect({ mqttUrl, username, password, serial }: PrinterClientConnectOptions) {
    console.info(`[PrintClient] connect to: ${mqttUrl}, username: ${username}, serial: ${serial}`)
    if (typeof window === 'undefined') return null

    if (!mqttUrl || !username || !password || !serial) {
      console.warn('[PrintClient] missing connection parameters')
      return null
    }
    this.stopConnection('recreate connection')
    this.reportTopic = `device/${serial}/report`
    this.requestTopic = `device/${serial}/request`
    this.device.print = undefined
    this.device.module = undefined

    try {
      const mqttClient = mqtt.connect(mqttUrl, {
        username,
        password,
        protocolVersion: 4,
        reconnectPeriod: 5000,
        reconnectOnConnackError: true,
      })
      this.mqttClient = mqttClient
      mqttClient.on('connect', this.onConnect.bind(this))
      mqttClient.on('reconnect', this.onReconnect.bind(this))
      mqttClient.on('offline', this.onOffline.bind(this))
      mqttClient.on('close', this.onClose.bind(this))
      mqttClient.on('end', this.onEnd.bind(this))
      mqttClient.on('error', this.onError.bind(this))
      mqttClient.on('message', this.onMessage.bind(this))
      return mqttClient
    } catch (error: any) {
      console.error(`[PrintClient] connect failed: ${error.message}`)
      this.stopConnection('connect failed')
      return null
    }
  }

  /**
   * Closes the current connection and disables auto-reconnect.
   * @returns No return value.
   */
  disconnect() {
    this.stopConnection('manual disconnect')
  }

  /**
   * Returns the printer LAN IPv4 address reported by `print.net.info`.
   * Bambu stores the address as a little-endian uint32.
   * @returns A dotted-decimal IPv4 string, or an empty string when unavailable.
   */
  getLocalIPAddress() {
    const ip = this.device.print?.net?.info?.find(item => item.ip)?.ip
    if (typeof ip !== 'number' || !Number.isInteger(ip) || ip <= 0 || ip > 0xFFFFFFFF) return ''
    return ipaddr.fromByteArray([
      ip & 0xFF,
      (ip >>> 8) & 0xFF,
      (ip >>> 16) & 0xFF,
      (ip >>> 24) & 0xFF,
    ]).toString()
  }

  private stopConnection(reason: string) {
    if (this.mqttClient) {
      this.mqttClient.removeAllListeners()
      this.mqttClient.end(true)
    }
    this.mqttClient = null
    this.reportTopic = ''
    this.requestTopic = ''
    this.device.print = undefined
    this.device.module = undefined
    this.rejectPendingPublishes(reason)
    this.emit(PrinterEvent.MQTT_STATE_CHANGE, null)
  }

  private async onConnect() {
    this.lastError = null
    console.log('[PrintClient] connected')
    const topic = this.reportTopic
    if (!this.mqttClient || !topic) return
    try {
      console.log(`[PrintClient] subscribe topic: ${topic}`)
      await this.mqttClient.subscribeAsync(topic)
    } catch (err: any) {
      console.error(`[PrintClient] subscribe failed: ${err.message}`)
      this.stopConnection('subscribe failed')
      return
    }

    this.updateAllData().catch((err: any) => {
      console.warn(`[PrintClient] initial data sync failed: ${err.message}`)
    }).then(() => {
      this.emit(PrinterEvent.MQTT_STATE_CHANGE, null)
    })
  }

  private onClose() {
    console.log('[PrintClient] closed')
    this.rejectPendingPublishes('socket closed')
    this.emit(PrinterEvent.MQTT_STATE_CHANGE, null)
  }

  private onReconnect() {
    console.warn('[PrintClient] reconnecting...')
    this.emit(PrinterEvent.MQTT_STATE_CHANGE, null)
  }

  private onOffline() {
    console.warn('[PrintClient] offline')
    this.emit(PrinterEvent.MQTT_STATE_CHANGE, null)
  }

  private onEnd() {
    console.log('[PrintClient] ended')
    this.mqttClient = null
    this.reportTopic = ''
    this.requestTopic = ''
    this.emit(PrinterEvent.MQTT_STATE_CHANGE, null)
  }

  private onError(error: Error) {
    this.lastError = error
    console.error(`[PrintClient] error: ${error.message}`)
    this.rejectPendingPublishes('socket error')
    this.emit(PrinterEvent.MQTT_STATE_CHANGE, null)
  }

  private onMessage(topic: string, payload: Uint8Array) {
    if (topic !== this.reportTopic) {
      return
    }
    const raw = new TextDecoder().decode(payload)
    let data: Record<string, any> = {}
    try {
      data = JSON.parse(raw) ?? {}
    } catch (error: any) {
      console.warn(`[PrintClient] message parse failed: ${error.message}`)
      return
    }
    Object.keys(data).forEach(key => {
      const params = data[key]
      const sequenceId: string = params.sequence_id
      const command: string = `${key}.${params.command}`
      const result: string = params.result
      const reason: string = params.reason
      delete params.command
      delete params.sequence_id
      delete params.result
      delete params.reason
      delete params.msg
      console.debug(`[PrintClient]  report: sequenceId=${sequenceId}, command=${command}, result=${result}, reason=${reason}, params=${JSON.stringify(params)}`)

      switch(command) {
        case 'print.push_status':
          this.handlePushStatus(params)
          break
        case 'print.project_file':
          this.emit(PrinterEvent.PRINT_PROJECT_FILE, params)
          break
        default:
          const flag = this.resolvePublishResponse(sequenceId, result, reason, params)
          if (!flag) {
            console.warn(`[PrintClient] unhandled message: sequenceId=${sequenceId}, command=${command}, result=${result}, reason=${reason}, params=${JSON.stringify(params)}`)
          }
          break
      }
    })
  }

  private handlePushStatus(printData: any) {
    if (!this.device.print) {
      this.device.print = printData
    } else {
      const print: any = Object.assign({}, this.device.print)
      for (const key in printData) {
        if (['ams', 'vt_tray'].includes(key)) {
          print[key] = Object.assign({}, print[key])
          for (const key2 in printData[key]) {
            print[key][key2] = printData[key][key2]
          }
          continue
        }
        print[key] = printData[key]
      }
      this.device.print = print
    }
    this.emit(PrinterEvent.PRINT_PUSH_STATUS, printData)
  }

  /**
   * Requests a full status refresh from the printer.
   * @returns No return value.
   */
  async updateAllData() {
    this.requestWithoutResponse('pushing.pushall')

    const result = await this.request('info.get_version')
    this.device.module = result.module
  }

  async request(command: string, params?: Record<string, any>) {
    if (!this.mqttClient?.connected) throw new Error('Not connected')

    const [type, name] = command.split('.')
    this.sequenceId = (this.sequenceId + 1) & 0xFFFF
    const sequenceId = `${this.sequenceId}`
    const req = {
      [type]: {
        'sequence_id': sequenceId,
        'command': name,
        ...params,
      }
    }
    const response = new Promise<any>((resolve, reject) => {
      this.pendingPublishes.set(sequenceId, { resolve, reject })
    })
    console.debug(`[PrintClient] request: sequenceId=${sequenceId}, command=${command}, params=${JSON.stringify(params)}`)
    try {
      await this.mqttClient.publishAsync(this.requestTopic, JSON.stringify(req))
    } catch (err) {
      const pending = this.pendingPublishes.get(sequenceId)
      if (pending) {
        this.pendingPublishes.delete(sequenceId)
        pending.reject(err)
      }
      throw err
    }
    return response
  }

  private requestWithoutResponse(command: string, params?: Record<string, any>) {
    this.request(command, params).catch((err: any) => {
      console.debug(`[PrintClient] ignored request error: ${err.message}`)
    })
  }

  private resolvePublishResponse(sequenceId: string, result?: string, reason?: string, params?: Record<string, any>) {
    if (sequenceId === undefined || sequenceId === null) return false
    const pending = this.pendingPublishes.get(sequenceId)
    if (!pending) return false
    this.pendingPublishes.delete(sequenceId)
    if (result?.toLowerCase() === 'success') {
      pending.resolve(params)
    } else {
      pending.reject(new Error(reason))
    }
    return true
  }

  private rejectPendingPublishes(reason: string) {
    this.pendingPublishes.forEach((pending, key) => {
      pending.reject(new Error(`[PrintClient] ${reason}: ${key}`))
    })
    this.pendingPublishes.clear()
  }

  /**
   * Gets the current speed of a fan.
   * @param type Fan type: `part`, `aux`, or `chamber`.
   * @returns Fan speed value in range 0-255.
   */
  getFanSpeed(type: FanType) {
    const fanGear = this.device.print?.fan_gear ?? 0
    const fanBit = 8 * (type as number - 1)
    return (fanGear >> fanBit) % 256
  }

  /**
   * Converts printer Wi-Fi signal (dBm) into percentage.
   * @returns Wi-Fi strength percentage in range 0-100.
   */
  getWifiSignalPercentage() {
    const wifiSignal = this.device.print?.wifi_signal
    if (!wifiSignal) return 0
    const dbm = parseInt(wifiSignal)
    if (isNaN(dbm)) return 0

    const minDbm = -100
    const maxDbm = -30
    const percentage = Math.round(((dbm - minDbm) / (maxDbm - minDbm)) * 100)
    return Math.max(0, Math.min(100, percentage))
  }

  /**
   * Sets the speed for a specific fan.
   * @param type Fan type: `part`, `aux`, or `chamber`.
   * @param speed Fan speed value in range 0-255.
   * @returns No return value.
   */
  async setFanSpeed(type: FanType, speed: number) {
    if (!this.device.print) return
    const param = `M106 P${type as number} S${speed}\n`
    const result = await this.request('print.gcode_line', { param })
    if (result.param === param) {
      const fanBit = 8 * (type as number - 1)
      const fanGear = this.device.print.fan_gear ?? 0
      this.device.print.fan_gear = (fanGear & ~(0xFF << fanBit)) | (speed << fanBit)
    }
  }

  /**
   * Sets the print speed level.
   * @param level Speed level: 1=silent, 2=standard, 3=sport, 4=ludicrous.
   * @returns No return value.
   */
  async setPrintSpeedLevel(level: PrintSpeedLevel) {
    if (!this.device.print) return
    const param = `${level}`
    const result = await this.request('print.print_speed', { param })
    if (result.param === param) {
      this.device.print.spd_lvl = level
    }
  }

  /**
   * Toggles chamber light state.
   * @param on `true` to turn on, `false` to turn off.
   * @returns No return value.
   */
  async setLight(type: LightType, on: boolean) {
    const result = await this.request('system.ledctrl', {
      'led_node': type,
      'led_mode': on ? 'on' : 'off',
    })
    if (!this.device.print) return
    const light = this.device.print.lights_report?.find(item => item.node === result.led_node)
    if (light) light.mode = result.led_mode
  }

  private setTemperatureSupport() {
    const module = this.device.module?.find(item => item.name === 'ota')
    if (!module) return false

    const sw_ver = Number(module.sw_ver.split('.').slice(0, 2).join('.'))
    if (['Bambu Lab P1P', 'Bambu Lab P1S', 'Bambu Lab X1E', 'Bambu Lab X1C'].includes(module.product_name) && sw_ver < 1.06) {
      return true
    } else if (['Bambu Lab A1', 'Bambu Lab A1 Mini'].includes(module.product_name) && sw_ver < 1.04) {
      return true
    }

    return false
  }

  /**
   * Sets a target temperature.
   * @param type Target heater: `nozzle` or `heatbed`.
   * @param temperature Target temperature in Celsius.
   * @returns No return value.
   */
  setTemperature(type: TemperatureType, temperature: number) {
    let param = ''
    switch (type) {
      case TemperatureType.Nozzle:
        if (this.setTemperatureSupport()) {
          param = `M104 S${temperature.toFixed(0)}\n`
        } else {
          param = `M109 S${temperature.toFixed(0)}\n`
        }
        break
      case TemperatureType.Heatbed:
        if (this.setTemperatureSupport()) {
          param = `M140 S${temperature.toFixed(0)}\n`
        } else {
          param = `M190 S${temperature.toFixed(0)}\n`
        }
        break
      case TemperatureType.Chamber:
        return
    }
    this.requestWithoutResponse('print.gcode_line', { param })
  }

  /**
   * Sends a pause-print command.
   * @returns No return value.
   */
  setPause() {
    this.requestWithoutResponse('print.pause', { 'param': '' })
  }

  /**
   * Sends a resume-print command.
   * @returns No return value.
   */
  setResume() {
    this.requestWithoutResponse('print.resume', { 'param': '' })
  }

  /**
   * Sends a stop-print command.
   * @returns No return value.
   */
  setStop() {
    this.requestWithoutResponse('print.stop', { 'param': '' })
  }
}
