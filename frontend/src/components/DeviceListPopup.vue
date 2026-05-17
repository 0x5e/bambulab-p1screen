<template>
  <BasePopup
    :show="show"
    :title="t('device_list')"
    @update:show="emit('update:show', $event)"
  >
    <template #header-right>
      <van-button
        class="header-action-btn"
        type="primary"
        size="normal"
        :disabled="devices.length === 0"
        @click="toggleMode"
      >
        {{ isEditMode ? t('cancel') : t('edit') }}
      </van-button>
    </template>

    <div class="device-list-content">
      <van-cell-group inset>
        <van-cell
          v-for="device in devices"
          :key="device.serial"
          class="device-cell"
          :title="device.name || device.serial"
          :is-link="isEditMode"
          @click="handleCellClick(device.serial)"
        >
          <template v-if="!isEditMode && device.serial === currentSerial" #right-icon>
            <i-material-symbols-check-rounded class="check-icon" />
          </template>
        </van-cell>
      </van-cell-group>

      <van-cell-group inset>
        <van-cell :title="t('add_device')" class="add-device-cell device-cell" @click="router.push({ name: ROUTE_NAME.SETTING_DEVICE_ADD })" />
      </van-cell-group>
    </div>
  </BasePopup>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { connectPrinter } from '../printer'
import { getCurrentDevice, setCurrentDevice, getDevices } from '../utils/device'
import { showToast } from 'vant'
import { ROUTE_NAME } from '../router/routes'

const { t } = useI18n()

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void
}>()

const router = useRouter()
const isEditMode = ref(false)
const devices = ref(getDevices())
const currentSerial = ref(getCurrentDevice()?.serial ?? '')

const refresh = () => {
  devices.value = getDevices()
  currentSerial.value = getCurrentDevice()?.serial ?? ''
}

const toggleMode = () => {
  isEditMode.value = !isEditMode.value
}

const handleCellClick = (serial: string) => {
  if (isEditMode.value) {
    router.push({ name: ROUTE_NAME.SETTING_DEVICE_EDIT, params: { serial } })
  } else {
    if (currentSerial.value === serial) return
    currentSerial.value = serial
    setCurrentDevice(serial)
    const current = getCurrentDevice()
    if (current) {
      connectPrinter(current)
    }
    showToast({
      message: t('switch_success'),
      position: 'bottom',
    })
  }
}

watch(
  () => props.show,
  (visible) => {
    if (!visible) {
      isEditMode.value = false
      return
    }
    refresh()
  }
)
</script>

<style scoped>
.check-icon {
  width: 18px;
  height: 18px;
  color: var(--van-primary-color);
  align-self: center;
}

.device-list-content {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
  margin-bottom: calc(12px + env(safe-area-inset-bottom));
}

.header-action-btn {
  width: 80px;
  height: 32px;
  font-size: 16px;
}

.van-cell-group {
  margin: 0;
}

.device-cell {
  height: 44px;
  width: 220px;
}

.add-device-cell {
  color: var(--van-blue);
}

@media (orientation: portrait) {
  .device-cell {
    width: auto;
  }
}
</style>
