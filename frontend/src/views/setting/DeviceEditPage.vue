<template>
  <BaseSubPage :title="t('edit_device')">
  <div class="device-manage-page">
    <van-cell-group inset>
      <van-cell :title="t('device_source')" :value="sourceLabel" />
      <van-field
        v-model.trim="name"
        :readonly="isCloudDevice"
        :label="t('device_name')"
        :placeholder="t('device_name')"
        autocomplete="off"
        input-align="right"
        enterkeyhint="next"
        @keydown.enter.prevent="ipInputRef?.focus()"
      />
      <van-field
        ref="ipInputRef"
        v-model.trim="ip"
        :readonly="isCloudDevice"
        :label="t('ip_address')"
        :placeholder="t('ip_address')"
        autocomplete="off"
        input-align="right"
        enterkeyhint="next"
        @keydown.enter.prevent="codeInputRef?.focus()"
      />
      <van-field
        v-model.trim="serial"
        readonly
        :label="t('serial_number')"
        :placeholder="t('serial_number')"
        autocomplete="off"
        input-align="right"
        enterkeyhint="next"
        @keydown.enter.prevent="codeInputRef?.focus()"
      />
      <van-field
        ref="codeInputRef"
        v-model.trim="code"
        :readonly="isCloudDevice"
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
        v-if="!isCloudDevice"
        :title="t('save')"
        class="save-btn"
        :clickable="canSave"
        @click="handleSave"
      />
      <van-cell :title="t('delete')" class="delete-btn" @click="handleDelete" />
    </van-cell-group>
  </div>
  </BaseSubPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { client, connectPrinter } from '../../printer'
import { ROUTE_NAME } from '../../router/routes'
import { addDevice, getCurrentDevice, getDevices, removeDevice, setCurrentDevice } from '../../utils/device'
import { markDeviceListPopupRestore } from '../../utils/navigation'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const routeSerial = route.params.serial as string
const stored = getDevices().find(item => item.serial === routeSerial) ?? null
const source = computed(() => stored?.from ?? 'lan')
const isCloudDevice = computed(() => source.value === 'cloud')
const sourceLabel = computed(() => source.value === 'cloud' ? t('device_source_cloud') : t('device_source_lan'))
const name = ref(stored?.name || '')
const ip = ref(stored?.ip || '')
const serial = ref(stored?.serial || routeSerial || '')
const code = ref(stored?.code || '')
const ipInputRef = ref<HTMLElement | null>(null)
const codeInputRef = ref<HTMLElement | null>(null)
const canSave = computed(() => Boolean(name.value && ip.value && serial.value && code.value))

onBeforeRouteLeave((to) => {
  if (to.name === ROUTE_NAME.SETTING_HOME) {
    markDeviceListPopupRestore()
  }
})

const handleSave = () => {
  if (isCloudDevice.value || !canSave.value) return
  const device = {
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
  padding-bottom: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  overflow: auto;
}

:deep(.van-field__control) {
  color: var(--van-text-color-2);
}

:deep(.van-field__control:read-only) {
  color: var(--van-text-color-3);
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
