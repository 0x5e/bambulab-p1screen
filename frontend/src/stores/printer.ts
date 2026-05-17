import { ref } from 'vue'
import { PrinterEvent, type DevicePrint, type Module, type Project } from '@bambulab-p1screen/printer-api'
import { client } from '../printer'
import { getCurrentProject, saveProject } from '../utils/project'

const print = ref<DevicePrint | undefined>(client.device.print)
const modules = ref<Module[] | undefined>(client.device.module)
const project = ref<Project | null>(getCurrentProject(client.device.print?.task_id, client.device.print?.subtask_id))

let bound = false

const syncClientState = () => {
  print.value = client.device.print
  modules.value = client.device.module
}

const handleMqttStateChange = () => {
  syncClientState()
}

const handlePrintPushStatus = () => {
  syncClientState()

  if (!project.value) {
    project.value = getCurrentProject(client.device.print?.task_id, client.device.print?.subtask_id)
  }

  // test
  // print.value!.gcode_state = 'IDLE'
  // print.value!.gcode_state = 'FINISH'
  // print.value!.gcode_state = 'FAILED'
  // print.value!.gcode_state = 'RUNNING'
  // print.value!.print_error = 117473297
  // print.value!.hms = [
  //   {"attr":117448704,"code":131073,"action":0,"timestamp":1777383334}, // AMS耗材用尽。请把耗材放入同一个AMS槽位后继续。
  // ]
  // print.value!.ams.ams = []
  // print.value!.ams.ams[1] = {
  //   id: '1',
  //   humidity: '3',
  //   humidity_raw: '10',
  //   temp: '20',
  //   tray: print.value!.ams.ams[0].tray,
  // }
  // print.value!.ams.ams[0].tray[0].tray_color = '00CC66FF'
  // print.value!.ams.ams[0].tray[0].tag_uid = 'xxx'
  // print.value!.ams.ams[0].tray[0].remain = 80
  // print.value!.ams.ams[0].tray[1].tray_color = '00CCCCFF'
  // print.value!.ams.ams[0].tray[1].tag_uid = 'xxx'
  // print.value!.ams.ams[0].tray[1].remain = 75
  // print.value!.ams.ams[0].tray[2].tray_color = 'CC0000FF'
  // print.value!.ams.ams[0].tray[2].tag_uid = 'xxx'
  // print.value!.ams.ams[0].tray[2].remain = 85
  // print.value!.ams.ams[0].tray[3].tray_color = 'FFFFFFFF'
  // print.value!.ams.ams[0].tray[3].tag_uid = '0000000000000000'
  // print.value!.ams.ams[0].tray[3].remain = -1
}

const handleProjectFile = (projectData: Project) => {
  saveProject(projectData)
  project.value = projectData
}

export const bindPrinterClient = () => {
  if (bound) return
  bound = true
  syncClientState()
  project.value = getCurrentProject(client.device.print?.task_id, client.device.print?.subtask_id)

  client.on(PrinterEvent.MQTT_STATE_CHANGE, handleMqttStateChange)
  client.on(PrinterEvent.PRINT_PUSH_STATUS, handlePrintPushStatus)
  client.on(PrinterEvent.PRINT_PROJECT_FILE, handleProjectFile)
}

export const unbindPrinterClient = () => {
  if (!bound) return
  bound = false

  client.off(PrinterEvent.MQTT_STATE_CHANGE, handleMqttStateChange)
  client.off(PrinterEvent.PRINT_PUSH_STATUS, handlePrintPushStatus)
  client.off(PrinterEvent.PRINT_PROJECT_FILE, handleProjectFile)
}

export const usePrinterStore = () => ({
  device: print,
  modules,
  project,
})
