import type {
  CURRENT_STAGE_IDS,
  GcodeState,
  LightMode,
  LightType,
  PrintSpeedLevel,
} from './enums'

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

  // device
  wifi_signal?: string
  sdcard?: boolean

  // nozzle
  nozzle_diameter?: '0.2' | '0.4' | '0.6' | '0.8'
  nozzle_type?: 'stainless_steel' | 'hardened_steel'
  nozzle_temper?: number
  nozzle_target_temper?: number

  // heatbed
  bed_temper?: number
  bed_target_temper?: number

  // fan speed
  fan_gear?: number

  // print speed
  spd_lvl?: PrintSpeedLevel

  // light
  lights_report?: DeviceLight[]

  // filament
  ams?: DeviceAMSInfo
  vt_tray?: DeviceTray
  
  // print state
  stg_cur?: CURRENT_STAGE_IDS
  gcode_state?: GcodeState
  gcode_file_prepare_percent?: string
  mc_percent?: number
  mc_remaining_time?: number // minute
  mc_print_stage?: string // 1:空闲,2:打印中,3:暂停
  mc_print_sub_stage?: number // 0:无,1:?,2:加热,4:换料中
  layer_num?: number
  total_layer_num?: number
  task_id?: string
  subtask_id?: string
  subtask_name?: string
}

export type DeviceAMSInfo = {
  ams: DeviceAMS[]
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
  tray_type: string
  tray_color: string // rgba
  nozzle_temp_max: string
  nozzle_temp_min: string
}

export type DeviceLight = {
  node: LightType
  mode: LightMode
}

export type DeviceState = {
  module: DeviceModule[]
  print: DevicePrint
}

export type Project = {
  param: string
  project_id: string
  design_id: string
  model_id: string
  profile_id: string
  plate_idx: string
  task_id: string
  subtask_id: string
  subtask_name: string
  job_id: number
  url: string
  thumbnail_url?: string
  md5: string
  timelapse: boolean
  bed_leveling: boolean
  flow_cali: boolean
  vibration_cali: boolean
  layer_inspect: boolean
  ams_mapping: number[]
  skip_objects: any
  timestamp: number
  dev_id: string
  job_type: number
  use_ams: boolean
  bed_temp: number
  auto_bed_leveling: number
  extrude_cali_flag: number
  nozzle_offset_cali: number
  ams_mapping2: any[]
  cfg: string
  extrude_cali_manual_mode: number
}
