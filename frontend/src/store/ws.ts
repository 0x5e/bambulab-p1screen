import { ref } from 'vue'
import { device } from './device'

export class WSService {
  private static instance: WSService | null = null
  private ws: WebSocket | null = null
  private connecting = false
  private readyState = ref<number | null>(null)
  private shouldReconnect = true
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private readonly maxReconnectDelay = 30

  static getInstance() {
    if (!WSService.instance) {
      WSService.instance = new WSService()
    }
    return WSService.instance
  }

  connect() {
    if (typeof window === 'undefined') return null
    this.shouldReconnect = true

    const params = new URLSearchParams(location.search)
    const ip = params.get('ip') ?? ''
    const serial = params.get('serial') ?? ''
    const code = params.get('code') ?? ''

    if (!ip || !serial || !code) {
      console.warn('[WebSocket] missing connection parameters')
      this.readyState.value = null
      return null
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.readyState.value = this.ws.readyState
      return this.ws
    }

    if (this.connecting) {
      return this.ws
    }

    this.clearReconnectTimer()
    this.connecting = true
    this.readyState.value = WebSocket.CONNECTING
    try {
      const url = `ws://${location.host}/ws?ip=${encodeURIComponent(ip)}&serial=${encodeURIComponent(serial)}&code=${encodeURIComponent(code)}`
      this.ws = new WebSocket(url)
      this.ws.addEventListener('open', this.onOpen.bind(this))
      this.ws.addEventListener('close', this.onClose.bind(this))
      this.ws.addEventListener('error', this.onError.bind(this))
      this.ws.addEventListener('message', this.onMessage.bind(this))
      return this.ws
    } catch (error) {
      this.connecting = false
      console.error('[WebSocket] connect failed:', error)
      this.scheduleReconnect()
      return null
    }
  }

  disconnect() {
    this.stopConnection()
  }

  stopConnection() {
    this.shouldReconnect = false
    this.reconnectAttempt = 0
    this.clearReconnectTimer()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connecting = false
    this.readyState.value = WebSocket.CLOSED
  }

  onOpen(event: Event) {
    console.log('[WebSocket] connected')
    this.connecting = false
    this.reconnectAttempt = 0
    this.clearReconnectTimer()
    this.readyState.value = this.ws?.readyState ?? null
    this.updateAllData()
  }

  onClose(event: Event) {
    console.log('[WebSocket] closed')
    this.connecting = false
    this.readyState.value = WebSocket.CLOSED
    this.ws = null
    this.scheduleReconnect()
  }

  onError(event: Event) {
    console.error('[WebSocket] error:', event)
    this.connecting = false
    this.readyState.value = this.ws?.readyState ?? null
    this.scheduleReconnect()
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || this.connecting || this.reconnectTimer) {
      return
    }

    const delaySeconds = Math.min(2 ** this.reconnectAttempt, this.maxReconnectDelay)
    this.reconnectAttempt += 1
    console.warn(`[WebSocket] reconnecting in ${delaySeconds}s`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.shouldReconnect) {
        return
      }
      this.connect()
    }, delaySeconds * 1000)
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) {
      return
    }
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  onMessage(event: MessageEvent<any>) {
    let data = JSON.parse(event.data) ?? {}
    if (data.print?.command === 'push_status') {
      for (const key in data.print) {
        if (['command', 'msg', 'sequence_id'].includes(key))
          continue
        (device.print as any)[key] = data.print[key]
        console.debug(`[WebSocket] update print.${key} = ${JSON.stringify(data.print[key])}`)
      }
    } else if (data.print?.command === 'print_speed') {
      console.debug(`[WebSocket] update print_speed_level = ${JSON.stringify(data.print.param)}`)
      device.print.spd_lvl = Number(data.print.param)
      device.print.spd_mag = [50, 100, 124, 166][device.print.spd_lvl - 1]
    } else if (data.print?.command === 'gcode_line') {
      if ((data.print.param as string).startsWith('M106')) { // fan speed
        const items = (data.print.param as string).trim().split(' ')
        if (items.length !== 3) {
          return
        }
        const fanNum = Number(items[1].replace('P', ''))
        const fanBit = (8 * (fanNum - 1))
        const speed = Number(items[2].replace('S', ''))
        let fanGear = device.print.fan_gear ?? 0
        device.print.fan_gear = (fanGear & ~(0xFF << fanBit)) | (speed << fanBit);
        console.debug(`[WebSocket] update fanNum = ${fanNum}, fanSpeed = ${speed}`)
      }
    } else if (data.info?.command === 'get_version') {
      device.module = data.info.module
      console.debug(`[WebSocket] update module = ${JSON.stringify(data.info.module)}`)
    } else if (data.system?.led_mode) {
      const chamber_light = device.print.lights_report?.find(item => item.node === 'chamber_light')
      if (chamber_light) {
        chamber_light.mode = data.system.led_mode
      }
      console.debug(`[WebSocket] update led_mode = ${JSON.stringify(data.system.led_mode)}`)
    } else {
      console.warn('[WebSocket] unhandled message:', data)
    }
  }

  getReadyStateRef() {
    return this.readyState
  }

  updateAllData() {
    this.publishCommand({
      "pushing": {"command": "pushall"},
      "info": {"command": "get_version"},
      // "upgrade": {"command": "get_history"},
    })
  }

  publishCommand(command: {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false
    this.ws.send(JSON.stringify(command))
    return true
  }

  // speed: 0~255
  getFanSpeed(type: 'part' | 'aux' | 'chamber') {
    const fanGear = device.print.fan_gear ?? 0
    if (type === 'part') {
      return fanGear % 256
    } else if (type === 'aux') {
      return (fanGear >> 8) % 256
    } else if (type === 'chamber') {
      return (fanGear >> 16) % 256
    }
    return 0
  }

  // speed: 0~255
  setFanSpeed(type: 'part' | 'aux' | 'chamber', speed: number) {
    const fanNum = {
      part: 1,
      aux: 2,
      chamber: 3
    }[type]

    this.publishCommand({
      "print": {
        "sequence_id": 0,
        "command": "gcode_line",
        "param": `M106 P${fanNum} S${speed}\n`
      }
    })
  }

  // Print speed level as a string
  // 1 = silent
  // 2 = standard
  // 3 = sport
  // 4 = ludicrous
  setPrintSpeedLevel(level: number) {
    this.publishCommand({
      "print": {
        "command": "print_speed",
        "param": `${level}`
      }
    })
  }

  setLight(on: boolean) {
    this.publishCommand({
      "system": {
        "led_mode": on ? "on" : "off"
      }
    })
  }

  setTemperature(type: 'nozzle' | 'heatbed', temperature: number) {
    // TODO not working
    this.publishCommand({
      "print": {
        "sequence_id": 0,
        "command": "gcode_line",
        "param": `${{ nozzle: 'M104', heatbed: 'M140' }[type]} S${temperature.toFixed(0)}\n`
      }
    })
  }

  setPause() {
    this.publishCommand({
      "print": {
        "sequence_id": "0",
        "command": "pause",
        "param": "",
      }
    })
  }

  setResume() {
    this.publishCommand({
      "print": {
        "sequence_id": "0",
        "command": "resume",
        "param": "",
      }
    })
  }

  setStop() {
    this.publishCommand({
      "print": {
        "sequence_id": "0",
        "command": "stop",
        "param": "",
      }
    })
  }
}
