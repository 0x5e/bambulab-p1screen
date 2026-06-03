<template>
  <BasePage :title="t('home')">
    <HomePrintingPage v-if="isPrinting" />
    <HomeIdlePage v-else />
  </BasePage>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { GcodeState } from '@bambulab-p1screen/printer-api'
import { usePrinterStore } from '../../stores/printer'
import HomeIdlePage from './HomeIdlePage.vue'
import HomePrintingPage from './HomePrintingPage.vue'

const { t } = useI18n()
const { device } = usePrinterStore()

const isPrinting = computed(() =>
  [
    GcodeState.Slicing,
    GcodeState.Prepare,
    GcodeState.Running,
    GcodeState.Pause,
    GcodeState.Finish,
    GcodeState.Failed,
  ].includes(device.value?.gcode_state ?? GcodeState.Unknown)
)
</script>
