<template>
  <div class="tray">
    <div class="filament" :style="{ backgroundColor: bgColor }" @click="onClick"></div>
    <span class="name" :style="{ color: textColor }">{{ name }}</span>
    <span class="material" :style="{ color: textColor }">{{ material.length > 0 ? material : '?' }}</span>
    <span class="icon" :style="{ backgroundColor: textColor}"></span>
  </div>
</template>

<script setup lang="ts">
import { colord } from 'colord'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    material: string
    color: string
    onClick?: () => void
  }>(),
  {
  }
)

const bgColor = computed(() => {
  // fix vt_tray wrong alpha
  const bgColor = colord(props.color)
  bgColor.rgba.a = 1
  return bgColor.toRgbString()
})

const textColor = computed(() => {
  const bgColor = colord(props.color)
  return bgColor.brightness() > 0.5 ? 'black' : 'white'
})

</script>

<style scoped>
.tray {
  display: grid;
  width: 48px;
  height: 64px;
  margin: 8px;
}
.filament {
  width: 48px;
  height: 64px;
  border: var(--van-background-5) 2px solid;
  background-color: var(--van-background-2);
}
.filament::before, .filament::after {
  display: block;
  width: 4px;
  height: 130%;
  border-radius: 2px;
  position: relative;
  content: '\0020';
  background-color: var(--van-background-5);
}
.filament::before {
  left: -2px;
  top: -15%;
}
.filament::after {
  left: calc(100% - 2px);
  top: -145%;
}
.tray > span {
  position: relative;
  top: -58px;
  font-weight: 600;
  text-align: center;
}
.tray > .name {
  font-size: 11px;
}
.tray > .material {
  font-size: 12px;
}
.tray > .icon {
  height: 18px;
  margin: 0 15px;
  -webkit-mask-image: url(/src/assets/images/rename_edit.svg);
  mask-image: url(/src/assets/images/rename_edit.svg);
}
</style>