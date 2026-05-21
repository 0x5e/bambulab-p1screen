import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { ActionSheet, Badge, Button, Checkbox, Slider, Progress, Popup, Popover, Overlay, Dialog, Cell, CellGroup, Empty, Tab, Tabs, Switch, Stepper, Field } from 'vant'
import App from './App.vue'
import { i18n } from './i18n'
import { client, connectPrinter } from './printer'
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

type AppLifecycleState = 'foreground' | 'background'
const BACKGROUND_DISCONNECT_DELAY_MS = 3000
let backgroundDisconnectTimer: number | undefined

window.client = client

const connectCurrentPrinter = () => {
  const storedDevice = getCurrentDevice()
  if (storedDevice) {
    connectPrinter(storedDevice)
  }
}

window.__P1ScreenOnAppLifecycle = (state: AppLifecycleState) => {
  if (state === 'background') {
    if (backgroundDisconnectTimer !== undefined) {
      window.clearTimeout(backgroundDisconnectTimer)
    }
    backgroundDisconnectTimer = window.setTimeout(() => {
      console.info('[AppLifecycle] background: disconnect printer')
      client.disconnect()
      backgroundDisconnectTimer = undefined
    }, BACKGROUND_DISCONNECT_DELAY_MS)
    return
  }

  if (backgroundDisconnectTimer !== undefined) {
    window.clearTimeout(backgroundDisconnectTimer)
    backgroundDisconnectTimer = undefined
  }
  if (!client.mqttClient?.connected) {
    console.info('[AppLifecycle] foreground: connect printer')
    connectCurrentPrinter()
  }
}

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

createApp(App)
  .use(router)
  .use(i18n)
  .use(ActionSheet)
  .use(Badge)
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

connectCurrentPrinter()
