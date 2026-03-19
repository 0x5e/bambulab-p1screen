<template>
  <div class="homepage">
    <div class="row-1">
      <div>
        <!-- <img class="task-thumbnail" src="../assets/images/monitor_sdcard_thumbnail.png"/> -->
      </div>
      <div>
        <img class="printer-thumbnail" src="../assets/images/printer_thumbnail_p1s_png.png"/>
      </div>
    </div>
    <div class="row-2">
      <div class="progress-card">
        <div class="progress-card-left">
          <div class="progress-labels">
            <span>{{ getPrintPercent }} %</span>
            <span>{{ getCurrentLayerNum }} / {{ getTotalLayerNum }} | {{ getRemainingTimeLabel }}</span>
          </div>
          <van-progress :percentage="getPrintPercent" :show-pivot="false" />
          <span class="progress-status">{{ getPrintStateLabel }}</span>
        </div>
        <ControlButton :icon="isPaused ? resumeIcon : pauseIcon" :label=" isPaused ? '继续' : '暂停'" @click="togglePause" />
        <ControlButton :icon="stopIcon" label="停止" @click="handleStop" />
      </div>
      <ControlButton class="light-button" :icon="lightState ? lightOnIcon : lightOffIcon" label="照明" @click="toggleLight" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { device } from '../store/device'
import { WSService } from '../store/ws'
import ControlButton from '../components/ControlButton.vue'

import lightOnIcon from '../assets/images/monitor_lamp_on.svg'
import lightOffIcon from '../assets/images/monitor_lamp_off.svg'
import pauseIcon from '../assets/images/print_control_pause.svg'
import resumeIcon from '../assets/images/print_control_resume.svg'
import stopIcon from '../assets/images/print_control_stop.svg'

const getPrintPercent = computed(() => {
  return device.print?.mc_percent || 0
})

const getPrintStateLabel = computed(() => {
  return {
    '': '未知',
    'IDLE': '空闲',
    'PRINTING': '打印中',
    'PAUSED': '已暂停'
  }[device.print?.gcode_state ?? '']
})

const getCurrentLayerNum = computed(() => {
  return device.print?.layer_num || 0
})

const getTotalLayerNum = computed(() => {
  return device.print?.total_layer_num || 0
})

const getRemainingTimeLabel = computed(() => {
  // TODO format time
  return device.print?.mc_remaining_time || 0
})

const isPaused = computed(() => {
  return device.print?.gcode_state === 'PAUSED'
})

const togglePause = () => {

}

const handleStop = () => {

}

const lightState = computed(() => {
  if (!device.print) return false
  return device.print.lights_report?.find(item => item.node === 'chamber_light')?.mode === 'on'
})

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
  padding: 4px;
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
  flex: 1;
}

.row-1 > div:last-child {
  width: 200px;
}

.task-thumbnail {
  height: 80%;
}

.printer-thumbnail {
  width: 100%;
  height: auto;
}

.progress-card {
  display: grid;
  grid-template-columns: 1fr auto auto;
  font-size: 12px;
  gap: 8px;
  padding: 8px 12px;
}

.progress-card-left {
  display: grid;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.progress-status {
  font-size: 14px;
}

.progress-card > .control-button {
  width: 66px;
  height: 66px;
}

.light-button {
  width: 66px;
  height: 82px;
  padding: 18px 10px;
}

</style>
