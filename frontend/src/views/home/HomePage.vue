<template>
  <HomeIdlePage v-if="isIdle" />
  <HomePrintingPage v-else-if="isPrinting" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GcodeState } from '../../api/enums'
import { usePrinterStore } from '../../stores/printer'
import HomeIdlePage from './HomeIdlePage.vue'
import HomePrintingPage from './HomePrintingPage.vue'

const { device } = usePrinterStore()

const isIdle = computed(() => !device.value || device.value.gcode_state === GcodeState.Idle)
const isPrinting = computed(() =>
  [
    GcodeState.Prepare,
    GcodeState.Running,
    GcodeState.Pause,
    GcodeState.Finish,
    GcodeState.Failed,
  ].includes(device.value?.gcode_state ?? GcodeState.Unknown)
)
</script>
