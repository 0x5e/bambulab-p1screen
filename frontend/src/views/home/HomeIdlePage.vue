<template>
  <div class="homepage homepage-idle">
    <img class="printer-thumbnail" :src="p1sThumbnail" />
    <span class="hint">{{ randomHint }}</span>
    <div class="card files" clickable @click="showToast({ message: t('developing'), position: 'bottom' })">
      <img :src="fileIcon" />
      {{ t('print_files') }}
    </div>
    <div class="card info-cards">
      <div class="nozzle-temp" @click="router.push({ name: ROUTE_NAME.CONTROL_NOZZLE })">
        <img class="temp-icon" :src="nozzleOffIcon" />
        <div>
          <span class="temp-value">{{ nozzleTemp }}</span>
          <span class="temp-unit">°C</span>
        </div>
      </div>

      <template v-if="device && device.ams.ams.length > 0">
        <div class="line"></div>
        <div @click="router.replace({ name: ROUTE_NAME.FILAMENT })">
          <template v-for="ams in device.ams.ams.slice(0, 2)" :key="ams.id">
            AMS-{{ amsPrefix(ams.id) }}
            <div class="ams">
              <div v-for="slot in ams.tray.length" :key="slot" class="slot">
                <div
                  :style="{
                    backgroundColor: ams.tray[slot - 1].tray_color && ams.tray[slot - 1].tray_color.length > 0 ? `#${ams.tray[slot - 1].tray_color}` : undefined,
                    height: ams.tray[slot - 1].remain !== -1 ? `${ams.tray[slot - 1].remain}%` : undefined,
                  }"
                ></div>
              </div>
            </div>
          </template>
        </div>
      </template>

      <div class="line"></div>
      <div class="wifi-signal" @click="router.replace({ name: ROUTE_NAME.SETTING_HOME })">
        <img :src="wifiIcon" />
        <div>Wi-Fi</div>
      </div>

      <div class="line"></div>
      <div class="hms" @click="router.replace({ name: ROUTE_NAME.MESSAGE })">
        <van-badge :content="device && device.hms.length > 0 ? device.hms.length : undefined" :offset="[-2, 6]">
          <img :src="hmsIcon(!(device && device.hms.length > 0))" />
        </van-badge>
        {{ t('assistant') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { showToast } from 'vant'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ROUTE_NAME } from '../../router/routes'
import { amsPrefix } from '../../utils/ams'
import { hmsIcon, wifiSignalIcon } from '../../utils/icon'
import { usePrinterStore } from '../../stores/printer'
import hints from '../../assets/hints.json'

import fileIcon from '../../assets/images/benchy.png'
import p1sThumbnail from '../../assets/images/object_22.png'
import nozzleOffIcon from '../../assets/images/monitor_nozzle_temp.svg'

const { locale, t } = useI18n()
const router = useRouter()
const { device } = usePrinterStore()

const getRandomHint = () => {
  const localeHints = hints[locale.value.startsWith('zh') ? 'zh' : 'en']
  return localeHints[Math.floor(Math.random() * localeHints.length)]
}

const randomHint = ref(getRandomHint())
const wifiIcon = ref(wifiSignalIcon())

watch(locale, () => {
  randomHint.value = getRandomHint()
})

watch(
  device,
  () => {
    wifiIcon.value = wifiSignalIcon()
  },
  { immediate: true }
)

const nozzleTemp = computed(() => Math.floor(device.value?.nozzle_temper ?? 0))
</script>

<style scoped>
.homepage {
  display: grid;
  height: 100%;
  gap: 10px;
  font-size: 14px;
}

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
}

.homepage-idle > .files > img {
  height: 50%;
  margin-right: 20px;
}

.info-cards {
  align-items: center;
}

.info-cards > * + * {
  margin-left: 8px;
}

.info-cards > div {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--van-text-color-2);
  height: 100%;
}

.info-cards > div:active {
  filter: brightness(0.8);
}

.info-cards > .line {
  width: 0.5px;
  height: 80%;
  background-color: var(--van-background-5);
  flex: initial;
  margin-top: -4px;
  margin-right: -4px;
  margin-bottom: -4px;
  margin-left: 4px;
  opacity: 0.3;
}

.info-cards > .nozzle-temp > img {
  margin-bottom: 4px;
}

.info-cards > .nozzle-temp .temp-value {
  color: var(--van-text-color);
  padding-right: 4px;
}

.info-cards > .wifi-signal > img,
.info-cards > .hms img {
  width: 32px;
  height: 32px;
  margin-bottom: 12px;
}

.ams {
  height: 24px;
  display: flex;
  flex-direction: row;
  justify-content: center;
}

.ams .slot + .slot {
  margin-left: 4px;
}

.ams .slot {
  height: 22px;
  width: 12px;
  border-radius: 6px;
  border: 1px solid var(--van-background-5);
  background-color: var(--van-background-4);
  overflow: hidden;
  display: flex;
  align-items: end;
}

.ams .slot > div {
  width: 100%;
  height: 100%;
  border-radius: 6px;
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
}
</style>
