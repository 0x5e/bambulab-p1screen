<template>
  <BasePopup
    class="device-list-popup"
    :show="show"
    :title="t('device_list')"
    @update:show="emit('update:show', $event)"
  >
    <template #header-right>
      <i-material-symbols-add-rounded
        class="header-icon-btn"
        :aria-label="t('add_device')"
        role="button"
        tabindex="0"
        @click="handleAddDevice"
        @keydown.enter.prevent="handleAddDevice"
        @keydown.space.prevent="handleAddDevice"
      />
    </template>

    <div class="device-list-content">
      <van-cell-group inset>
        <van-cell
          v-for="device in devices"
          :key="device.serial"
          class="device-cell"
          @click="handleCellClick(device.serial)"
        >
          <template #icon>
            <i-material-symbols-check-rounded
              :class="{ 'check-icon': true, placeholder: device.serial !== currentSerial }"
            />
          </template>

          <template #title>
            <span class="device-title">{{ device.name || device.serial }}</span>
          </template>

          <template #right-icon>
            <div class="device-cell-actions">
              <i-material-symbols-cloud-outline v-if="device.from !== 'local'" class="cloud-icon" />
              <i-material-symbols-info-outline-rounded
                class="info-icon"
                @click.stop="handleEditDevice(device.serial)"
              />
            </div>
          </template>
        </van-cell>
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
const devices = ref(getDevices())
const currentSerial = ref(getCurrentDevice()?.serial ?? '')

const refresh = () => {
  devices.value = getDevices()
  currentSerial.value = getCurrentDevice()?.serial ?? ''
}

const handleAddDevice = () => {
  router.push({ name: ROUTE_NAME.SETTING_DEVICE_ADD })
}

const handleEditDevice = (serial: string) => {
  router.push({ name: ROUTE_NAME.SETTING_DEVICE_EDIT, params: { serial } })
}

const handleCellClick = (serial: string) => {
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

watch(
  () => props.show,
  (visible) => {
    if (visible) refresh()
  }
)
</script>

<style scoped>
:global(.device-list-popup.popup) {
  width: 250px;
}

.device-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check-icon {
  width: 24px;
  height: 24px;
  color: var(--van-primary-color);
  align-self: center;
  flex: 0 0 auto;
  margin-left: -4px;
  margin-right: 4px;
}

.check-icon.placeholder {
  opacity: 0;
}

.device-cell-actions {
  display: flex;
  align-items: center;
}

.device-cell-actions > * + * {
  margin-left: 8px;
}

.cloud-icon,
.info-icon {
  width: 22px;
  height: 22px;
  color: var(--van-text-color-3);
  flex: 0 0 auto;
}

.device-list-content {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
  margin-bottom: calc(12px + env(safe-area-inset-bottom));
}

.header-icon-btn {
  width: 26px;
  height: 26px;
}

.van-cell-group {
  margin: 0;
}

.device-cell {
  height: 44px;
  width: 220px;
}

@media (orientation: portrait) {
  :global(.device-list-popup.popup-bottom) {
    width: 100%;
    min-height: 300px;
  }

  .device-cell {
    width: auto;
  }
}

</style>
