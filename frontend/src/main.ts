import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { Button, Slider, Progress, Popup, Popover, Dialog, Cell, CellGroup } from 'vant'
import App from './App.vue'
import { PrinterClient } from './api/PrinterClient'
import HomePage from './views/HomePage.vue'
import ControlsPage from './views/ControlsPage.vue'
import FilamentPage from './views/FilamentPage.vue'
import SettingsPage from './views/SettingsPage.vue'
import FilesPage from './views/FilesPage.vue'
import 'vant/lib/index.css'
import './styles/theme.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', component: HomePage },
    { path: '/controls', component: ControlsPage },
    { path: '/filament', component: FilamentPage },
    { path: '/settings', component: SettingsPage },
    { path: '/files', component: FilesPage },
  ]
})

createApp(App)
  .use(router)
  .use(Button)
  .use(Slider)
  .use(Progress)
  .use(Popup)
  .use(Popover)
  .use(Dialog)
  .use(Cell)
  .use(CellGroup)
  .mount('#app')

window.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

const syncAppSize = () => {
  const appElement = document.getElementById('app')
  const appHeight = appElement?.clientHeight ?? window.innerHeight
  const appWidth =  appElement?.clientWidth ?? window.innerWidth
  document.documentElement.style.setProperty('--app-height', `${appHeight}px`)
  document.documentElement.style.setProperty('--app-width', `${appWidth}px`)
}
syncAppSize()
window.addEventListener('resize', syncAppSize)

const params = new URLSearchParams(location.search)
const ip = params.get('ip') ?? ''
const serial = params.get('serial') ?? ''
const code = params.get('code') ?? ''
const client = PrinterClient.getInstance()
client.connect(ip, serial, code)
