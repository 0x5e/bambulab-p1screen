<template>
  <div class="ams">
    <div v-for="slot in ams.tray.length" :key="slot" class="slot">
      <div
        :style="{
          backgroundColor: slotColor(slot),
          height: slotRemain(slot),
        }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type DeviceAMS } from '@bambulab-p1screen/printer-api'

const props = defineProps<{
  ams: DeviceAMS
}>()

const trayAt = (slot: number) => props.ams.tray[slot - 1]
const slotColor = (slot: number) => {
  const color = trayAt(slot).tray_color
  return color && color.length > 0 ? `#${color}` : undefined
}
const slotRemain = (slot: number) => {
  const remain = trayAt(slot).remain
  return remain !== -1 ? `${remain}%` : undefined
}
</script>

<style scoped>
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
</style>
