import { reactive } from 'vue'

type DeviceModule = {
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
  gcode_state?: string
  layer_num?: number
  total_layer_num?: number

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

export const device = reactive<{
  module: DeviceModule[]
  print: DevicePrint
}>({
  module: [],
  print: {},
})

export const fans: { type: 'part' | 'aux' | 'chamber', name: string }[] = [{
  type: 'part',
  name: '部件'
}, {
  type: 'aux',
  name: '辅助'
}, {
  type: 'chamber',
  name: '机箱'
}]
