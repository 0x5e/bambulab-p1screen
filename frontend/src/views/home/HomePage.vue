<template>
  <!-- idle -->
  <div v-if="!device || [GcodeState.Idle].includes(device.gcode_state)" class="homepage homepage-idle">
    <img class="printer-thumbnail" :src="p1sThumbnail" />
    <span class="hint">{{ randomHint }}</span>
    <div class="card files" clickable @click="router.push({ name: ROUTE_NAME.HOME_FILES })">
      <img :src="fileIcon" />
      打印文件
    </div>
    <div class="card info-cards">
      <div class="nozzle-temp" @click="router.push({ name: ROUTE_NAME.CONTROL_NOZZLE })">
        <img class="temp-icon" :src="nozzleOffIcon" />
        <div>
          <span class="temp-value">{{ nozzleTemp }}</span>
          <span class="temp-unit">°C</span>
        </div>
      </div>
      <!-- TODO: AMS -->
      <!--
      <div v-if="device && device.ams.ams.length > 0" @click="router.push({ name: ROUTE_NAME.FILAMENT })">
        AMS-X
      </div>
      -->
      <div class="wifi-signal" @click="router.push({ name: ROUTE_NAME.SETTING_HOME })">
        <img :src="wifiIcon"/>
        <div>Wi-Fi</div>
      </div>
      <div class="hms" @click="router.push({ name: ROUTE_NAME.MESSAGE })">
        <img :src="hmsIcon(!(device && device.hms.length > 0))"/>
        <div :style="{ color: device && device.hms.length > 0 ? 'orange' : undefined }">
          {{ device && device.hms.length > 0 ? device.hms.length : '助手' }}
        </div>
      </div>
    </div>
  </div>
  <!-- running -->
  <div v-else-if="[GcodeState.Prepare, GcodeState.Running, GcodeState.Pause, GcodeState.Finish, GcodeState.Failed].includes(device.gcode_state)" class="homepage homepage-running">
    <div class="card task-card" ref="taskCardRef" :style="{ width : `${taskCardWidth}px` }">
      <span v-if="isRecording" class="recording"><i-material-symbols-circle />REC</span>
      <span class="files" @click="router.push({ name: ROUTE_NAME.HOME_FILES })">{{ '文件 >' }}</span>
      <img v-if="getTaskThumbnail" class="task-thumbnail" :src="getTaskThumbnail"/>
      <img v-else class="task-thumbnail task-loading-thumbnail" :src="loadingThumbnail"/>
      <span class="task-name">{{ taskName }}</span>
    </div>
    <div class="card printer-card">
      <div class="printer-content">
        <img :src="p1sThumbnail" />
        <span class="heatbed-temp" :style="{ color: (device.nozzle_target_temper - device.nozzle_temper > 2) ? 'orange' : undefined }">
          <img class="temp-icon" :src="bedOffIcon" />
          {{ heatbedTemp }}
          <span class="temp-unit">°C</span>
        </span>
        <span class="wifi-signal"><img :src="wifiIcon"/></span>
        <DeviceListPopup v-model:show="showDeviceListPopup" />
      </div>
      <div class="nozzle-content">
        <img :src="nozzleThumbnail" />
        <span class="nozzle-temp" :style="{ color: (device.nozzle_target_temper - device.nozzle_temper > 2) ? 'orange' : undefined }" >
          <img class="temp-icon" :src="nozzleOffIcon" />
          {{ nozzleTemp }}
          <span class="temp-unit">°C</span>
        </span>
      </div>
    </div>
    <div class="card progress-card">
      <div class="progress-card-left">
        <div class="progress-labels">
          <span>{{ getPrintPercent }}%</span>
          <span>{{ getPrintInfo }}</span>
        </div>
        <van-progress :percentage="getPrintPercent" :show-pivot="false" />
        <span class="progress-status">{{ getPrintStateLabel }}</span>
      </div>
      <div class="progress-card-buttons">
        <ControlButton :icon="skipIcon" label="跳过" font-size="10px" @click="handleSkip" :disabled="!showPrintActions" />
        <ControlButton v-if="!isPaused" :icon="pauseIcon" label="暂停" font-size="10px" @click="handlePause" :disabled="!showPrintActions" />
        <ControlButton v-else :icon="resumeIcon" label="继续" font-size="10px" @click="handleResume" :disabled="!showPrintActions" />
        <ControlButton :icon="stopIcon" label="停止" font-size="10px" @click="handleStop" :disabled="!showPrintActions" />
      </div>
    </div>
    <ControlButton
      class="card hms"
      :icon="hmsIcon(!(device && device.hms.length > 0))"
      :label="device && device.hms.length > 0 ? String(device.hms.length) : ''"
      font-size="10px"
      @click="router.push({ name: ROUTE_NAME.MESSAGE })"
      />
  </div>
  <!-- TODO: Error Popup -->
</template>
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { showToast } from 'vant'
import { useRouter } from 'vue-router'
import { ROUTE_NAME } from '../../router/routes'
import humanizeDuration from 'humanize-duration'
import { unzipSync } from 'fflate'
import { PrinterClient } from '../../api/PrinterClient'
import { GcodeState, CurrentStage } from '../../api/enums'
import { saveProject } from '../../utils/project'
import { hmsIcon, wifiSignalIcon } from '../../utils/icon'
import { usePrinterStore } from '../../stores/printer'

import fileIcon from '../../assets/images/benchy.png'
import skipIcon from '../../assets/images/print_control_partskip.svg'
import pauseIcon from '../../assets/images/print_control_pause.svg'
import resumeIcon from '../../assets/images/print_control_resume.svg'
import stopIcon from '../../assets/images/print_control_stop.svg'
import loadingThumbnail from '../../assets/images/dev_hms_diag_loading_dark.svg'
import brokenThumbnail from '../../assets/images/monitor_brokenimg.png'
import p1sThumbnail from '../../assets/images/object_22.png'
import nozzleOffIcon from '../../assets/images/monitor_nozzle_temp.svg'
import bedOffIcon from '../../assets/images/monitor_bed_temp.svg'
import nozzleNormalThumbnail from '../../assets/images/indicator_nozzle_23.png'
import nozzleHeatingThumbnail from '../../assets/images/indicator_heat_nozzle_23.png'
import nozzleCoolingThumbnail from '../../assets/images/indicator_nozzle_cooling_23.png'
import nozzleOcclusionThumbnail from '../../assets/images/indicator_occlusion_filament_23.png'
// import nozzlePurgeThumbnail from '../../assets/images/indicator_purge_filament_23.png'

const getRandomHint = () => {
  const hints = [
    '500层算啥，再来500层！',
    '准备好了吗？到我大显身手了。',
    '欢迎回来！我们再开启一场3D冒险吗？',
    '状态满分，准备开干！',
    '新的一天，新的创造。',
    '磨刀不误砍柴工',
    '我想要，我得到！',
    '嗨，今天做点啥？',
  ]
  return hints[Math.floor(Math.random() * hints.length)]
}
const randomHint = ref(getRandomHint())

const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: 'shortEn',
  languages: {
    shortEn: {
      y: () => 'y',
      mo: () => 'mo',
      w: () => 'w',
      d: () => 'd',
      h: () => 'h',
      m: () => 'm',
      s: () => 's',
      ms: () => 'ms',
    },
  },
  spacer: '',
  delimiter: '',
})

const router = useRouter()
const client = PrinterClient.getInstance()
const { device, project } = usePrinterStore()

const taskCardRef = ref<HTMLElement | null>(null)
const taskCardWidth = ref(0)
const wifiIcon = ref(wifiSignalIcon())
const showDeviceListPopup = ref(false)

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
  if (taskCardRef.value) {
    taskCardWidth.value = taskCardRef.value.clientHeight
  }
}

const getNozzleThumbnail = () => {
  if (!device.value) return nozzleNormalThumbnail
  if (device.value.stg_cur === CurrentStage.PRINTING) return nozzleOcclusionThumbnail
  if (device.value.nozzle_temper > 50) {
    return (device.value.nozzle_target_temper === 0) ? nozzleCoolingThumbnail : nozzleHeatingThumbnail
  }
  // TODO: purge
  return nozzleNormalThumbnail
}
const nozzleThumbnail = ref(getNozzleThumbnail())

const loadProjectThumbnail = async () => {
  if (!project.value) return
  if ((project.value.thumbnail_url || '').length > 0) return

  try {
    console.log('[HomePage] fetching project file from oss')
    const response = await fetch(`/api/fetch?url=${encodeURIComponent(project.value.url)}`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    const unzipped = unzipSync(data)
    const thumbnailData = unzipped[`Metadata/plate_${project.value.plate_idx}.png`]
    project.value.thumbnail_url = thumbnailData ? `data:image/png;base64,${btoa(String.fromCharCode(...thumbnailData))}` : undefined
    saveProject(project.value)
    console.log('[HomePage] extract project thumbnail from .3mf')
  } catch (err) {
    console.error('[HomePage] loadProjectThumbnail error:', err)
    project.value.thumbnail_url = brokenThumbnail
  }

  project.value = Object.assign({}, project.value)
}

watch(device, () => {
  wifiIcon.value = wifiSignalIcon()
  nozzleThumbnail.value = getNozzleThumbnail()
  nextTick(() => handleResize())
}, { immediate: true })

watch(project, () => {
  loadProjectThumbnail()
}, { immediate: true })

const isRecording = computed(() => project.value?.timelapse)
const getTaskThumbnail = computed(() => project.value?.thumbnail_url)
const taskName = computed(() => device.value?.subtask_name || '')

const nozzleTemp = computed(() => Math.floor(device.value?.nozzle_temper ?? 0))
const heatbedTemp = computed(() => Math.floor(device.value?.bed_temper ?? 0))

const getPrintPercent = computed(() => {
  if (device.value?.gcode_state === GcodeState.Prepare) {
    return 0
  }
  return device.value?.mc_percent || 0
})

const getPrintStateLabel = computed(() => {
  switch (device.value?.gcode_state) {
    case GcodeState.Idle:
      return '空闲'
    case GcodeState.Prepare:
      return `下载中(${device.value?.gcode_file_prepare_percent}%)`
    case GcodeState.Running:
      return getPrintSubStateLabel()
      // return '打印中'
    case GcodeState.Pause:
      return '已暂停'
    case GcodeState.Finish:
      return '完成'
    case GcodeState.Failed:
      return '失败'
    default:
      return ''
  }
})

const getPrintSubStateLabel = () => {
  switch (device.value?.stg_cur) {
    case CurrentStage.PRINTING:
      return '打印中'
    case CurrentStage.HEATBED_PREHEATING:
      return '预加热热床'
    case CurrentStage.CHANGING_FILAMENT:
      return '换料中'
    case CurrentStage.HOMING_TOOLHEAD:
      return '工具头回中'
    case CurrentStage.CLEANING_NOZZLE_TIP:
      return '清理喷嘴头'
    default:
      return ''
  }
}

const getPrintInfo = computed(() => {
  if ([GcodeState.Finish, GcodeState.Failed].includes(device.value?.gcode_state ?? GcodeState.Unknown)) return ''

  const remainingTimeText = shortEnglishHumanizer((device.value?.mc_remaining_time || 0) * 60 * 1000, {
    units: ['d', 'h', 'm'],
    round: true,
  })
  return `${device.value?.layer_num || 0}/${device.value?.total_layer_num || 0} | -${remainingTimeText}`
})

const isPaused = computed(() => device.value?.gcode_state === GcodeState.Pause)
const showPrintActions = computed(() => [GcodeState.Pause, GcodeState.Running].includes(device.value?.gcode_state ?? GcodeState.Unknown))

const handleSkip = () => {
  console.log('[Controls] skip')
  // TODO: select & skip object
  showToast({
    message: '功能开发中～',
    position: 'bottom',
  })
}

const handleResume = () => {
  console.log('[Controls] resume')
  client.setResume()
}

const handlePause = () => {
  console.log('[Controls] pause')
  client.setPause()
}

const handleStop = () => {
  console.log('[Controls] stop')
  client.setStop()
}
</script>

<style scoped>
.homepage {
  display: grid;
  height: 100%;
  padding: 10px;
  gap: 10px;
  font-size: 14px;
}

/* idle */
.homepage-idle {
  grid-template-columns: minmax(0, 3fr) minmax(0, 4fr);
  grid-template-rows: minmax(0, 1fr) 120px;
  align-items: center;
}
.homepage-idle > .printer-thumbnail {
  height: 100%;
  padding: 8px;
  padding-left: 24px;
}
.homepage-idle > .hint {
  border-left: 2px solid var(--van-primary-color);
  padding-left: 10px;
  font-size: 15px;
}
.homepage-idle > div {
  height: 100%;
}
.homepage-idle > .files {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}
.homepage-idle > .files > img {
  height: 50%;
}
.info-cards {
  align-items: center;
  gap: 8px;
}
.info-cards > div {
  flex: 1;
  text-align: center;
  color: var(--van-text-color-2);
}
.info-cards > div:active {
  filter: brightness(0.8);
}
.info-cards > .nozzle-temp .temp-value {
  color: var(--van-text-color);
  padding-right: 4px;
}
.info-cards > .wifi-signal > img,
.info-cards > .hms > img {
  width: 32px;
  height: 32px;
  margin-bottom: 12px;
}

/* running */
.homepage-running {
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr auto;
}

.task-card {
  grid-column: 1;
  grid-row: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 25px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.recording {
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
  margin-left: 8px;
  padding: 1px 2px;
  font-size: 6px;
  font-weight: bold;
  border-radius: 3px;
  border: 1px solid var(--van-text-color);
  color: var(--van-text-color);
}

.recording > svg {
  font-size: 3px;
  color: var(--van-red);
  margin-right: 1px;
}

.task-card .files {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  font-size: 12px;
  color: var(--van-text-color);
  padding: 0 8px;
}

.task-thumbnail {
  grid-column: 1 / span 2;
  grid-row: 2;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  justify-self: center;
}

.task-loading-thumbnail {
  filter: brightness(1.1);
  width: 60%;
  padding-bottom: 10%;
}

.task-name {
  grid-column: 1 / span 2;
  grid-row: 3;
  width: 100%;
  height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  text-align: left;
  align-content: center;
  padding: 0 12px;
  background-color: var(--van-background-3);
}

.printer-card {
  display: grid;
  grid-template-columns: 0.625fr 0.375fr;
}

.printer-card > div {
  position: relative;
  overflow: hidden;
  height: 100%;
}

.printer-card .temp-unit {
  font-size: 12px;
  color: var(--van-text-color-2);
}

.printer-card .temp-icon {
  top: 3px;
  position: relative;
  width: 16px;
  height: 16px;
  margin-right: 2px;
}

.printer-content > img {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); 
  width: 90%;
  padding: 4px;
}

.printer-card > div > span {
  display: block;
  position: absolute;
  transform: translate(-50%, -50%); 

  font-size: 14px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 14px;
  width: max-content;
  padding: 0px 8px;
  line-height: 20px;
}

.heatbed-temp {
  left: 40%;
  top: 60%;
}

.printer-card .wifi-signal {
  left: 25%;
  top: 25%;
  border-radius: 50%;
  width: 34px;
  height: 34px;
  padding: 8px !important;
}

.printer-card .wifi-signal img {
  width: 18px;
  height: 18px;
}

.nozzle-content::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10%;
  height: 80%;
  width: 0.5px;
  background: var(--van-background-5);
}

.nozzle-content > img {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%); 
  width: 90%;
}

.nozzle-temp {
  top: 75%;
  left: 50%;
}

.progress-card {
  grid-column: 1 / 3;
  grid-row: 2;
  display: grid;
  grid-template-columns: 1fr auto;
  font-size: 12px;
  gap: 8px;
  padding: 8px;
  margin-right: calc(56px + 10px);
}

.progress-card-left {
  display: grid;
  padding: 0 4px;
}

.progress-card-buttons {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  margin-right: -8px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.progress-labels > span:first-child {
  font-weight: 500;
  font-size: 16px;
}

.van-progress {
  margin: 4px 0;
  height: 6px;
}

.progress-status {
  font-size: 12px;
  height: 22px;
  color: var(--van-text-color-2);
}

.progress-card-buttons > .control-button {
  width: 56px;
  height: 56px;
  margin-right: 8px;
  border-radius: 8px;
}

:deep(.progress-card-buttons > .control-button > img) {
  width: 20px;
  height: 20px;
  margin-bottom: 2px;
}

.card.hms {
  grid-column: 2;
  grid-row: 2;
  justify-self: end;
  width: 56px;
  /* height: 72px; */
  background-color: var(--van-background-2);
  color: orange;
}

:deep(.card.hms > img) {
  width: 24px;
  height: 24px;
  margin-bottom: 0;
}

@media (orientation: portrait) {
  .homepage {
    grid-template-columns: 1fr;
    grid-template-rows: 250px 250px auto auto;
    height: auto;
  }
  .homepage-idle {
    grid-template-columns: 1fr;
    grid-template-rows: 200px 80px 120px 120px;
    height: auto;
  }

  .task-card {
    grid-column: 1;
    grid-row: 1;
    height: 250px;
    width: 100% !important;
  }

  .printer-card {
    grid-column: 1;
    grid-row: 2;
    width: 100%;
    height: 250px;
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

  .card.hms {
    display: none;
  }
}
</style>
