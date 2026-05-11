<template>
  <div class="control-page">
    <img src="../../assets/images/printer-inside.png" class="background-image" />
    <div class="control-grid">
      <div class="card fan-card" clickable @click="showFanSpeedPopup = true">
        <div class="card-icon">
          <img :src="fanOffIcon" />
        </div>
        <div class="card-title">风扇</div>
        <div class="card-value">{{ fanStatusText }}</div>
        <i-material-symbols-chevron-right-rounded class="arrow" />
      </div>

      <div class="card speed-card" clickable @click="showPrintSpeedPopup = true">
        <div class="card-icon">
          <i-material-symbols-swap-driving-apps-wheel />
          <!-- <img src="../../assets/images/monitor_speed.svg" /> -->
        </div>
        <div class="card-title">速度</div>
        <div class="card-value">{{ speedText }}</div>
        <i-material-symbols-chevron-right-rounded class="arrow" />
      </div>

      <div class="card motion-card" clickable @click="router.push({ name: ROUTE_NAME.CONTROL_MOTION })">
        <div class="card-icon">
          <i-material-symbols-open-with-rounded />
        </div>
        <div class="card-title">运动</div>
        <div class="card-value">XYZ</div>
        <i-material-symbols-chevron-right-rounded class="arrow" />
      </div>

      <div class="card nozzle-card" clickable @click="router.push({ name: ROUTE_NAME.CONTROL_NOZZLE })">
        <div class="card-head">
          <div class="card-icon">
            <img :src="nozzleOffIcon" />
          </div>
          <div class="card-title">喷嘴和挤出机</div>
          <i-material-symbols-chevron-right-rounded class="arrow" />
        </div>
        <div class="nozzle-temp">
          <img class="nozzle-image" src="../../assets/images/extruder_normal_23.png" />
          <span>{{ nozzleTempText }}</span>
        </div>
      </div>

      <div class="card heatbed-card" clickable @click="openTempPopup">
        <div class="card-icon">
          <img :src="bedOffIcon" />
        </div>
        <div class="card-title">热床</div>
        <div class="card-value">{{ bedTempText }}</div>
        <i-material-symbols-chevron-right-rounded class="arrow" />
      </div>

    </div>
    <div class="card light-card">
      <div class="light-content">
        <div class="light-left">
          <img class="lightbulb" :src="lightSwitchValue ? lightOnIcon : lightOffIcon" />
          <span>照明</span>
        </div>
        <van-switch
          :model-value="lightSwitchValue"
          size="22"
          @update:model-value="handleLightSwitch"
        />
      </div>
    </div>

    <TempKeypadPopup
      v-model:show="showTempPopup"
      :type="TemperatureType.Heatbed"
      @confirm="handleTempConfirm"
    />

    <FanSpeedPopup
      v-model:show="showFanSpeedPopup"
    />

    <PrintSpeedPopup
      v-model:show="showPrintSpeedPopup"
      :value="printSpeedLevel"
      @confirm="handlePrintSpeedConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ROUTE_NAME } from '../../router/routes'
import { showDialog } from 'vant'
import { FanType, GcodeState, LightType, PrintSpeedLevel, TemperatureType } from '../../api/enums'
import { PrinterClient, PrinterEvent } from '../../api/PrinterClient'

import fanOffIcon from '../../assets/images/monitor_fan_off.svg'
import nozzleOffIcon from '../../assets/images/monitor_nozzle_temp.svg'
import bedOffIcon from '../../assets/images/monitor_bed_temp.svg'
import lightOnIcon from '../../assets/images/monitor_lamp_on.svg'
import lightOffIcon from '../../assets/images/monitor_lamp_off.svg'

const router = useRouter()
const client = PrinterClient.getInstance()
const device = ref(client.device.print)
const lightState = computed(() => device.value?.lights_report?.find(item => item.node === LightType.Chamber)?.mode === 'on')
const lightSwitchValue = ref(lightState.value)

onMounted(() => {
  client.on(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

onUnmounted(() => {
  client.off(PrinterEvent.PRINT_PUSH_STATUS, onPushStatus)
})

const onPushStatus = (params: any) => {
  device.value = client.device.print
  if (params?.lights_report) {
    lightSwitchValue.value = lightState.value
  }
}

const showTempPopup = ref(false)
const showFanSpeedPopup = ref(false)
const showPrintSpeedPopup = ref(false)

const openTempPopup = () => {
  showTempPopup.value = true
}

const handleTempConfirm = (type: TemperatureType | undefined, value: number) => {
  if (!type) return
  console.log(`[ControlPage] set temperature type=${type}, value=${value}`)
  client.setTemperature(type, value)
}

const printSpeedLevel = computed(() => device.value?.spd_lvl)

const handlePrintSpeedConfirm = (speedLevel: number) => {
  if ([GcodeState.Idle, GcodeState.Finish].includes(device.value?.gcode_state ?? GcodeState.Unknown)) {
    showDialog({ message: '空闲状态下调整打印速度不生效。' })
    return
  }
  client.setPrintSpeedLevel(speedLevel)
}

const handleLightSwitch = (value: boolean) => {
  lightSwitchValue.value = value
  client.setLight(LightType.Chamber, value)
}

const speedText = computed(() => {
  const speed = [{
    label: '狂暴',
    value: PrintSpeedLevel.Ludicrous,
  }, {
    label: '运动',
    value: PrintSpeedLevel.Sport,
  }, {
    label: '标准',
    value: PrintSpeedLevel.Standard,
  }, {
    label: '静音',
    value: PrintSpeedLevel.Silent,
  }].filter(item => item.value === device.value?.spd_lvl)
  return (speed.length > 0) ? speed[0].label : ''
})

const activeFanCount = () => [FanType.Part, FanType.Aux, FanType.Chamber].filter(type => client.getFanSpeed(type) > 0).length
const fanStatusText = computed(() => {
  if (!device.value) return ''
  const count = activeFanCount()
  return count === 0 ? '无风扇开启' : `${count}风扇开启`
})

const nozzleTempText = computed(() => device.value ? `${Math.floor(device.value.nozzle_temper ?? 0)}°C/${Math.floor(device.value.nozzle_target_temper ?? 0)}°C` : '')
const bedTempText = computed(() => device.value ? `${Math.floor(device.value.bed_temper ?? 0)}°C/${Math.floor(device.value.bed_target_temper ?? 0)}°C` : '')
</script>

<style scoped>
.control-page {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 100%;
  padding: 12px;
  box-sizing: border-box;
  overflow: hidden;
}

.background-image {
  position: absolute;
  right: 0;
  bottom: 0;
  height: calc(100% - 40px);
  width: auto;
  object-fit: contain;
  opacity: 0.7;
}

.control-grid {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 4fr) minmax(0, 3fr) minmax(0, 3fr);
  grid-template-rows: 60px 100px 60px 1fr;
  grid-template-areas:
    'fan speed motion'
    'nozzle . .'
    'bed . .'
    '. . .';
}

.card {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 24px;
  grid-template-rows: 1fr 1fr;
  align-items: center;
  align-content: center;
  column-gap: 8px;
  padding: 10px 12px;
  text-align: left;
}

.card > .card-icon {
  grid-column: 1;
  grid-row: 1 / 3;
  align-self: center;
}

.card > .arrow {
  grid-column: 3;
  grid-row: 1 / 3;
  align-self: center;
  justify-self: center;
}

.card > .card-title {
  grid-column: 2;
  grid-row: 1;
  align-self: end;
  margin-left: 0;
  white-space: nowrap;
}

.card > .card-value {
  grid-column: 2;
  grid-row: 2;
  margin: 0;
  min-height: 20px;
  display: flex;
  align-items: center;
  align-self: start;
}

.card-head {
  display: grid;
  grid-template-columns: 34px 1fr auto;
  align-items: center;
  gap: 8px;
  height: 34px;
}

.card-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--van-background-4);
  display: grid;
  place-items: center;
  font-size: 20px;
}

.card-title {
  color: var(--van-text-color-2);
  font-size: 13px;
  line-height: 18px;
}

.card-icon > img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  opacity: 0.8;
}

.card-icon > svg {
  color: var(--van-text-color-3);
}

.arrow {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  align-self: center;
  justify-self: center;
  color: var(--van-text-color-2);
  font-size: 20px;
  line-height: 1;
}

.card-value {
  margin-left: 42px;
  margin-top: 2px;
  font-size: 15px;
  line-height: 20px;
  white-space: nowrap;
  color: var(--van-text-color);
}

.fan-card { grid-area: fan; }
.speed-card { grid-area: speed; }
.motion-card { grid-area: motion; }
.nozzle-card { grid-area: nozzle; }
.heatbed-card { grid-area: bed; }


.nozzle-card {
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  align-items: initial;
}

.nozzle-card .card-head {
  margin: 8px 0;
  width: 100%;
  grid-template-columns: 34px minmax(0, 1fr) 24px;
}

.nozzle-temp {
  margin: 4px 0;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--van-text-color);
  font-size: 16px;
  line-height: 20px;
}

.nozzle-image {
  width: 32px;
  height: 32px;
  object-fit: contain;
  margin-right: 6px;
}

.light-content {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
}

.light-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--van-text-color);
}

.lightbulb {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.light-card {
  display: block;
  position: absolute;
  right: 10px;
  bottom: 10px;
  bottom: calc(10px + env(safe-area-inset-bottom));
  width: 140px;
  height: 40px;
  padding: 8px 10px;
  z-index: 20;
}

@media (orientation: portrait) {
  .background-image {
    width: calc(100% - 40px);
    height: auto;
  }

  .control-grid {
    grid-template-columns: minmax(0, 6fr) minmax(0, 4fr);
    grid-template-rows: 60px 60px 100px;
    grid-template-areas:
      'fan speed'
      'bed motion'
      'nozzle .';
  }

}
</style>
