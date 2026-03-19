<template>
  <div class="controls-page">
    <div class="control-list">
      <ControlButton v-for="item in temps" :key="item.type"
        :icon="item.icon"
        :label="`${item.current.value} / ${item.target.value} ℃`"
        @click="openTempPopup(item.type)"
      />
      <div class="control-row three">
        <ControlButton v-for="item in fans" :key="item.type"
          :icon="WSService.getInstance().getFanSpeed(item.type) !== 0 ? fanOnIcon : fanOffIcon"
          :label="`${item.name}\n${(WSService.getInstance().getFanSpeed(item.type) / 255 * 100).toFixed(0)}%`"
          font-size="12px"
          @click="showFanSpeedPopup = true"
        />
      </div>
      <div class="control-row two">
        <ControlButton :icon="speedIcon" :label="`${getPrintSpeed}%`" @click="showPrintSpeedPopup = true" />
        <ControlButton :icon="lightState ? lightOnIcon : lightOffIcon" :label="'照明'" @click="toggleLight" />
      </div>
    </div>

    <div class="motion-list">
      <XYMotion @move="handleMove" />
      <ZMotion @move="handleMove" />
    </div>

    <EMotion @move="handleMove" />

    <TempKeypadPopup
      v-model:show="showTempPopup"
      :type="tempPopupType"
      @confirm="handleTempConfirm"
    />

    <FanSpeedPopup
      v-model:show="showFanSpeedPopup"
    />

    <PrintSpeedPopup
      v-model:show="showPrintSpeedPopup"
      :value="getPrintSpeedLevel"
      @confirm="handlePrintSpeedConfirm"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { showDialog } from 'vant'
import XYMotion from '../components/XYMotion.vue'
import ZMotion from '../components/ZMotion.vue'
import EMotion from '../components/EMotion.vue'
import TempKeypadPopup from '../components/TempKeypadPopup.vue'
import FanSpeedPopup from '../components/FanSpeedPopup.vue'
import PrintSpeedPopup from '../components/PrintSpeedPopup.vue'
import { device, fans } from '../store/device'
import { WSService } from '../store/ws'

import nozzleTempIcon from '../assets/images/monitor_nozzle_temp.svg'
import nozzleTempActiveIcon from '../assets/images/monitor_nozzle_temp_active.svg'
import bedTempIcon from '../assets/images/monitor_bed_temp.svg'
import bedTempActiveIcon from '../assets/images/monitor_bed_temp_active.svg'
// import frameTempIcon from '../assets/images/monitor_frame_temp.svg'
// import frameTempActiveIcon from '../assets/images/monitor_frame_temp_active.svg'
import speedIcon from '../assets/images/monitor_speed.svg'
import fanOnIcon from '../assets/images/monitor_fan_on.svg'
import fanOffIcon from '../assets/images/monitor_fan_off.svg'
import lightOnIcon from '../assets/images/monitor_lamp_on.svg'
import lightOffIcon from '../assets/images/monitor_lamp_off.svg'
import ControlButton from '../components/ControlButton.vue'

// ------------------------------
// Temperature
const showTempPopup = ref(false)
const tempPopupType = ref<'bed' | 'nozzle' | 'chamber' | undefined>(undefined)
const temps: { type: 'bed' | 'nozzle' | 'chamber', icon: string, activeIcon: string, current: any, target: any }[] = [{
  type: 'nozzle',
  icon: nozzleTempIcon,
  activeIcon: nozzleTempActiveIcon,
  current: computed(() => Math.floor(Number(device.print.nozzle_temper ?? '0'))),
  target: computed(() => Math.floor(Number(device.print.nozzle_target_temper ?? '0'))),
}, {
  type: 'bed',
  icon: bedTempIcon,
  activeIcon: bedTempActiveIcon,
  current: computed(() => Math.floor(Number(device.print.bed_temper ?? '0'))),
  target: computed(() => Math.floor(Number(device.print.bed_target_temper ?? '0'))),
}]

const openTempPopup = (type: 'bed' | 'nozzle' | 'chamber') => {
  tempPopupType.value = type
  showTempPopup.value = true
}

const handleTempConfirm = (type: 'bed' | 'nozzle' | 'chamber' | undefined, value: number) => {
  console.log('[Controls] temp confirm', type, value)
  // TODO set temperature
}

// ------------------------------
// Fan

const showFanSpeedPopup = ref(false)

// ------------------------------
// Speed

const showPrintSpeedPopup = ref(false)

const getPrintSpeed = computed(() => device.print.spd_mag ?? 0)
const getPrintSpeedLevel = computed(() => device.print.spd_lvl ?? 0)

const handlePrintSpeedConfirm = (speedLevel: number) => {
  console.log('[Controls] set print speed', speedLevel)
  if (device.print?.gcode_state === 'IDLE') {
    showDialog({ message: '空闲状态下调整打印速度不生效。' })
  }
  WSService.getInstance().setPrintSpeedLevel(speedLevel)
}

// ------------------------------
// Light

const lightState = computed(() => {
  if (!device.print) return false
  return device.print.lights_report?.find(item => item.node === 'chamber_light')?.mode === 'on'
})

const toggleLight = () => {
  console.log(`[Controls] setLight: on=${!lightState.value}`)
  WSService.getInstance().setLight(!lightState.value)
}

// ------------------------------
// Motion

const handleMove = (axis: 'home' | 'x' | 'y' | 'z' | 'e', step: -10 | -1 | 0| 1 | 10) => {
  console.log('[XYMotion] move', axis, step)
  // TODO move x/y/z/e
}

</script>

<style scoped>
.controls-page {
  height: 100%;
  border-radius: 12px;
  display: grid;
  grid-template-columns: minmax(170px, 250px) 320px 70px;
  gap: 4px;
  align-items: stretch;
  min-height: 0;
  overflow: hidden;
  color: var(--van-text-color);
}

.control-list {
  background: var(--van-background-2);
  border-radius: 12px;
  padding: 10px;
  height: 100%;
  gap: 8px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.control-list > .control-button {
  flex-direction: row;
}

.control-row {
  display: grid;
  gap: 8px;
}

.control-row.two {
  grid-template-columns: 1fr 1fr;
}

.control-row.three {
  grid-template-columns: 1fr 1fr 1fr;
}

.control-row.three span {
  font-size: 12px;
}

.motion-list {
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 4px;
  height: 100%;
  min-height: 0;
}
</style>
