<template>
  <div class="homepage homepage-running">
    <div ref="taskCardRef" class="card task-card" :style="{ width: `${taskCardWidth}px` }">
      <span v-if="isRecording" class="recording"><i-material-symbols-circle />REC</span>
      <span class="files" @click="showToast({ message: t('developing'), position: 'bottom' })">{{ t('file_link') }}</span>
      <img v-if="taskThumbnail" class="task-thumbnail" :src="taskThumbnail" />
      <img v-else class="task-thumbnail task-loading-thumbnail" :src="loadingThumbnail" />
      <span class="task-name">{{ taskName }}</span>
    </div>

    <div class="card printer-card">
      <div class="printer-content">
        <img :src="p1sThumbnail" />
        <span class="heatbed-temp" :style="{ color: nozzleIsHeating ? 'orange' : undefined }">
          <img class="temp-icon" :src="bedOffIcon" />
          {{ heatbedTemp }}
          <span class="temp-unit">°C</span>
        </span>
        <span class="wifi-signal"><img :src="wifiIcon" /></span>
        <DeviceListPopup v-model:show="showDeviceListPopup" />
      </div>

      <div class="nozzle-content">
        <img :src="nozzleThumbnail" />
        <span class="nozzle-temp" :style="{ color: nozzleIsHeating ? 'orange' : undefined }">
          <img class="temp-icon" :src="nozzleOffIcon" />
          {{ nozzleTemp }}
          <span class="temp-unit">°C</span>
        </span>
      </div>
    </div>

    <div class="card progress-card">
      <div class="progress-card-left">
        <div class="progress-labels">
          <span>{{ printPercent }}%</span>
          <span>{{ printInfo }}</span>
        </div>
        <van-progress :percentage="printPercent" :show-pivot="false" />
        <span class="progress-status">{{ printStateLabel }}</span>
      </div>

      <div class="progress-card-buttons">
        <ControlButton :icon="skipIcon" :label="t('action_skip')" font-size="10px" :disabled="!showPrintActions" @click="handleSkip" />
        <ControlButton
          v-if="!isPaused"
          :icon="pauseIcon"
          :label="t('action_pause')"
          font-size="10px"
          :disabled="!showPrintActions"
          @click="handlePause"
        />
        <ControlButton
          v-else
          :icon="resumeIcon"
          :label="t('action_resume')"
          font-size="10px"
          :disabled="!showPrintActions"
          @click="handleResume"
        />
        <ControlButton :icon="stopIcon" :label="t('action_stop')" font-size="10px" :disabled="!showPrintActions" @click="handleStop" />
      </div>
    </div>

    <div class="card hms" @click="router.replace({ name: ROUTE_NAME.MESSAGE })">
      <van-badge :content="device && device.hms.length > 0 ? device.hms.length : undefined" :offset="[-2, 6]">
        <img :src="hmsIcon(!(device && device.hms.length > 0))" />
      </van-badge>
      {{ t('assistant') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { showToast } from 'vant'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { CurrentStage } from '../../api/enums'
import { PrinterClient } from '../../api/PrinterClient'
import { usePrintStatus } from '../../composables/usePrintStatus'
import { useProjectThumbnail } from '../../composables/useProjectThumbnail'
import { ROUTE_NAME } from '../../router/routes'
import { usePrinterStore } from '../../stores/printer'
import { hmsIcon, wifiSignalIcon } from '../../utils/icon'

import skipIcon from '../../assets/images/print_control_partskip.svg'
import pauseIcon from '../../assets/images/print_control_pause.svg'
import resumeIcon from '../../assets/images/print_control_resume.svg'
import stopIcon from '../../assets/images/print_control_stop.svg'
import loadingThumbnail from '../../assets/images/dev_hms_diag_loading_dark.svg'
import p1sThumbnail from '../../assets/images/object_22.png'
import nozzleOffIcon from '../../assets/images/monitor_nozzle_temp.svg'
import bedOffIcon from '../../assets/images/monitor_bed_temp.svg'
import nozzleNormalThumbnail from '../../assets/images/indicator_nozzle_23.png'
import nozzleHeatingThumbnail from '../../assets/images/indicator_heat_nozzle_23.png'
import nozzleCoolingThumbnail from '../../assets/images/indicator_nozzle_cooling_23.png'
import nozzleOcclusionThumbnail from '../../assets/images/indicator_occlusion_filament_23.png'

const { t } = useI18n()
const router = useRouter()
const client = PrinterClient.getInstance()
const { device, project } = usePrinterStore()

const taskCardRef = ref<HTMLElement | null>(null)
const taskCardWidth = ref(0)
const wifiIcon = ref(wifiSignalIcon())
const nozzleThumbnail = ref(nozzleNormalThumbnail)
const showDeviceListPopup = ref(false)
const { isPaused, printInfo, printPercent, printStateLabel, showPrintActions } = usePrintStatus(device)

const handleResize = () => {
  if (taskCardRef.value) {
    taskCardWidth.value = taskCardRef.value.clientHeight
  }
}

const getNozzleThumbnail = () => {
  if (!device.value) return nozzleNormalThumbnail
  if (device.value.stg_cur === CurrentStage.PRINTING) return nozzleOcclusionThumbnail
  if (device.value.nozzle_temper > 50) {
    return device.value.nozzle_target_temper === 0 ? nozzleCoolingThumbnail : nozzleHeatingThumbnail
  }
  return nozzleNormalThumbnail
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

watch(
  device,
  () => {
    wifiIcon.value = wifiSignalIcon()
    nozzleThumbnail.value = getNozzleThumbnail()
    nextTick(() => handleResize())
  },
  { immediate: true }
)

useProjectThumbnail(project)

const isRecording = computed(() => project.value?.timelapse)
const taskThumbnail = computed(() => project.value?.thumbnail_url)
const taskName = computed(() => device.value?.subtask_name || '')
const nozzleTemp = computed(() => Math.floor(device.value?.nozzle_temper ?? 0))
const heatbedTemp = computed(() => Math.floor(device.value?.bed_temper ?? 0))
const nozzleIsHeating = computed(() => (device.value?.nozzle_target_temper ?? 0) - (device.value?.nozzle_temper ?? 0) > 2)

const handleSkip = () => {
  console.log('[Controls] skip')
  showToast({
    message: t('developing'),
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

.homepage-running {
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr auto;
}

.task-card {
  grid-column: 1;
  grid-row: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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
  padding: 0 8px;
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
  content: '';
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

.homepage-running > .card.hms {
  grid-column: 2;
  grid-row: 2;
  justify-self: end;
  width: 56px;
  background-color: var(--van-background-2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.homepage-running > .card.hms img {
  width: 28px;
  height: 28px;
}

@media (orientation: portrait) {
  .homepage {
    grid-template-columns: 1fr;
    grid-template-rows: 250px 250px auto auto;
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

  .homepage-running > .card.hms {
    display: none;
  }
}
</style>
