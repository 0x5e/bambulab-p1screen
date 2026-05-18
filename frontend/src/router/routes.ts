import type { RouteRecordRaw } from 'vue-router'
import HomePage from '../views/home/HomePage.vue'
import FilesPage from '../views/home/FilesPage.vue'
import ControlPage from '../views/control/ControlPage.vue'
import MotionPage from '../views/control/MotionPage.vue'
import NozzlePage from '../views/control/NozzlePage.vue'
import FilamentPage from '../views/filament/FilamentPage.vue'
import FilamentAutoRefillPage from '../views/filament/FilamentAutoRefillPage.vue'
import FilamentEditPage from '../views/filament/FilamentEditPage.vue'
import SettingHomePage from '../views/setting/HomePage.vue'
import SettingDeviceAddPage from '../views/setting/DeviceAddPage.vue'
import SettingDeviceEditPage from '../views/setting/DeviceEditPage.vue'
import SettingFirmwarePage from '../views/setting/FirmwarePage.vue'
import SettingCalibrationPage from '../views/setting/CalibrationPage.vue'
import SettingToolboxPage from '../views/setting/ToolboxPage.vue'
import SettingPage from '../views/setting/SettingPage.vue'
import SettingPrintOptionPage from '../views/setting/PrintOptionPage.vue'
import SettingAMSSettingPage from '../views/setting/AMSSettingPage.vue'
import SettingSerialPage from '../views/setting/SerialPage.vue'
import MessagePage from '../views/message/MessagePage.vue'

export const ROUTE_NAME = {
  HOME: 'home',
  HOME_FILES: 'home-files',
  CONTROL: 'control',
  CONTROL_MOTION: 'control-motion',
  CONTROL_NOZZLE: 'control-nozzle',
  FILAMENT: 'filament',
  FILAMENT_AUTO_REFILL: 'filament-auto-refill',
  FILAMENT_EDIT: 'filament-edit',
  SETTING_HOME: 'setting-home',
  SETTING_DEVICE_ADD: 'setting-device-add',
  SETTING_DEVICE_EDIT: 'setting-device-edit',
  SETTING_FIRMWARE: 'setting-firmware',
  SETTING_CALIBRATION: 'setting-calibration',
  SETTING_TOOLBOX: 'setting-toolbox',
  SETTING_SETTING: 'setting-setting',
  SETTING_PRINT_OPTION: 'setting-print-option',
  SETTING_AMS_SETTING: 'setting-ams-setting',
  SETTING_SERIAL: 'setting-serial',
  MESSAGE: 'message',
} as const

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: ROUTE_NAME.HOME } },
  { path: '/home', name: ROUTE_NAME.HOME, component: HomePage },
  { path: '/home/files', name: ROUTE_NAME.HOME_FILES, component: FilesPage },
  { path: '/control', name: ROUTE_NAME.CONTROL, component: ControlPage },
  { path: '/control/motion', name: ROUTE_NAME.CONTROL_MOTION, component: MotionPage },
  { path: '/control/nozzle', name: ROUTE_NAME.CONTROL_NOZZLE, component: NozzlePage },
  { path: '/filament', name: ROUTE_NAME.FILAMENT, component: FilamentPage },
  { path: '/filament/auto-refill', name: ROUTE_NAME.FILAMENT_AUTO_REFILL, component: FilamentAutoRefillPage },
  { path: '/filament/edit/:ams_id/:tray_id', name: ROUTE_NAME.FILAMENT_EDIT, component: FilamentEditPage, props: true },
  { path: '/setting', name: ROUTE_NAME.SETTING_HOME, component: SettingHomePage },
  { path: '/setting/device/add', name: ROUTE_NAME.SETTING_DEVICE_ADD, component: SettingDeviceAddPage },
  { path: '/setting/device/edit/:serial', name: ROUTE_NAME.SETTING_DEVICE_EDIT, component: SettingDeviceEditPage, props: true },
  { path: '/setting/firmware', name: ROUTE_NAME.SETTING_FIRMWARE, component: SettingFirmwarePage },
  { path: '/setting/calibration', name: ROUTE_NAME.SETTING_CALIBRATION, component: SettingCalibrationPage },
  { path: '/setting/toolbox', name: ROUTE_NAME.SETTING_TOOLBOX, component: SettingToolboxPage },
  { path: '/setting/setting', name: ROUTE_NAME.SETTING_SETTING, component: SettingPage },
  { path: '/setting/print-option', name: ROUTE_NAME.SETTING_PRINT_OPTION, component: SettingPrintOptionPage },
  { path: '/setting/ams-setting', name: ROUTE_NAME.SETTING_AMS_SETTING, component: SettingAMSSettingPage },
  { path: '/setting/serial', name: ROUTE_NAME.SETTING_SERIAL, component: SettingSerialPage },
  { path: '/message', name: ROUTE_NAME.MESSAGE, component: MessagePage },
]
