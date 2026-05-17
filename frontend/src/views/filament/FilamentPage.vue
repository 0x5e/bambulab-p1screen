<template>
  <div class="filament-page" :class="{ 'filament-page-no-ams': device && device.ams.ams.length === 0 }">
    <div>
      <van-tabs v-if="device && device.ams.ams.length > 1" class="ams-tab" @click-tab="handleClickTab">
        <van-tab
          v-for="i in device.ams.ams.length"
          :key="i"
          :title="`AMS-${amsPrefix(device.ams.ams[i-1].id)}`"
          :name="device.ams.ams[i-1].id"
        />
      </van-tabs>
    </div>
    <div v-if="device && currentAms" class="ams-card">
      <Tray
        v-for="slot in currentAms.tray.length"
        :key="slot"
        :name="`${amsPrefix(currentAms.id)}${slot}`"
        :amsId="Number(currentAms.id)"
        :tray="currentAms.tray[slot - 1]"
        :trayNow="Number(device.ams.tray_now) ?? -1"
        :trayTar="Number(device.ams.tray_tar) ?? -1"
        :trayPrev="Number(device.ams.tray_pre) ?? -1"
        :popoverAction="handleTrayAction"
      />
      <span class="ams-name" >AMS-{{ amsPrefix(currentAms.id) }}</span>
      <div class="ams-info">
        <img :src="humIcon(currentAms.humidity)"/>
        <span>{{ currentAms.humidity_raw }}%</span>
        <span>{{ Math.round(Number(currentAms.temp)).toFixed(0) }}°C</span>
      </div>
      
    </div>
    <div v-if="device && device.vt_tray" class="ext-card">
      <Tray
        name="Ext"
        :amsId="255"
        :tray="device.vt_tray"
        :trayNow="Number(device.ams.tray_now) ?? -1"
        :trayTar="Number(device.ams.tray_tar) ?? -1"
        :trayPrev="Number(device.ams.tray_pre) ?? -1"
        :popoverAction="handleTrayAction"
      />
      <span class="ext-name" >{{ t('external_spool') }}</span>
    </div>
    <div class="setting">
      <van-popover
        v-model:show="showSettingsPopover"
        trigger="manual"
        placement="top-end"
        :actions="settingsActions"
        style="--van-popover-action-width: 100px;"
        @select="handleSettingsSelect"
      >
        <template #reference>
          <button type="button" @click.stop="showSettingsPopover = !showSettingsPopover">
            <i-material-symbols-handyman />
          </button>
        </template>
      </van-popover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { type DeviceTray } from '@bambulab-p1screen/printer-api'
import { PopoverAction, showToast } from 'vant'
import { useRouter } from 'vue-router'
import { client } from '../../printer'
import { ROUTE_NAME } from '../../router/routes'
import { amsPrefix } from '../../utils/ams'
import { humIcon } from '../../utils/icon'
import { usePrinterStore } from '../../stores/printer'

const router = useRouter()
const { t } = useI18n()

const { device } = usePrinterStore()
const currentAmsId = ref<string | undefined>(device.value && device.value.ams.ams.length > 0 ? device.value.ams.ams[0].id : undefined)
const currentAms = computed(() => device.value?.ams.ams.find(ams => ams.id === currentAmsId.value))
const showSettingsPopover = ref(false)
const settingsActions: PopoverAction[] = [{ type: 'auto-refill', text: t('auto_refill') }]

watch(device, () => {
  if (!currentAmsId.value && device.value && device.value.ams.ams.length > 0) {
    currentAmsId.value = device.value.ams.ams[0].id
  }
}, { immediate: true })

const handleTrayAction = (amsId: number, tray: DeviceTray, action: PopoverAction) => {
  console.log(`[Tray] type=${action.type}, amsId=${amsId}, tray=${JSON.stringify(tray)}`)
  switch (action.type) {
    case 'edit':
      router.push({ name: ROUTE_NAME.FILAMENT_EDIT, params: { ams_id: amsId, tray_id: tray.id } })
      break
    case 'load':
      if (Number(tray.id) === 254) {
        client.request('print.ams_change_filament', {
          ams_id: 255,
          slot_id: 0,
          target: 0,
          curr_temp: -1,
          tar_temp: -1,
        })
      } else {
        client.request('print.ams_change_filament', {
          ams_id: amsId,
          slot_id: Number(tray.id),
          target: Number(tray.id),
          curr_temp: -1,
          tar_temp: -1,
        })
      }
      break
    case 'unload':
      client.request('print.ams_change_filament', {
        ams_id: 255,
        slot_id: 255,
        target: 255,
        curr_temp: -1,
        tar_temp: -1,
      })
      break
    case 'reload':
      client.request('print.ams_get_rfid', { ams_id: amsId, slot_id: Number(tray.id) })
      break
    default:
      break
  }
}

const handleClickTab = ({name}: {name: string}) => {
  currentAmsId.value = name
}

const handleSettingsSelect = (action: PopoverAction) => {
  console.log(`[FilamentPage] settings action: ${action.type}`)
  showSettingsPopover.value = false
  if (action.type === 'auto-refill') {
    showToast({ message: t('developing'), position: 'bottom' })
  }
}
</script>

<style scoped>
.filament-page {
  height: 100%;
  position: relative;
  padding: 16px;
  padding-bottom: calc(30px + 16px);
  padding-bottom: calc(30px + 16px + env(safe-area-inset-bottom));

  display: grid;
  grid-template-rows: 30px 150px;
  grid-template-columns: repeat(2, auto);
  align-content: center;
  align-items: center;
  justify-content: space-around;
}

.filament-page-no-ams {
  grid-template-columns: auto;
}

.ams-tab {
  width: calc(60px * 4 + 18px);
  margin: 16px;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.ams-tab > .van-tabs__wrap) {
  height: 30px;
}

:deep(.ams-tab .van-tab) {
  font-size: 12px;
}

.ams-card, .ext-card {
  grid-row: 2;
  display: grid;
  grid-template-rows: auto 20px 0;
  margin: 16px;
  padding: 8px;
  border-radius: 8px;
  border: var(--van-background-4) 1px solid;
  background-color: var(--van-background-2);
}

.ams-card {
  width: calc(60px * 4 + 18px);
  grid-template-columns: repeat(4, 60px);
}

.ext-card {
  width: calc(60px + 18px);
  grid-template-columns: 60px;
}

.ams-name, .ext-name {
  grid-column: 1 / -1;
  padding: 0 8px;
  margin: 0 -8px;
  margin-top: 10px;

  font-size: 12px;
  line-height: 20px;
  height: 20px;
  background-color: var(--van-background-3);
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  border-bottom: var(--van-background-4) 1px solid;
  overflow: hidden;
}

.ams-info {
  position: relative;
  width: 32px;
  height: 64px;
  left: 236px;
  bottom: 44px;
  border-radius: 16px;
  border: var(--van-background-3) 1px solid;
  background-color: var(--van-background);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.ams-info > img {
  width: 20px;
  height: 20px;
}
.ams-info > span {
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  text-align: center;
}
.ams-info > span:last-child {
  font-size: 9px;
  font-weight: normal;
  line-height: 10px;
  color: var(--van-text-color-2);
}

.setting {
  position: absolute;
  right: 16px;
  bottom: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom));
}

.setting button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--van-background-3);
  color: var(--van-text-color);
}

@media (orientation: portrait) {
  .filament-page {
    grid-template-rows: 40px 150px 150px;
    grid-template-columns: auto;
    align-content: initial;
  }
  .ams-card, .ext-card {
    grid-row: auto;
  }
}
</style>
