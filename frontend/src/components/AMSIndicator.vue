<template>
  <div v-if="isVisible" class="ams" :class="[`ams-${type}`, `ams-${ams.tray.length}-slot`]">
    <div v-for="slot in ams.tray.length" :key="slot" class="slot">
      <div
        :style="{
          backgroundColor: slotColor(slot),
          height: type === 'normal' ? slotRemain(slot) : undefined,
        }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type DeviceAMS } from '@bambulab-p1screen/printer-api'

const props = withDefaults(
  defineProps<{
    ams: DeviceAMS
    type?: 'normal' | 'small'
  }>(),
  {
    type: 'normal',
  }
)

const isVisible = computed(() => props.type === 'normal' || [1, 4].includes(props.ams.tray.length))

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

.slot + .slot {
  margin-left: 4px;
}

.slot {
  height: 22px;
  width: 12px;
  border-radius: 6px;
  border: 1px solid var(--van-background-5);
  background-color: var(--van-background-4);
  overflow: hidden;
  display: flex;
  align-items: end;
}

.slot > div {
  width: 100%;
  height: 100%;
  border-radius: 6px;
}

.ams-small {
  position: relative;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

.ams-small::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  pointer-events: none;
  z-index: 1;
}

.ams-small.ams-4-slot {
  width: 52px;
  height: 32px;
}

.ams-small.ams-4-slot::after {
  background-image: url(/src/assets/images/four_slot_ams_item_dark.svg);
}

.ams-small.ams-1-slot {
  width: 30px;
  height: 32px;
}

.ams-small.ams-1-slot::after {
  background-image: url(/src/assets/images/single_slot_ams_item_dark.svg);
}

.ams-small .slot {
  position: relative;
  z-index: 0;
  height: 16px;
  width: 10px;
  border-radius: 0;
  border: 0;
  margin-top: 8px;
}

.ams-small .slot + .slot {
  margin-left: 0;
}

.ams-small .slot > div {
  border-radius: 0;
}

</style>
