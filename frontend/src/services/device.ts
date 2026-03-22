export enum FanType {
  Part = 'part',
  Aux = 'aux',
  Chamber = 'chamber',
}

export enum TemperatureType {
  Nozzle = 'nozzle',
  Heatbed = 'heatbed',
  Chamber = 'chamber',
}

export enum GcodeState {
  Idle = 'IDLE',
  Prepare = 'PREPARE',
  Running = 'RUNNING',
  Pause = 'PAUSE',
  Finish = 'FINISH',
  Unknown = '',
}

export type DeviceModule = {
  name: string
  sw_ver: string
  hw_ver: string
  loader_ver: string
  sn: string
  product_name: string
  visible: boolean
  new_ver?: string
  flag: number
}

export type DevicePrint = {
  nozzle_temper?: number
  nozzle_target_temper?: number
  bed_temper?: number
  bed_target_temper?: number

  wifi_signal?: string

  nozzle_diameter?: number
  nozzle_type?: string

  spd_mag?: number
  spd_lvl?: number
  fan_gear?: number

  mc_percent?: number
  mc_remaining_time?: number
  mc_print_stage?: string // 1:空闲,2:打印中,3:暂停
  mc_print_sub_stage?: number // 0:无,1:?,2:加热,4:换料中
  gcode_state?: GcodeState
  gcode_file_prepare_percent?: string
  layer_num?: number
  total_layer_num?: number
  
  stg_cur?: number
  print_type?: string

  ams?: DeviceAMSInfo
  vt_tray?: DeviceTray
  lights_report?: DeviceLight[]
}

type DeviceAMSInfo = {
  ams: DeviceAMS[]
}

type DeviceAMS = {
  id: string
  humidity: string
  humidity_raw: string
  temp: string
  tray: DeviceTray[]
}

type DeviceTray = {
  id: string
  state?: number
  k: number
  n: number
  tray_type: string
  tray_color: string
  nozzle_temp_max: string
  nozzle_temp_min: string
}

type DeviceLight = {
  node: string
  mode: 'on' | 'off'
}

export type DeviceState = {
  module: DeviceModule[]
  print: DevicePrint
}
