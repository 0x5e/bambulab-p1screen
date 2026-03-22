<template>
  <div class="homepage">
    <div class="row-1">
      <div>
        <img class="task-thumbnail" :src="getPrintThumbnail"/>
        <span class="task-name">{{ taskName }}</span>
      </div>
      <div class="printer-thumbnail" :style="{ backgroundImage: `url(${p1sThumbnail})`}">
        <span id="nozzle-temp">{{ nozzleTemp }} ℃</span>
        <span id="heatbed-temp">{{ heatbedTemp }} ℃</span>
        <span id="wifi-signal"><img :src="getWifiSignalIcon"/></span>
      </div>
    </div>
    <div class="row-2">
      <div class="progress-card">
        <div class="progress-card-left">
          <div class="progress-labels">
            <span>{{ getPrintPercent }} %</span>
            <span>{{ getPrintInfo }}</span>
          </div>
          <van-progress :percentage="getPrintPercent" :show-pivot="false" />
          <span class="progress-status">{{ getPrintStateLabel }}</span>
        </div>
        <template v-if="showPrintActions">
          <!-- <ControlButton :icon="skipIcon" label="跳过" @click="handleSkip" /> -->
          <ControlButton v-if="!isPaused" :icon="pauseIcon" label="暂停" @click="handlePause" />
          <ControlButton v-if="isPaused" :icon="resumeIcon" label="继续" @click="handleResume" />
          <ControlButton :icon="stopIcon" label="停止" @click="handleStop" />
        </template>
      </div>
      <ControlButton class="light-button" :icon="lightState ? lightOnIcon : lightOffIcon" label="照明" @click="toggleLight" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import humanizeDuration from 'humanize-duration'
import { PrinterClient } from '../services/PrinterClient'
import { GcodeState } from '../services/device'
import ControlButton from '../components/ControlButton.vue'

import lightOnIcon from '../assets/images/monitor_lamp_on.svg'
import lightOffIcon from '../assets/images/monitor_lamp_off.svg'
import skipIcon from '../assets/images/print_control_partskip.svg'
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
const project = client.project

const taskName = computed(() => project?.subtask_name || '')
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

const getPrintThumbnail = computed(() => project ? project.thumbnail_url : sdcardThumbnail)

const getPrintPercent = computed(() => {
  if (device.print.gcode_state === GcodeState.Prepare) {
    return 0
  }
  return device.print.mc_percent || 0
})

const getPrintStateLabel = computed(() => {
  const state = device.print.gcode_state
  switch (state) {
    case GcodeState.Idle:
      return '空闲'
    case GcodeState.Prepare:
      return `下载中(${device.print.gcode_file_prepare_percent}%)`
    case GcodeState.Running:
      return '打印中'
    case GcodeState.Pause:
      return '已暂停'
    case GcodeState.Finish:
      return '完成'
    default:
      return ''
  }
})

const getPrintSubStateLabel = computed(() => [null, null, '加热中', null, '换料中'][Number(device.print.mc_print_sub_stage ?? 0)]) || ''

const getPrintInfo = computed(() => {
  let remainingTime = (device.print.mc_remaining_time || 0) * 60 * 1000
  let remainingTimeText = ''
  if (remainingTime === 0 && device.print.mc_print_stage !== '1') { // less than 1min
    remainingTimeText += '< '
    remainingTime = 60 * 1000
  }
  remainingTimeText += humanizeDuration(remainingTime, {
    units: ['h', 'm'],
    round: true,
    language: 'zh_CN'
  })
  return `${device.print.layer_num || 0} / ${device.print.total_layer_num || 0} | ${remainingTimeText}`
})

const isPaused = computed(() => device.print.gcode_state === GcodeState.Pause)
const showPrintActions = computed(() => ![GcodeState.Unknown, GcodeState.Idle, GcodeState.Finish].includes(device.print.gcode_state ?? GcodeState.Unknown))

const handleSkip = () => {
  console.log('[Controls] skip')
}

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

const lightState = computed(() => device.print.lights_report?.find(item => item.node === 'chamber_light')?.mode === 'on')

const toggleLight = () => {
  console.log(`[Controls] setLight: on=${!lightState.value}`)
  client.setLight(!lightState.value)
}

</script>

<style scoped>
.homepage {
  display: grid;
  grid-template-rows: 1fr auto;
  height: 100%;
  padding: 8px;
  gap: 8px;
}

.row-1, .row-2 {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.row-1 > div, .row-2 > div {
  background: var(--van-background-2);
  border-radius: 12px;
}

.row-1 > div:first-child {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.row-1 > :last-child {
  width: 200px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.task-thumbnail {
  width: 50%;
  height: auto;
  background-color: var(--van-background-5);
}

.task-name {
  width: 250px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  text-align: center;
}

.printer-thumbnail > span {
  font-size: 14px;
  font-weight: 500;
  position: relative;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 8px;
  padding: 4px 8px;
}

#nozzle-temp {
  left: 60%;
  top: calc(50% - 100px + 45px);
}

#heatbed-temp {
  left: 8%;
  top: calc(50% - 100px + 130px);;
}

#wifi-signal {
  left: 15%;
  top: calc(50% - 100px - 18px);
  display: block;
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
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  font-size: 12px;
  gap: 8px;
  padding: 8px;
}

.progress-card-left {
  display: grid;
  padding: 4px;
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
  font-size: 14px;
  height: 22px;
}

.progress-card > .control-button {
  width: 66px;
  height: 66px;
}

.light-button {
  width: 66px;
  height: 82px;
}

</style>
