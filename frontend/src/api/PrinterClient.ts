import { reactive, ref } from 'vue'
import {
  type DeviceState,
  type Project,
} from './models'
import {
  FanType,
  TemperatureType,
  LightType,
  PrintSpeedLevel,
} from './enums'

type ConnectionParams = {
  ip: string
  serial: string
  code: string
}

export class PrinterClient {
  private static instance: PrinterClient | null = null
  private ws: WebSocket | null = null
  private connecting = false
  readyState = ref<number | null>(null)
  private shouldReconnect = true
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private readonly maxReconnectDelay = 30
  private connectionParams: ConnectionParams | null = null

  device = reactive<DeviceState>({
    module: [],
    print: {},
  })

  /**
   * Returns the singleton PrinterClient instance.
   * @returns The global PrinterClient instance.
   */
  static getInstance() {
    if (!PrinterClient.instance) {
      PrinterClient.instance = new PrinterClient()
    }
    return PrinterClient.instance
  }

  /**
   * Opens a WebSocket connection to the backend tunnel.
   * @param ip Printer IP address.
   * @param serial Printer serial number.
   * @param code Printer access code.
   * @returns The WebSocket instance when connection is initiated, otherwise null.
   */
  connect(ip: string, serial: string, code: string) {
    if (typeof window === 'undefined') return null
    this.shouldReconnect = true

    if (!ip || !serial || !code) {
      console.warn('[PrintClient] missing connection parameters')
      this.readyState.value = null
      return null
    }
    this.connectionParams = { ip, serial, code }

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
      console.error('[PrintClient] connect failed:', error)
      this.scheduleReconnect()
      return null
    }
  }

  /**
   * Closes the current connection and disables auto-reconnect.
   * @returns No return value.
   */
  disconnect() {
    this.stopConnection()
  }

  private stopConnection() {
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

  private onOpen(_event: Event) {
    console.log('[PrintClient] connected')
    this.connecting = false
    this.reconnectAttempt = 0
    this.clearReconnectTimer()
    this.readyState.value = this.ws?.readyState ?? null
    this.updateAllData()
  }

  private onClose(_event: Event) {
    console.log('[PrintClient] closed')
    this.connecting = false
    this.readyState.value = WebSocket.CLOSED
    this.ws = null
    this.scheduleReconnect()
  }

  private onError(event: Event) {
    console.error('[PrintClient] error:', event)
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
    console.warn(`[PrintClient] reconnecting in ${delaySeconds}s`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.shouldReconnect) {
        return
      }
      if (!this.connectionParams) {
        console.warn('[PrintClient] reconnect skipped: missing connection parameters')
        return
      }
      this.connect(this.connectionParams.ip, this.connectionParams.serial, this.connectionParams.code)
    }, delaySeconds * 1000)
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) {
      return
    }
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private onMessage(event: MessageEvent<any>) {
    let data = JSON.parse(event.data) ?? {}
    if (data.print) {
      this.handlePrintMessage(data.print)
      return
    }

    if (data.info) {
      this.handleInfoMessage(data.info)
      return
    }

    if (data.system) {
      this.handleSystemMessage(data.system)
      return
    }

    if (data.liveview) return

    console.warn('[PrintClient] unhandled message:', data)
  }

  private handlePrintMessage(printData: any) {
    const command = printData?.command
    if (!command) return

    if (command === 'push_status') {
      this.handlePushStatus(printData)
      return
    }

    if (command === 'print_speed') {
      console.debug(`[PrintClient][print_speed] update print_speed_level = ${JSON.stringify(printData.param)}`)
      this.device.print.spd_lvl = printData.param as PrintSpeedLevel
      return
    }

    if (command === 'gcode_line') {
      this.handleGcodeLine(printData.param as string)
      return
    }

    if (command === 'project_file') {
      this.handleProjectFile(printData)
      return
    }
  }

  private handleInfoMessage(infoData: any) {
    if (infoData?.command !== 'get_version') return
    console.debug('[PrintClient][get_version]', infoData.module)
    this.device.module = infoData.module
  }

  private handleSystemMessage(systemData: any) {
    if (!systemData?.led_mode) return
    const chamberLight = this.device.print.lights_report?.find(item => item.node === LightType.Chamber)
    if (chamberLight) {
      chamberLight.mode = systemData.led_mode
    }
    console.debug('[PrintClient][led_mode]', systemData.led_mode)
  }

  private handlePushStatus(printData: any) {
    delete printData.command
    delete printData.msg
    delete printData.sequence_id
    console.debug(`[PrintClient][push_status]`, printData)
    for (const key in printData) {
      (this.device.print as any)[key] = printData[key]
    }
  }

  private handleProjectFile(projectData: any) {
    delete projectData.command
    delete projectData.msg
    delete projectData.sequence_id
    delete projectData.reason
    delete projectData.result
    console.debug(`[PrintClient][project_file]`, projectData)
    const project = reactive<Project>(projectData as Project)
    project.thumbnail_url = `/api/getThumbnail?url=${encodeURIComponent(project.url)}&plate_idx=${project.plate_idx}`
    this.saveProject(project)
  }

  private saveProject(project: Project) {
    if (typeof window === 'undefined') return

    const projects = this.getProjectsFromStorage()
    projects.push(project)
    localStorage.setItem('projects', JSON.stringify(projects))
  }

  private getProjectsFromStorage() {
    try {
      const rawProjects = localStorage.getItem('projects')
      if (!rawProjects) {
        return [] as Project[]
      }
      const parsedProjects = JSON.parse(rawProjects)
      return Array.isArray(parsedProjects) ? parsedProjects as Project[] : []
    } catch (error) {
      console.warn('[PrintClient] failed to parse projects from localStorage:', error)
      return [] as Project[]
    }
  }

  getCurrentProject() {
    if (typeof window === 'undefined') return null

    const taskId = String(this.device.print.task_id ?? '')
    const subtaskId = String(this.device.print.subtask_id ?? '')
    if (!taskId || !subtaskId) {
      return null
    }

    const projects = this.getProjectsFromStorage()
    return projects.find(project => (
      String(project.task_id) === taskId && String(project.subtask_id) === subtaskId
    )) ?? null
  }

  private handleGcodeLine(param: string) {
    if (param.startsWith('M106')) { // fan speed
      this.handleFanSpeed(param)
      return
    }
  }

  private handleFanSpeed(param: string) {
    const items = param.trim().split(' ')
    if (items.length !== 3) {
      return
    }
    const fanNum = Number(items[1].replace('P', ''))
    const fanBit = 8 * (fanNum - 1)
    const speed = Number(items[2].replace('S', ''))
    let fanGear = this.device.print.fan_gear ?? 0
    this.device.print.fan_gear = (fanGear & ~(0xFF << fanBit)) | (speed << fanBit)
    console.debug(`[PrintClient][gcode_line] update fanNum = ${fanNum}, fanSpeed = ${speed}`)
  }

  /**
   * Requests a full status refresh from the printer.
   * @returns No return value.
   */
  updateAllData() {
    this.publishCommand({
      "pushing": {"command": "pushall"},
      "info": {"command": "get_version"},
      // "upgrade": {"command": "get_history"},
    })
  }

  /**
   * Sends a control command to the printer backend.
   * @param command Command payload sent through the WebSocket.
   * @returns `true` if sent successfully; `false` when socket is not ready.
   */
  publishCommand(command: {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false
    this.ws.send(JSON.stringify(command))
    return true
  }

  /**
   * Gets the current speed of a fan.
   * @param type Fan type: `part`, `aux`, or `chamber`.
   * @returns Fan speed value in range 0-255.
   */
  getFanSpeed(type: FanType) {
    const fanGear = this.device.print.fan_gear ?? 0
    const fanBit = 8 * (type as number - 1)
    return (fanGear >> fanBit) % 256
  }

  /**
   * Converts printer Wi-Fi signal (dBm) into percentage.
   * @returns Wi-Fi strength percentage in range 0-100.
   */
  getWifiSignalPercentage() {
    const wifiSignal = this.device.print.wifi_signal
    if (!wifiSignal) return 0
    const dbm = parseInt(wifiSignal)
    if (isNaN(dbm)) return 0

    // Normalize dBm to percentage
    // -30dBm or better -> 100%
    // -100dBm or worse -> 0%
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
  setFanSpeed(type: FanType, speed: number) {
    this.publishCommand({
      "print": {
        "sequence_id": 0,
        "command": "gcode_line",
        "param": `M106 P${type as number} S${speed}\n`
      }
    })
  }

  /**
   * Sets the print speed level.
   * @param level Speed level: 1=silent, 2=standard, 3=sport, 4=ludicrous.
   * @returns No return value.
   */
  setPrintSpeedLevel(level: number) {
    this.publishCommand({
      "print": {
        "command": "print_speed",
        "param": `${level}`
      }
    })
  }

  /**
   * Toggles chamber light state.
   * @param on `true` to turn on, `false` to turn off.
   * @returns No return value.
   */
  setLight(on: boolean) {
    this.publishCommand({
      "system": {
        "led_mode": on ? "on" : "off"
      }
    })
  }

  /**
   * Sets a target temperature.
   * @param type Target heater: `nozzle` or `heatbed`.
   * @param temperature Target temperature in Celsius.
   * @returns No return value.
   */
  setTemperature(type: TemperatureType, temperature: number) {
    const gcode = type === TemperatureType.Nozzle ? 'M104' : type === TemperatureType.Heatbed ? 'M140' : null
    if (!gcode) {
      // TODO: chamber temperature control command is not implemented yet.
      console.warn('[PrintClient] chamber temperature control is not implemented yet')
      return
    }
    // TODO not working
    this.publishCommand({
      "print": {
        "sequence_id": 0,
        "command": "gcode_line",
        "param": `${gcode} S${temperature.toFixed(0)}\n`
      }
    })
  }

  /**
   * Sends a pause-print command.
   * @returns No return value.
   */
  setPause() {
    this.sendPrintCommand('pause')
  }

  /**
   * Sends a resume-print command.
   * @returns No return value.
   */
  setResume() {
    this.sendPrintCommand('resume')
  }

  /**
   * Sends a stop-print command.
   * @returns No return value.
   */
  setStop() {
    this.sendPrintCommand('stop')
  }

  private sendPrintCommand(command: string) {
    this.publishCommand({
      "print": {
        "sequence_id": "0",
        "command": command,
        "param": "",
      }
    })
  }
}
