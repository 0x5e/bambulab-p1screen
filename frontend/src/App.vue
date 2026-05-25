<template>
  <div class="app-root">
    <div class="unsupported">你的浏览器内核版本过低，请升级。</div>
    <div class="app-shell">
      <aside class="side-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.key"
          :class="{ 'nav-item': true, 'nav-item-active': item.key === activeNavKey }"
          :to="item.to"
          replace
          draggable="false"
          @dragstart.prevent
        >
          <van-badge v-if="item.key === 'message'" :content="device && device.hms.length > 0 ? device.hms.length : undefined" class="nav-icon">
            <component :is="item.icon" class="nav-icon" />
          </van-badge>
          <component v-else :is="item.icon" class="nav-icon" />
        </RouterLink>
      </aside>

      <main class="main">
        <RouterView />
      </main>
    </div>

    <van-popup
      :show="showPrintError"
      :overlay-style="{ position: 'absolute' }"
      :style="{ position: 'absolute' }"
    >
      <div class="error-popover">
        <i-material-symbols-cancel-outline class="close-icon" @click="showPrintError = false" />
        <div class="col-left">
          <img v-if="errorImage" :src="errorImage" class="error-image" />
          <div class="error-title">
            <i-material-symbols-error-outline />
            {{ t('print_error_warning') }}
          </div>
          <div class="error-text">{{ errorText }}</div>
          <div class="error-code">[{{ errorCode }}]</div>
        </div>
        <div class="col-right">
          <van-button @click="showPrintError = false; handleResume()">{{ t('print_error_continue') }}</van-button>
          <van-button @click="showPrintError = false; router.replace({ name: ROUTE_NAME.MESSAGE })">{{ t('print_error_goto_assistant') }}</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { showDialog } from 'vant'
import semverGt from 'semver/functions/gt'
import { client, getPrinterConnectionMode } from './printer'
import { bindPrinterClient, unbindPrinterClient, usePrinterStore } from './stores/printer'
import { ROUTE_NAME } from './router/routes'
import hmsData from './assets/devicehms_01S.json'
import hmsActionData from './assets/erroractions_01S.json'

import IconHome from '~icons/material-symbols/home-rounded'
import IconTune from '~icons/material-symbols/tune-rounded'
import IconDatabase from '~icons/material-symbols/database'
import IconSettings from '~icons/material-symbols/settings-rounded'
import IconSMS from '~icons/material-symbols/sms-rounded'

const route = useRoute()
const router = useRouter()
const { device, modules } = usePrinterStore()
const { locale, t } = useI18n()

type NavItem = {
  key: string
  to: string
  icon: Component
}

const navItems: NavItem[] = [
  { key: 'home', to: '/home', icon: IconHome },
  { key: 'control', to: '/control', icon: IconTune },
  { key: 'filament', to: '/filament', icon: IconDatabase },
  { key: 'setting', to: '/setting', icon: IconSettings },
  { key: 'message', to: '/message', icon: IconSMS },
]

const activeNavKey = computed(() => {
  const firstSegment = route.path.split('/')[1]
  return firstSegment ?? ''
})

const toFirmwareSemver = (version: string) => version.split('.').slice(0, 3).map(Number).join('.')

onMounted(() => {
  bindPrinterClient()
})

onUnmounted(() => {
  unbindPrinterClient()
})

watch(modules, () => {
  if (getPrinterConnectionMode() !== 'local') return

  const module = modules.value?.find(item => item.name === 'ota')
  if (!module) return
  if (
    ['Bambu Lab P1P', 'Bambu Lab P1S'].includes(module.product_name)
    && semverGt(toFirmwareSemver(module.sw_ver), toFirmwareSemver('01.08.01.00'))
  ) {
    showDialog({ message: t('firmware_not_supported_warning') })
  }
})

const showPrintError = ref(false)

watch(() => device.value?.print_error, () => {
  if (!device.value) return
  if (device.value.print_error === 0) return
  showPrintError.value = true
})

const errorImage = computed(() => {
  if (!device.value) return ''
  const errorInfo = hmsActionData['data'].find((item: any) => item.ecode === errorCode.value.replace(/-/g, ''))
  if (!errorInfo) return ''
  return `/hms/${errorInfo.image}`
})

const errorText = computed(() => {
  if (!device.value) return ''
  const hmsList = hmsData['data']['device_error'][locale.value.startsWith('zh') ? 'zh-cn' : 'en']
  const hmsInfo = hmsList.find((item: any) => item.ecode === errorCode.value.replace(/-/g, ''))
  return hmsInfo?.intro || ''
})
const errorCode = computed(() => device.value ? `${(device.value?.print_error >> 16).toString(16).padStart(4, '0')}-${(device.value?.print_error & 0xffff).toString(16).padStart(4, '0')}`.toUpperCase() : '')

const handleResume = () => {
  client.setResume()
}

</script>

<style scoped>
.app-root {
  width: 100%;
  height: 100%;
}

.app-shell {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  height: 100%;
  overflow: hidden;
}

.unsupported {
  display: none;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: var(--van-text-color);
  font-size: 16px;
}

@supports not ((width: calc(1px + 1px)) and (color: var(--support-probe))) {
  .app-shell {
    display: none;
  }

  .unsupported {
    display: flex;
  }
}

.side-nav {
  display: grid;
  padding: 8px;
  padding-left: calc(8px + env(safe-area-inset-left));
  background: var(--van-background-2);
  height: 100%;
  align-items: center;
}

.nav-item {
  width: 48px;
  height: 48px;
  display: grid;
  align-items: center;
  justify-content: center;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  color: var(--van-text-color-2);
}

.nav-icon {
  width: 24px;
  height: 24px;
}

.nav-item.router-link-active {
  color: var(--van-primary-color);
}

.nav-item.nav-item-active {
  color: var(--van-primary-color);
}

.main {
  height: 100%;
  min-height: 320px;
  padding-right: env(safe-area-inset-right);
  overflow: auto;
}

.van-popup {
  border-radius: 8px;
}

.error-popover {
  position: relative;
  display: grid;
  grid-template-columns: 300px 200px;
  background: var(--van-background-3);
  overflow: hidden;
  min-height: 200px;
}

.close-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  color: var(--van-text-color-3);
  font-size: 18px;
}
.close-icon:active {
  filter: brightness(0.8);
}

.col-left {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: left;
  word-break: break-word;
}

.col-left > * + * {
  margin-top: 4px;
}

.error-image {
  max-width: 300px;
  max-height: 200px;
  align-self: center;
  object-fit: contain;
}

.error-title {
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  color: orange;
}

.error-title > * + * {
  margin-left: 4px;
}

.error-text {
  font-size: 13px;
  color: var(--van-text-color-2);
}

.error-code {
  font-size: 12px;
  color: var(--van-text-color-3);
  font-family: monospace;
}

.col-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  background: var(--van-background);
}

.col-right > * + * {
  margin-top: 8px;
}

.col-right > .van-button {
  width: 100%;
  height: 40px;
  border: 0;
  background-color: var(--van-background-2);
}

@media (orientation: portrait) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .side-nav {
    grid-row: 2;
    grid-auto-flow: column;
    grid-auto-columns: 48px;
    justify-content: space-between;
    justify-items: center;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
    border-top: var(--van-background-3) 1px solid;
  }

  .nav-item {
    width: 40px;
    height: 40px;
  }

  .main {
    grid-row: 1;
    height: auto;
    padding-right: 0;
  }

  .error-popover {
    grid-template-columns: 300px;
    grid-template-rows: 300px 120px;
    padding-top: 20px;
  }
}
</style>
