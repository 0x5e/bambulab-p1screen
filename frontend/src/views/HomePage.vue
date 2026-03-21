<template>
  <div class="homepage">
    <div class="row-1">
      <div>
        <img class="task-thumbnail" src="../assets/images/monitor_sdcard_thumbnail.png"/>
        <span class="task-name">{{ computed(() => device.print.subtask_name || '') }}</span>
      </div>
      <div class="printer-thumbnail" :style="{ backgroundImage: `url(${p1sThumbnail})`}">
        <span class="nozzle-temp">{{ computed(() => Math.floor(Number(device.print.nozzle_temper ?? '0'))) }} ℃</span>
        <span class="heatbed-temp">{{ computed(() => Math.floor(Number(device.print.bed_temper ?? '0'))) }} ℃</span>
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
        <template v-if="!['IDLE', 'FINISH'].includes(device.print.gcode_state ?? '')">
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
import { device } from '../store/device'
import { WSService } from '../store/ws'
import ControlButton from '../components/ControlButton.vue'

import lightOnIcon from '../assets/images/monitor_lamp_on.svg'
import lightOffIcon from '../assets/images/monitor_lamp_off.svg'
import skipIcon from '../assets/images/print_control_partskip.svg'
import pauseIcon from '../assets/images/print_control_pause.svg'
import resumeIcon from '../assets/images/print_control_resume.svg'
import stopIcon from '../assets/images/print_control_stop.svg'
import p1sThumbnail from '../assets/images/printer_thumbnail_p1s_png.png'


const getPrintPercent = computed(() => {
  if (device.print.gcode_state == 'PREPARE') {
    return 0
  }
  return device.print.mc_percent || 0
})

const getPrintStateLabel = computed(() => {
  return {
    'IDLE': '空闲',
    'PREPARE': `下载中(${device.print.gcode_file_prepare_percent}%)`,
    'RUNNING': '打印中',
    'PAUSE': '已暂停',
    'FINISH': '完成',
  }[device.print.gcode_state ?? ''] || ''
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

const isPaused = computed(() => device.print.gcode_state === 'PAUSE')

const handleSkip = () => {
  console.log('[Controls] skip')
}

const handleResume = () => {
  console.log('[Controls] resume')
  WSService.getInstance().setResume()
}

const handlePause = () => {
  console.log('[Controls] resume')
  WSService.getInstance().setPause()
}

const handleStop = () => {
  console.log('[Controls] stop')
  WSService.getInstance().setStop()
}

const lightState = computed(() => device.print.lights_report?.find(item => item.node === 'chamber_light')?.mode === 'on')

const toggleLight = () => {
  console.log(`[Controls] setLight: on=${!lightState.value}`)
  WSService.getInstance().setLight(!lightState.value)
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

.nozzle-temp {
  left: 60%;
  top: calc(50% - 100px + 45px);
}

.heatbed-temp {
  left: 8%;
  top: calc(50% - 100px + 130px);;
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
