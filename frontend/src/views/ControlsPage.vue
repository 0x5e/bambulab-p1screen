<template>
  <div class="controls-page">
    <div class="control-list">
      <ControlButton v-for="item in temps" :key="item.type"
        :icon="item.icon.value"
        :label="`${item.current.value} / ${item.target.value} ℃`"
        @click="openTempPopup(item.type)"
      />
      <div class="control-row three">
        <ControlButton v-for="item in fans" :key="item.type"
          :icon="client.getFanSpeed(item.type) !== 0 ? fanOnIcon : fanOffIcon"
          :label="`${item.name}\n${(client.getFanSpeed(item.type) / 255 * 100).toFixed(0)}%`"
          font-size="12px"
          @click="showFanSpeedPopup = true"
        />
      </div>
      <div class="control-row two">
        <ControlButton :icon="speedIcon" :label="getPrintSpeed" @click="showPrintSpeedPopup = true" />
        <ControlButton :icon="lightState ? lightOnIcon : lightOffIcon" :label="'照明'" @click="toggleLight" />
      </div>
    </div>

    <div class="motion-list">
      <XYMotion @move="handleMove" />
      <ZMotion @move="handleMove" />
    </div>

    <EMotion class="motion-extruder" @move="handleMove" />

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
import { computed, ComputedRef, ref } from 'vue'
import { showDialog } from 'vant'
import XYMotion from '../components/XYMotion.vue'
import ZMotion from '../components/ZMotion.vue'
import EMotion from '../components/EMotion.vue'
import TempKeypadPopup from '../components/TempKeypadPopup.vue'
import FanSpeedPopup from '../components/FanSpeedPopup.vue'
import PrintSpeedPopup from '../components/PrintSpeedPopup.vue'
import { FanType, TemperatureType, LightType, GcodeState } from '../api/enums'
import { PrinterClient } from '../api/PrinterClient'

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

const client = PrinterClient.getInstance()
const device = client.device

// ------------------------------
// Temperature
const showTempPopup = ref(false)
const tempPopupType = ref<TemperatureType | undefined>(undefined)
type TempItem = {
  type: TemperatureType
  icon: ComputedRef<string>
  current: ComputedRef<number>
  target: ComputedRef<number>
}
const temps: TempItem[] = [{
  type: TemperatureType.Nozzle,
  icon: computed(() => (Math.floor(Number(device.print.nozzle_target_temper ?? '0')) - Math.floor(Number(device.print.nozzle_temper ?? '0')) > 2) ? nozzleTempActiveIcon : nozzleTempIcon),
  current: computed(() => Math.floor(Number(device.print.nozzle_temper ?? '0'))),
  target: computed(() => Math.floor(Number(device.print.nozzle_target_temper ?? '0'))),
}, {
  type: TemperatureType.Heatbed,
  icon: computed(() => (Math.floor(Number(device.print.bed_target_temper ?? '0')) - Math.floor(Number(device.print.bed_temper ?? '0')) > 2) ? bedTempActiveIcon : bedTempIcon),
  current: computed(() => Math.floor(Number(device.print.bed_temper ?? '0'))),
  target: computed(() => Math.floor(Number(device.print.bed_target_temper ?? '0'))),
}]

const openTempPopup = (type: TemperatureType) => {
  tempPopupType.value = type
  showTempPopup.value = true
}

const handleTempConfirm = (type: TemperatureType | undefined, value: number) => {
  if (!type) return

  console.log('[Controls] set temperature', type, value)
  client.setTemperature(type, value)
}

// ------------------------------
// Fan

const showFanSpeedPopup = ref(false)

const fans: { type: FanType, name: string }[] = [{
  type: FanType.Part,
  name: '部件'
}, {
  type: FanType.Aux,
  name: '辅助'
}, {
  type: FanType.Chamber,
  name: '机箱'
}]

// ------------------------------
// Speed

const showPrintSpeedPopup = ref(false)

const getPrintSpeed = computed(() => ['0%', '50%', '100%', '124%', '166%'][Number(device.print.spd_lvl ?? '')])
const getPrintSpeedLevel = computed(() => device.print.spd_lvl)

const handlePrintSpeedConfirm = (speedLevel: number) => {
  console.log('[Controls] set print speed', speedLevel)
  if (device.print.gcode_state === GcodeState.Idle) {
    showDialog({ message: '空闲状态下调整打印速度不生效。' })
  }
  client.setPrintSpeedLevel(speedLevel)
}

// ------------------------------
// Light

const lightState = computed(() => {
  if (!device.print) return false
  return device.print.lights_report?.find(item => item.node === LightType.Chamber)?.mode === 'on'
})

const toggleLight = () => {
  console.log(`[Controls] setLight: on=${!lightState.value}`)
  client.setLight(!lightState.value)
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
  display: grid;
  grid-template-columns: minmax(170px, 190px) minmax(0, calc(var(--app-height, 100vh) - 48px)) 70px;
  gap: 4px;
  padding: 4px;
  color: var(--van-text-color);
}

.control-list {
  background: var(--van-background-2);
  border-radius: 12px;
  padding: 8px;
  height: 100%;
  gap: 8px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.control-list > .control-button {
  justify-content: space-between;
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

@media (orientation: portrait) {
  .controls-page {
    grid-template-columns: minmax(0, 1fr) 70px;
    grid-template-rows: auto auto;
    align-items: stretch;
    height: auto;
    padding-bottom: 4px;
  }

  .control-list {
    grid-column: 1 / 3;
    grid-row: 1;
    height: auto;
  }

  .motion-list {
    grid-column: 1;
    grid-row: 2;
    height: auto;
  }

  .motion-extruder {
    grid-column: 2;
    grid-row: 2;
    align-self: stretch;
  }
}
</style>
