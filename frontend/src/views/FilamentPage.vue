<template>
  <div class="filament-page">
    <div class="ext-card">
      <Tray name="Ext" :material="extTray ? extTray.tray_type : '?'" :color="extTray ? `#${extTray.tray_color}` : ''" />
    </div>
    <div class="ams-cards">
      <AMS v-for="ams in amsList" :ams-id="ams.id ?? '0'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AMS from '../components/AMS.vue'
import Tray from '../components/Tray.vue'
import { device } from '../store/device';

const amsList = computed(() => device.print?.ams?.ams ?? [{} as any])
const extTray = computed(() => device.print?.vt_tray)
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
  padding: 60px 20px;
  border-right: var(--van-background-4) 2px dotted;
}
.ext-card .tray {
  position: relative;
  top: -8px;
}
.ams-cards {
  height: 100%;
  display: grid;
  align-items: center;
  padding: 28px;
}
</style>
