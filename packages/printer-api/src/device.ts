import type {
  CurrentStage,
  GcodeState,
  LightMode,
  LightType,
  PrintSpeedLevel,
} from './enums'

import { type Module } from './module'

export type DevicePrint = {
  // device
  wifi_signal: string
  sdcard: boolean

  // nozzle
  nozzle_diameter: '0.2' | '0.4' | '0.6' | '0.8'
  nozzle_type: 'stainless_steel' | 'hardened_steel'
  nozzle_temper: number
  nozzle_target_temper: number

  // heatbed
  bed_temper: number
  bed_target_temper: number

  // fan speed
  fan_gear: number

  // print speed
  spd_lvl: PrintSpeedLevel

  // light
  lights_report: DeviceLight[]

  // filament
  ams_status: number
  ams_rfid_status: number
  ams: DeviceAMSInfo
  vt_tray: DeviceTray

  // print state
  stg_cur: CurrentStage
  gcode_state: GcodeState
  gcode_file_prepare_percent: string
  mc_percent: number
  mc_remaining_time: number // minute
  mc_print_stage: string // 1:空闲,2:打印中,3:暂停
  mc_print_sub_stage: number // 0:无,1:?,2:加热,4:换料中
  layer_num: number
  total_layer_num: number
  task_id: string
  subtask_id: string
  subtask_name: string
  print_error: number
  home_flag: number
  hms: DeviceHMS[]
}

export type DeviceAMSInfo = {
  ams: DeviceAMS[]
  insert_flag: boolean // Read filament rfid when insert
  power_on_flag: boolean // Read filament rfid when power on
  tray_now: string // 254 if external spool / vt_tray, otherwise is ((ams_id * 4) + tray_id) for current tray (ams 2 tray 2 would be (1*4)+1 = 5)
  tray_pre: string
  tray_tar: string
}

export type DeviceAMS = {
  id: string
  humidity: '1' | '2' | '3' | '4' | '5' // humidity level
  humidity_raw: string // humidity percent
  temp: string // °C
  tray: DeviceTray[]
}

export type DeviceTray = {
  id: string
  state?: number // AMS only
  k: number
  n: number
  tag_uid: string
  tray_info_idx: string
  tray_type: string
  tray_color: string // rgba
  nozzle_temp_max: string
  nozzle_temp_min: string
  remain: number // -1, 0~100
}

export type DeviceLight = {
  node: LightType
  mode: LightMode
}

export type DeviceHMS = {
  attr: number
  code: number
  action: number
  timestamp: number
}

export type DeviceState = {
  module?: Module[]
  print?: DevicePrint
}
