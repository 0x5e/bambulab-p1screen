<template>
  <div class="homepage">
    <div class="task-card">
      <img class="task-thumbnail" :src="getPrintThumbnail"/>
      <span class="task-name">{{ taskName }}</span>
    </div>
    <div class="printer-card" :style="{ backgroundImage: `url(${p1sThumbnail})`}">
      <span id="nozzle-temp">{{ nozzleTemp }} ℃</span>
      <span id="heatbed-temp">{{ heatbedTemp }} ℃</span>
      <span id="wifi-signal"><img :src="getWifiSignalIcon"/></span>
    </div>
    <div class="progress-card">
      <div class="progress-card-left">
        <div class="progress-labels">
          <span>{{ getPrintPercent }} %</span>
          <span>{{ getPrintInfo }}</span>
        </div>
        <van-progress :percentage="getPrintPercent" :show-pivot="false" />
        <span class="progress-status">{{ getPrintStateLabel }}</span>
      </div>
      <div v-if="showPrintActions" class="progress-card-buttons">
        <ControlButton v-if="!isPaused" :icon="pauseIcon" label="暂停" @click="handlePause" />
        <ControlButton v-if="isPaused" :icon="resumeIcon" label="继续" @click="handleResume" />
        <ControlButton :icon="stopIcon" label="停止" @click="handleStop" />
      </div>
    </div>
    <ControlButton class="light-button" :icon="lightState ? lightOnIcon : lightOffIcon" label="照明" @click="toggleLight" />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import humanizeDuration from 'humanize-duration'
import { PrinterClient } from '../api/PrinterClient'
import { LightType, GcodeState, CURRENT_STAGE_IDS } from '../api/enums'
import ControlButton from '../components/ControlButton.vue'

import lightOnIcon from '../assets/images/monitor_lamp_on.svg'
import lightOffIcon from '../assets/images/monitor_lamp_off.svg'
import pauseIcon from '../assets/images/print_control_pause.svg'
import resumeIcon from '../assets/images/print_control_resume.svg'
import stopIcon from '../assets/images/print_control_stop.svg'
import sdcardThumbnail from '../assets/images/monitor_sdcard_thumbnail.png'
import p1sThumbnail from '../assets/images/printer_thumbnail_p1s_png.png'
import signalNoIcon from '../assets/images/monitor_signal_no.svg'
import signalWeakIcon from '../assets/images/monitor_signal_weak.svg'
import signalMiddleIcon from '../assets/images/monitor_signal_middle.svg'
import signalStrongIcon from '../assets/images/monitor_signal_strong.svg'

const client = PrinterClient.getInstance()
const device = client.device

const taskName = computed(() => device.print.subtask_name || '')
const nozzleTemp = computed(() => Math.floor(Number(device.print.nozzle_temper ?? '0')))
const heatbedTemp = computed(() => Math.floor(Number(device.print.bed_temper ?? '0')))

const getWifiSignalIcon = computed(() => {
  if (client.readyState.value !== WebSocket.OPEN) {
    return signalNoIcon
  }

  const percent = client.getWifiSignalPercentage()
  if (percent >= 75) {
    return signalStrongIcon
  } else if (percent >= 50) {
    return signalMiddleIcon
  } else {
    return signalWeakIcon
  }
})

const getPrintThumbnail = computed(() => client.getCurrentProject()?.thumbnail_url || sdcardThumbnail)

const getPrintPercent = computed(() => {
  if (device.print.gcode_state === GcodeState.Prepare) {
    return 0
  }
  return device.print.mc_percent || 0
})

const getPrintStateLabel = computed(() => {
  switch (device.print.gcode_state) {
    case GcodeState.Idle:
      return '空闲'
    case GcodeState.Prepare:
      return `下载中(${device.print.gcode_file_prepare_percent}%)`
    case GcodeState.Running:
      return getPrintSubStateLabel
      // return '打印中'
    case GcodeState.Pause:
      return '已暂停'
    case GcodeState.Finish:
      return '完成'
    default:
      return ''
  }
})

const getPrintSubStateLabel = computed(() => {
  switch (device.print.stg_cur) {
    case CURRENT_STAGE_IDS.PRINTING:
      return '打印中'
    case CURRENT_STAGE_IDS.HEATBED_PREHEATING:
      return '预加热热床'
    case CURRENT_STAGE_IDS.CHANGING_FILAMENT:
      return '换料中'
    case CURRENT_STAGE_IDS.HOMING_TOOLHEAD:
      return '工具头回中'
    case CURRENT_STAGE_IDS.CLEANING_NOZZLE_TIP:
      return '清理喷嘴头'
    default:
      return ''
  }
})

const getPrintInfo = computed(() => {
  if (device.print.gcode_state === GcodeState.Finish) return ''

  const remainingTimeText = humanizeDuration((device.print.mc_remaining_time || 0) * 60 * 1000, {
    units: ['h', 'm'],
    round: true,
    language: 'zh_CN'
  })
  return `${device.print.layer_num || 0} / ${device.print.total_layer_num || 0} | ${remainingTimeText}`
})

const isPaused = computed(() => device.print.gcode_state === GcodeState.Pause)
const showPrintActions = computed(() => ![GcodeState.Unknown, GcodeState.Idle, GcodeState.Finish].includes(device.print.gcode_state ?? GcodeState.Unknown))

const handleResume = () => {
  console.log('[Controls] resume')
  client.setResume()
}

const handlePause = () => {
  console.log('[Controls] resume')
  client.setPause()
}

const handleStop = () => {
  console.log('[Controls] stop')
  client.setStop()
}

const lightState = computed(() => device.print.lights_report?.find(item => item.node === LightType.Chamber)?.mode === 'on')

const toggleLight = () => {
  console.log(`[Controls] setLight: on=${!lightState.value}`)
  client.setLight(!lightState.value)
}

</script>

<style scoped>
.homepage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 200px;
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
  padding: 8px;
  gap: 8px;
}

.task-card,
.printer-card,
.progress-card,
.light-button {
  background: var(--van-background-2);
  border-radius: 12px;
}

.task-card {
  grid-column: 1;
  grid-row: 1;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  justify-items: center;
  align-items: center;
  padding: 8px;
  gap: 8px;
}

.printer-card {
  grid-column: 2;
  grid-row: 1;
  width: 200px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.task-thumbnail {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  /* background-color: var(--van-background-5); */
}

.task-name {
  width: fit-content;
  max-width: 250px;
  line-height: 22px;
  height: 22px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  text-align: center;
}

.printer-card > span {
  font-size: 14px;
  font-weight: 500;
  display: block;
  position: relative;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 8px;
  padding: 4px 8px;
  width: fit-content;
}

#nozzle-temp {
  left: 60%;
  top: calc(50% - 100px + 45px);
}

#heatbed-temp {
  left: 25%;
  top: calc(50% - 100px + 90px);
}

#wifi-signal {
  left: 15%;
  top: calc(50% - 100px - 50px);
  border-radius: 50%;
  width: 34px;
  height: 34px;
  padding: 8px;
}

#wifi-signal img {
  width: 18px;
  height: 18px;
}

.progress-card {
  grid-column: 1 / 3;
  grid-row: 2;
  display: grid;
  grid-template-columns: 1fr auto;
  font-size: 12px;
  gap: 8px;
  padding: 8px;
  margin-right: calc(66px + 8px);
}

.progress-card-left {
  display: grid;
  padding: 4px;
}

.progress-card-buttons {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.van-progress {
  margin: 4px 0;
}

.progress-status {
  font-size: 12px;
  height: 22px;
  color: var(--van-text-color-2);
}

.progress-card-buttons > .control-button {
  width: 66px;
  height: 66px;
}

.light-button {
  grid-column: 2;
  grid-row: 2;
  justify-self: end;
  width: 66px;
  height: 82px;
}

@media (orientation: portrait) {
  .homepage {
    grid-template-columns: 1fr;
    grid-template-rows: 250px 200px auto auto;
    height: auto;
    padding-bottom: 8px;
  }

  .task-card {
    grid-column: 1;
    grid-row: 1;
    height: 250px;
  }

  .printer-card {
    grid-column: 1;
    grid-row: 2;
    width: 100%;
    height: 200px;
  }

  .progress-card {
    grid-column: 1;
    grid-row: 3;
    margin-right: 0;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }

  .progress-card-buttons {
    justify-content: flex-start;
  }

  .light-button {
    grid-column: 1;
    grid-row: 4;
    justify-self: start;
    margin-left: 8px;
  }
}

</style>
