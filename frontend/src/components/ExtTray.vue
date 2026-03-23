<template>
  <div class="ext-tray-card">
    <Tray
      name="Ext"
      :material="extTrayMaterial"
      :color="extTrayColor"
    />
    <span class="name" >外挂料盘</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Tray from '../components/Tray.vue'
import { PrinterClient } from '../services/PrinterClient'

const client = PrinterClient.getInstance()
const extTray = computed(() => client.device.print.vt_tray)
const extTrayMaterial = computed(() => extTray.value?.tray_type ?? '?')
const extTrayColor = computed(() => extTray.value?.tray_color ? `#${extTray.value.tray_color}` : '')
</script>

<style scoped>
.ext-tray-card {
  width: 84px;
  display: grid;
  padding: 8px;
  border-radius: 8px;
  border: var(--van-background-4) 1px solid;
  overflow: hidden;
  background-color: var(--van-background-2);
}
.name {
  width: 84px;
  background-color: var(--van-background-3);
  margin-top: 8px;
  margin-bottom: -8px;
  margin-left: -8px;
  padding-left: 8px;
  font-size: 12px;
  line-height: 20px;
}
</style>
