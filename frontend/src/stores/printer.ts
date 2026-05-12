import { ref } from 'vue'
import type { DevicePrint } from '../api/device'
import type { Module } from '../api/module'
import { PrinterClient, PrinterEvent } from '../api/PrinterClient'
import type { Project } from '../api/project'
import { getCurrentProject, saveProject } from '../utils/project'

const client = PrinterClient.getInstance()

const print = ref<DevicePrint | undefined>(client.device.print)
const modules = ref<Module[] | undefined>(client.device.module)
const project = ref<Project | null>(getCurrentProject())

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
    project.value = getCurrentProject()
  }
}

const handleProjectFile = (projectData: Project) => {
  saveProject(projectData)
  project.value = projectData
}

export const bindPrinterClient = () => {
  if (bound) return
  bound = true
  syncClientState()
  project.value = getCurrentProject()

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
