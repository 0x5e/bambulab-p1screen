<template>
  <van-popover
    v-model:show="showPopover"
    trigger="manual"
    placement="bottom"
    :actions="actions"
    :offset="[0, -32]"
    style="--van-popover-action-width: 80px;"
    @select="handleSelect"
  >
    <template #reference>
      <div class="tray" @click.stop="handleTrayClick">
        <div class="filament" :style="{ '--tray-bg': bgColor }"></div>
        <span class="name" :style="{ color: textColor }">{{ name }}</span>
        <span class="material" :style="{ color: textColor }">{{ material }}</span>
        <span class="icon" :style="{ backgroundColor: textColor}"></span>
      </div>
    </template>
  </van-popover>
</template>

<script setup lang="ts">
import { colord } from 'colord'
import { computed, toRaw, ref } from 'vue'
import type { PopoverAction } from 'vant'
import type { DeviceTray } from '../api/models'

const props = withDefaults(
  defineProps<{
    name: string
    tray?: DeviceTray
  }>(),
  {
  }
)

const showPopover = ref(false)

const actions = computed<PopoverAction[]>(() => {
  const menu: PopoverAction[] = [
    { type: 'edit', text: '编辑' },
    { type: 'load', text: '进料' },
  ]
  if (Number(props.tray?.id) !== 254) {
    menu.push({ type: 'reload', text: '重读' })
  }
  return menu
})

const material = computed(() => props.tray?.tray_type || '?')
const color = computed(() => props.tray ? `#${props.tray.tray_color}` : getComputedStyle(document.documentElement).getPropertyValue('--van-text-color').trim())

const handleTrayClick = () => {
  if (!props.tray) return
  showPopover.value = !showPopover.value
}

const handleSelect = (action: PopoverAction) => {
  console.log('[Tray] type =', action.type, ', tray =', toRaw(props.tray))
  showPopover.value = false
}

const bgColor = computed(() => {
  const parsedColor = colord(color.value)
  return parsedColor.toRgbString()
})

const textColor = computed(() => {
  let parsedColor = colord(bgColor.value)
  if (parsedColor.rgba.a === 0) return 'white'
  return parsedColor.brightness() > 0.5 ? 'black' : 'white'
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
  --tray-bg: var(--van-text-color-2);
  background-image:
    linear-gradient(var(--tray-bg), var(--tray-bg)),
    linear-gradient(45deg, var(--van-background-5) 25%, transparent 25%, transparent 75%, var(--van-background-5) 75%),
    linear-gradient(45deg, var(--van-background-5) 25%, transparent 25%, transparent 75%, var(--van-background-5) 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 0, 6px 6px;
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
