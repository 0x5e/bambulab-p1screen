import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { ActionSheet, Button, Checkbox, Slider, Progress, Popup, Popover, Overlay, Dialog, Cell, CellGroup, Empty, Tab, Tabs, Switch, Stepper, Field } from 'vant'
import App from './App.vue'
import { PrinterClient } from './api/PrinterClient'
import { i18n } from './i18n'
import { routes } from './router/routes'
import { getCurrentDevice } from './utils/device'
import 'vant/lib/index.css'
import './styles/theme.css'

// import { showDialog } from 'vant'
// import Bowser from 'bowser'
// import pkg from '../package.json'
// const browser = Bowser.getParser(window.navigator.userAgent)
// const requirements: Record<string, string> = {}
// pkg.browserslist.forEach((item: string) => {
//   const match = item.match(/^(\w+)\s*>=\s*([\d.]+)$/)
//   if (match) {
//     requirements[match[1].toLowerCase()] = `>=${match[2]}`
//   }
// })
// if (browser.satisfies(requirements) === false) {
//   showDialog({
//     message: '你的WebView内核版本过低，会导致功能和界面异常。Android用户请升级浏览器内核组件（Android System WebView），iOS用户请升级操作系统。',
//     messageAlign: 'left',
//   })
// }

window.client = PrinterClient.getInstance()

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

createApp(App)
  .use(router)
  .use(i18n)
  .use(ActionSheet)
  .use(Button)
  .use(Slider)
  .use(Progress)
  .use(Popup)
  .use(Popover)
  .use(Dialog)
  .use(Cell)
  .use(CellGroup)
  .use(Empty)
  .use(Tab)
  .use(Tabs)
  .use(Switch)
  .use(Stepper)
  .use(Overlay)
  .use(Checkbox)
  .use(Field)
  .mount('#app')

window.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

const storedDevice = getCurrentDevice()
if (storedDevice) {
  window.client.connect(storedDevice.ip, storedDevice.serial, storedDevice.code)
}
