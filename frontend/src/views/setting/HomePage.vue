<template>
  <div class="settings-container">
    <div class="card square-card account-card" clickable @click="handleManageDevice">
      <i-material-symbols-devices-rounded class="icon-large" />
      <div class="card-label">{{ !deviceItem ? t('add_device') : t('device_management') }}</div>
      <div v-if="deviceItem" class="item-value">
        {{ t('printer_label') }}: {{ deviceItem?.name }}
        <i-material-symbols-chevron-right-rounded />
      </div>
    </div>
    <DeviceListPopup v-model:show="showDeviceListPopup" />

    <div class="card list-item wifi-card">
      <span class="item-label">{{ t('network') }}</span>
      <div class="item-value">
        {{ getStatusLabel() }}
        <i-material-symbols-refresh-rounded class="refresh-btn" v-if="!isConnected" @click="handleReconnect"/>
      </div>
    </div>

    <div class="card list-item usb-card" clickable @click="showToast({ message: t('developing'), position: 'bottom' })">
      <span class="item-label">{{ t('sdcard_storage') }}</span>
      <div v-if="device" class="item-value">
        {{ device?.sdcard ? t('mounted') : t('unmounted') }}
        <i-material-symbols-chevron-right-rounded />
      </div>
    </div>

    <div class="card list-item firmware-card" clickable @click="router.push({ name: ROUTE_NAME.SETTING_FIRMWARE })">
      <span class="item-label">{{ t('firmware') }}</span>
      <div v-if="modules" class="item-value">
        {{ deviceModule?.sw_ver }}
        <i-material-symbols-chevron-right-rounded />
      </div>
    </div>

    <div class="card square-card calibration-card" clickable @click="router.push({ name: ROUTE_NAME.SETTING_CALIBRATION })">
      <i-material-symbols-home-storage-gear-rounded class="icon-large" />
      <div class="card-label">{{ t('calibration') }}</div>
    </div>

    <div class="card square-card toolbox-card" clickable @click="showToast({ message: t('developing'), position: 'bottom' })">
      <i-material-symbols-handyman class="icon-large" />
      <div class="card-label">{{ t('toolbox') }}</div>
    </div>

    <div class="card square-card settings-card" clickable @click="router.push({ name: ROUTE_NAME.SETTING_SETTING })">
      <i-material-symbols-settings-rounded class="icon-large" />
      <div class="card-label">{{ t('settings') }}</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { showToast } from 'vant'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { client, connectPrinter } from '../../printer'
import { ROUTE_NAME } from '../../router/routes'
import { getCurrentDevice } from '../../utils/device'
import { usePrinterStore } from '../../stores/printer'

const router = useRouter()
const { t } = useI18n()

const { device, modules } = usePrinterStore()

const getStatusLabel = () => {
  if (client.lastError?.message === 'Connection refused: Not authorized') return t('connection_auth_failed')
  const c = client.mqttClient
  if (!c) return t('connection_not_connected')
  if (c.connected) return t('connection_connected')
  if (c.disconnecting) return t('connection_disconnecting')
  if (c.reconnecting) return t('connection_reconnecting')
  if (c.disconnected) return t('connection_disconnected')
  return t('unknown')
}

const isConnected = ref(client.mqttClient?.connected || false)
const statusLabel = ref(getStatusLabel())
const deviceModule = computed(() => modules.value?.find(item => item.name === 'ota'))
const deviceItem = ref(getCurrentDevice())
const showDeviceListPopup = ref(false)

watch(
  () => showDeviceListPopup.value,
  (visible, prevVisible) => {
    if (prevVisible && !visible) {
      deviceItem.value = getCurrentDevice()
    }
  }
)

const updateConnectionStatus = () => {
  isConnected.value = client.mqttClient?.connected || false
  statusLabel.value = getStatusLabel()
}

watch([device, modules], updateConnectionStatus, { immediate: true })

const handleManageDevice = () => {
  if (!getCurrentDevice()) {
    router.push({ name: ROUTE_NAME.SETTING_DEVICE_ADD })
  } else {
    showDeviceListPopup.value = true
  }
}

const handleReconnect = () => {
  const storedDevice = getCurrentDevice()
  if (!storedDevice) return
  connectPrinter(storedDevice)
  updateConnectionStatus()
}

</script>
<style scoped>
.settings-container {
  width: 100%;
  height: 100%;
  padding: 16px;
  color: var(--van-text-color);

  display: grid;
  grid-template-columns: minmax(0, 34fr) minmax(0, 33fr) minmax(0, 33fr);
  grid-template-rows: repeat(3, minmax(0, 60px)) minmax(auto, 220px);
  gap: 10px;
}

.account-card {
  grid-column: 1 / 2;
  grid-row: 1 / 4;
}

.wifi-card {
  grid-column: 2 / 4;
  grid-row: 1 / 2;
}

.usb-card {
  grid-column: 2 / 4;
  grid-row: 2 / 3;
}

.firmware-card {
  grid-column: 2 / 4;
  grid-row: 3 / 4;
}

.calibration-card {
  grid-column: 1 / 2;
  grid-row: 4 / 5;
}

.toolbox-card {
  grid-column: 2 / 3;
  grid-row: 4 / 5;
}

.settings-card {
  grid-column: 3 / 4;
  grid-row: 4 / 5;
}

.account-card > svg {
  font-size: 48px;
  border-radius: 50%;
  border: 1px solid var(--van-background-4);
  padding: 10px;
}

.account-card > .card-label {
  margin-bottom: 4px;
}

.account-card > .item-value {
  font-size: 11px;
}

.list-item {
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.item-label {
  font-size: 14px;
}

.item-value {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: var(--van-text-color-2);
}

.square-card {
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.icon-large {
  font-size: 32px;
  color: var(--van-text-color-2);
  margin-bottom: 6px;
}

.card-label {
  font-size: 15px;
}

.refresh-btn {
  margin-left: 6px;
  color: var(--van-text-color-2);
}

@media (orientation: portrait) {
  .settings-container {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: repeat(3, 50px) repeat(2, 150px);
    gap: 16px;
  }

  .wifi-card {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  .usb-card {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .firmware-card {
    grid-column: 1 / -1;
    grid-row: 3;
  }

  .account-card {
    grid-column: 1;
    grid-row: 4;
  }

  .toolbox-card {
    grid-column: 2;
    grid-row: 4;
  }

  .calibration-card {
    grid-column: 1;
    grid-row: 5;
  }

  .settings-card {
    grid-column: 2;
    grid-row: 5;
  }
}

</style>
