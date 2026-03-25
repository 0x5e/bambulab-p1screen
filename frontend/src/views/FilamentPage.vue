<template>
  <div class="filament-page">
    <div class="ams-cards">
      <AMS v-for="ams in amsList" :key="ams.id ?? '0'" :ams-id="ams.id ?? '0'" />
      <!-- <AMS v-for="ams in amsList" :key="ams.id ?? '0'" :ams-id="ams.id ?? '0'" /> -->
    </div>
    <div class="ext-card">
      <ExtTray />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AMS from '../components/AMS.vue'
import ExtTray from '../components/ExtTray.vue'
import { PrinterClient } from '../api/PrinterClient'

const client = PrinterClient.getInstance()
const device = client.device

const amsList = computed(() => device.print.ams?.ams ?? [{ id: '0' }])
</script>

<style scoped>
.filament-page {
  height: 100%;
  display: grid;
  grid-template-columns: repeat(2, auto);
  align-items: center;
  justify-content: center;
}
.ext-card {
  padding: 60px 28px;
  border-left: var(--van-background-4) 2px dotted;
}
.ams-cards {
  height: 100%;
  display: grid;
  align-items: center;
  padding: 28px;
  gap: 20px;
}

@media (orientation: portrait) {
  .filament-page {
    height: auto;
    grid-template-columns: auto;
    grid-template-rows: auto auto;
  }

  .ext-card {
    padding: 28px;
    padding-top: 0;
    border-left: none;
  }
}
</style>
