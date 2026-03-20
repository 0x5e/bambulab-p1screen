import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { Button, Slider, Progress, Popup, Dialog, Cell, CellGroup } from 'vant'
import App from './App.vue'
import { WSService } from './store/ws'
import HomePage from './views/HomePage.vue'
import ControlsPage from './views/ControlsPage.vue'
import FilamentPage from './views/FilamentPage.vue'
import SettingsPage from './views/SettingsPage.vue'
import FilesPage from './views/FilesPage.vue'
import 'vant/lib/index.css'
import 'material-symbols/rounded.css'
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
  .use(Dialog)
  .use(Cell)
  .use(CellGroup)
  .mount('#app')

window.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

WSService.getInstance().connect()
