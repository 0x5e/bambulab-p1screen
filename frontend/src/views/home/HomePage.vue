<template>
  <HomePrintingPage v-if="isPrinting" />
  <HomeIdlePage v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { GcodeState } from '@bambulab-p1screen/printer-api'
import { usePrinterStore } from '../../stores/printer'
import HomeIdlePage from './HomeIdlePage.vue'
import HomePrintingPage from './HomePrintingPage.vue'

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
