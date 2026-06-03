<template>
  <BasePage :title="t('edit_device')">
  <div class="device-manage-page">
    <van-cell-group inset>
      <van-field
        v-model.trim="name"
        :readonly="isCloudDevice"
        :class="{ 'readonly-cell': isCloudDevice }"
        :label="t('device_name')"
        :placeholder="t('device_name')"
        autocomplete="off"
        input-align="right"
        enterkeyhint="next"
        @keydown.enter.prevent="ipInputRef?.focus()"
      />
      <van-field
        v-model.trim="serial"
        readonly
        class="readonly-cell"
        :label="t('serial_number')"
        :placeholder="t('serial_number')"
        autocomplete="off"
        input-align="right"
        enterkeyhint="next"
        @keydown.enter.prevent="ipInputRef?.focus()"
      />
      <van-cell v-if="isCloudDevice" :title="t('region')" :value="sourceLabel" class="readonly-cell" />
      <van-cell
        :title="t('connection_mode')"
        :value="connectionModeLabel"
        :class="{ 'readonly-cell': !isCloudDevice }"
        :is-link="isCloudDevice"
        :clickable="isCloudDevice"
        @click="handleConnectionModeClick"
      />
      <van-field
        ref="ipInputRef"
        v-model.trim="ip"
        :readonly="isCloudDevice"
        :class="{ 'readonly-cell': isCloudDevice }"
        :label="t('ip_address')"
        :placeholder="t('ip_address')"
        autocomplete="off"
        input-align="right"
        enterkeyhint="next"
        @keydown.enter.prevent="codeInputRef?.focus()"
      />
      <van-field
        ref="codeInputRef"
        v-model.trim="code"
        :readonly="isCloudDevice"
        :class="{ 'readonly-cell': isCloudDevice }"
        :label="t('pairing_code')"
        :placeholder="t('pairing_code')"
        autocomplete="off"
        input-align="right"
        enterkeyhint="done"
        @keydown.enter.prevent="codeInputRef?.blur()"
      />
    </van-cell-group>

    <van-cell-group inset>
      <van-cell
        :title="t('save')"
        class="save-btn"
        :clickable="canSave"
        @click="handleSave"
      />
      <van-cell :title="t('delete')" class="delete-btn" @click="handleDelete" />
    </van-cell-group>
  </div>

  <van-action-sheet
    v-model:show="showConnectionModeSheet"
    :description="t('connection_mode')"
    :cancel-text="t('cancel')"
    :actions="connectionModeActions"
    @select="handleConnectionModeSelect"
  />
  </BasePage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { client, connectPrinter } from '../../printer'
import { ROUTE_NAME } from '../../router/routes'
import {
  addDevice,
  getCurrentDevice,
  getDevices,
  removeDevice,
  setCurrentDevice,
  type DeviceConnectionMode,
} from '../../utils/device'
import { markDeviceListPopupRestore } from '../../utils/navigation'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const routeSerial = route.params.serial as string
const stored = getDevices().find(item => item.serial === routeSerial) ?? null
const source = computed(() => stored?.from ?? 'local')
const isCloudDevice = computed(() => source.value !== 'local')
const sourceLabel = computed(() => {
  if (source.value === 'china') return t('region_china')
  if (source.value === 'global') return t('region_global')
  return ''
})
const name = ref(stored?.name || '')
const ip = ref(stored?.ip || '')
const serial = ref(stored?.serial || routeSerial || '')
const code = ref(stored?.code || '')
const connectMode = ref<DeviceConnectionMode>(isCloudDevice.value ? stored?.connect ?? 'cloud' : 'local')
const showConnectionModeSheet = ref(false)
const ipInputRef = ref<HTMLElement | null>(null)
const codeInputRef = ref<HTMLElement | null>(null)
const canSave = computed(() => Boolean(name.value && ip.value && serial.value && code.value))
const connectionModeLabel = computed(() => {
  if (!isCloudDevice.value || connectMode.value === 'local') return t('device_source_local')
  return t('device_source_cloud')
})
const connectionModeActions = computed(() => [
  { name: t('device_source_cloud'), value: 'cloud' as const },
  { name: t('device_source_local'), value: 'local' as const },
])

onBeforeRouteLeave((to) => {
  if (to.name === ROUTE_NAME.SETTING_HOME) {
    markDeviceListPopupRestore()
  }
})

const handleSave = () => {
  if (!canSave.value) return
  const device = {
    connect: connectMode.value,
    from: source.value,
    name: name.value,
    ip: ip.value,
    serial: serial.value,
    code: code.value,
  }
  addDevice(device)
  setCurrentDevice(serial.value)
  connectPrinter(device)
  router.back()
  showToast({
    message: t('save_success'),
    position: 'bottom',
  })
}

const handleConnectionModeClick = () => {
  if (!isCloudDevice.value) return
  showConnectionModeSheet.value = true
}

const handleConnectionModeSelect = (action: { name: string, value: DeviceConnectionMode }) => {
  connectMode.value = action.value
  showConnectionModeSheet.value = false
}

const handleDelete = () => {
  if (!serial.value) return
  removeDevice(serial.value)
  const current = getCurrentDevice()
  if (!current) {
    client.disconnect()
  } else {
    connectPrinter(current)
  }
  router.back()
  showToast({
    message: t('delete_success'),
    position: 'bottom',
  })
}

</script>

<style scoped>
.device-manage-page {
  display: grid;
  gap: 10px;
  overflow: auto;

  --van-cell-value-color: var(--van-text-color);
}

.readonly-cell {
  --van-cell-value-color: var(--van-text-color-3);
  --van-field-input-text-color: var(--van-text-color-3);
}

.save-btn {
  color: var(--van-blue);
  opacity: 0.5;
}

.save-btn.van-cell--clickable {
  opacity: 1;
}

.delete-btn {
  color: var(--van-red);
}
</style>
