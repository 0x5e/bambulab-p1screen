<template>
  <BaseSubPage :title="t('edit_filament')">
    <div class="filament-edit-card">
      <div class="form-row form-filament">
        <label class="form-label">{{ t('filament') }}</label>
        <select class="manufacturer" v-model="manufacturer" :disabled="isReadonly || isCustomFilament" @change="onManufacturerChange">
          <option v-for="item in manufacturerList" :key="item" :value="item">{{ item }}</option>
          <option v-if="isCustomFilament" value="Custom">{{ t('custom') }}</option>
        </select>
        <select class="filament" v-model="filamentId" :disabled="isReadonly || isCustomFilament">
          <option v-for="item in getFilamentListOf(manufacturer)" :key="item.filament_id" :value="item.filament_id">{{ item.filament_name }}</option>
          <option v-if="manufacturer === 'Custom' && isCustomFilament" :value="tray?.tray_info_idx">{{ tray?.tray_type }}</option>
        </select>
      </div>

      <div class="form-row form-color">
        <label class="form-label">{{ t('color') }}</label>
        <div class="color-field" @click="showColorPicker = true">
          <div class="color-swatch" :style="{ backgroundColor: hextoRGB(trayColor) }"></div>
          <span v-if="!isReadonly" class="icon-edit" ></span>
        </div>
      </div>

      <div class="form-row form-temperature">
        <label class="form-label">{{ t('nozzle_temperature') }}</label>
        <div class="temperature-field">
          {{ t('temp_min') }}
          <span>{{ isCustomFilament ? tray?.nozzle_temp_min : getSelectedFilament()?.min_temperature || 0 }}</span>
          °C
        </div>
        <div class="temperature-field">
          {{ t('temp_max') }}
          <span>{{ isCustomFilament ? tray?.nozzle_temp_max : getSelectedFilament()?.max_temperature || 0 }}</span>
          °C
        </div>
      </div>

      <div class="form-actions">
        <van-button class="action-btn" plain type="default" @click="handleReset" :disabled="!tray">{{ t('reset') }}</van-button>
        <van-button class="action-btn" type="primary" @click="handleConfirm" :disabled="!(tray && filamentId && filamentId.length > 0)">{{ t('confirm') }}</van-button>
      </div>
    </div>

    <van-overlay :show="showColorPicker" @click="showColorPicker = false">
      <div class="color-picker-wrapper">
        <div @click.stop >
          <span>{{ t('other_colors') }}</span>
          <i-material-symbols-close-rounded @click="showColorPicker = false" />
          <div class="color-grids">
            <div
              v-for="item in filamentColorList"
              :key="item.value"
              class="color-grid"
              :style="{ backgroundColor: hextoRGB(item.value) }"
              @click="handleColorInput(item.value)"
            >
            </div>
          </div>
        </div>
      </div>
    </van-overlay>
  </BaseSubPage>
</template>

<script setup lang="ts">
import { computed, Ref, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { client } from '../../printer'
import filamentList from '../../assets/filament.json'
import filamentColorList from '../../assets/colors.json'
import { colord } from 'colord'
import { usePrinterStore } from '../../stores/printer'

const manufacturerList = [...new Set(filamentList.map(item => item.manufacturer))]

const route = useRoute()
const router = useRouter()

const { device } = usePrinterStore()
const { t } = useI18n()
const amsId = route.params.ams_id as string
const trayId = route.params.tray_id as string

const ams = computed(() => device.value?.ams.ams.find((item) => item.id === amsId))

const tray = computed(() => {
  if (amsId === '255' && trayId === device.value?.vt_tray?.id) {
    return device.value?.vt_tray
  }
  return ams.value?.tray.find((item) => item.id === trayId)
})
const isReadonly = computed(() => tray.value && tray.value?.tag_uid?.length > 0 && tray.value?.tag_uid !== '0000000000000000')

type FilamentVendor = { filament_id: string, filament_name: string, manufacturer: string, material: string, min_temperature: number, max_temperature: number }

const getCurrentFilament = () => {
  const result = filamentList.find(item => item.filament_id === tray.value?.tray_info_idx)
  return result as FilamentVendor || null
}
const getSelectedFilament = () => {
  const result = filamentList.find(item => item.filament_id === filamentId.value)
  return result as FilamentVendor || null
}
const getFilamentListOf = (manufacturer: string) => filamentList.filter(item => item.manufacturer === manufacturer) as FilamentVendor[]
const isCustomFilament = computed(() => getCurrentFilament() === null)

const currentFilament: Ref<FilamentVendor | null> = ref(getCurrentFilament())
const manufacturer = ref(currentFilament.value?.manufacturer || 'Custom')
const filamentId = ref(tray.value?.tray_info_idx)
const trayColor = ref('')
const showColorPicker = ref(false)

const hextoRGB = (color: string) => {
  const parsedColor = colord(`#${color.replace('#', '').slice(0,6)}`)
  return parsedColor.toRgbString() // for compatible
}

watch(device, () => {
  if (!filamentId.value) {
    currentFilament.value = getCurrentFilament()
    manufacturer.value = currentFilament.value?.manufacturer || 'Custom'
    filamentId.value = tray.value?.tray_info_idx
  }
}, { immediate: true })

watch(
  tray,
  (nextTray) => {
    if (!nextTray) return
    trayColor.value = nextTray.tray_color || ''
  },
  { immediate: true }
)

const onManufacturerChange = () => {
  if (manufacturer.value === 'Custom') {
    filamentId.value = isCustomFilament.value ? tray.value?.tray_info_idx : ''
    return
  }
  const list = getFilamentListOf(manufacturer.value)
  if (list.length > 0) {
    filamentId.value = list[0].filament_id
  }
}

const handleColorInput = (color: string) => {
  console.log(`[FilamentEditPage] select color: ${color}`)
  trayColor.value = color.replace('#', '').slice(0, 6) + 'FF'
  showColorPicker.value = false
}

const handleReset = async () => {
  if (!tray.value) return

  try {
    await showConfirmDialog({ 
      message: t('confirm_clear_filament'),
      cancelButtonText: t('cancel'),
      confirmButtonText: t('confirm'),
    })
  } catch {
    return
  }

  const payload = {
    ams_id: Number(amsId),
    tray_id: Number(trayId),
    tray_info_idx: '',
    tray_type: '',
    nozzle_temp_min: 0,
    nozzle_temp_max: 0,
    tray_color: 'FFFFFF00',
  }

  try {
    // TODO: disable button while requesting
    await client.request('print.ams_filament_setting', payload)
    tray.value.tray_info_idx = payload.tray_info_idx
    tray.value.tray_type = payload.tray_type
    tray.value.nozzle_temp_min = String(payload.nozzle_temp_min)
    tray.value.nozzle_temp_max = String(payload.nozzle_temp_max)
    tray.value.tray_color = payload.tray_color
    router.back()
  } catch (error: any) {
    console.error(`[FilamentEditPage] reset failed: ${error.message}`)
    showToast({
      message: t('reset_failed', { message: error.message }),
      position: 'bottom',
    })
  }
}

const handleConfirm = async () => {
  if (!tray.value) return
  const filament = getSelectedFilament() || {
    filament_id: tray.value.tray_info_idx,
    material: tray.value.tray_type,
    min_temperature: Number(tray.value.nozzle_temp_min),
    max_temperature: Number(tray.value.nozzle_temp_max),
  } as FilamentVendor

  const payload = {
    ams_id: Number(amsId),
    tray_id: Number(trayId),
    tray_info_idx: filament.filament_id,
    tray_type: filament.material,
    nozzle_temp_min: filament.min_temperature,
    nozzle_temp_max: filament.max_temperature,
    tray_color: trayColor.value,
  }

  try {
    // TODO: disable button while requesting
    await client.request('print.ams_filament_setting', payload)
    tray.value.tray_info_idx = payload.tray_info_idx
    tray.value.tray_type = payload.tray_type
    tray.value.nozzle_temp_min = String(payload.nozzle_temp_min)
    tray.value.nozzle_temp_max = String(payload.nozzle_temp_max)
    tray.value.tray_color = payload.tray_color
    router.back()
  } catch (error: any) {
    console.error(`[FilamentEditPage] save failed: ${error.message}`)
    showToast({
      message: t('save_failed', { message: error.message }),
      position: 'bottom',
    })
  }
}
</script>

<style scoped>
.filament-edit-card {
  height: 100%;
  display: grid;
  grid-template-rows: repeat(3, auto) 1fr auto;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 8px;
  background: var(--van-background-2);
}

.form-row {
  min-height: 44px;
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));
  justify-content: start;
  align-items: center;
}

.form-label {
  color: var(--van-text-color);
  font-size: 14px;
}

.form-filament select {
  width: 90%;
  height: 36px;
  padding: 8px;
  border-radius: 8px;
  border-width: 0;
  background: var(--van-background-3);
  color: var(--van-text-color);
}

.color-field {
  position: relative;
  width: 60px;
  border: 0;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
}

.color-swatch {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid var(--van-background-5);
}

.icon-edit {
  width: 13px;
  height: 15px;
  mask-image: url(/src/assets/images/ams_editable.svg);
  background-color: var(--van-text-color-2);
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.color-picker-wrapper > div {
  width: 320px;
  padding: 0 8px;
  padding-bottom: 16px;
  background-color: var(--van-background-2);
  border-radius: 8px;

  display: grid;
  grid-template-columns: 80px 1fr 40px;
  grid-template-rows: 40px 1fr;
  align-items: center;
  justify-items: center;
}

.color-picker-wrapper > div > span {
  font-size: 14px;
  font-weight: 500;
  grid-column: 1 / span 2;
  justify-self: start; 
  padding-left: 8px;
}

.color-picker-wrapper > div > svg {
  grid-column: 3;
}

.color-grids {
  grid-column: 1 / -1;

  display: grid;
  grid-template-columns: repeat(6, 32px);
  grid-template-rows: repeat(4, 32px);
  align-items: center;
  justify-items: center;
  gap: 8px;
}

.color-grid {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.temperature-fields {
  display: flex;
  align-items: center;
}

.temperature-field {
  color: var(--van-text-color-2);
  font-size: 13px;
}

.temperature-field > span {
  color: var(--van-text-color);
  font-weight: 500;
  padding-left: 40px;
}

.form-actions {
  justify-self: end;
  display: flex;
  margin-top: auto;
}

.action-btn {
  width: 80px;
  height: 32px;
  margin-right: 8px;
}

@media (orientation: portrait) {
  .filament-edit-card {
    grid-template-rows: repeat(5, auto) 1fr auto;
  }
  .form-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .form-filament select:last-child, .temperature-field:last-child {
    grid-column: 2;
    margin: 8px 0;
  }
  .form-color {
    grid-row: 3;
  }
  .form-temperature {
    grid-row: 4;
  }
  .form-actions {
    grid-row: 6;
  }

  .color-picker-wrapper > div {
    width: 280px;
  }

  .color-grids {
    grid-template-columns: repeat(5, 32px);
    grid-template-rows: repeat(5, 32px);
  }
}

</style>
