<template>
  <van-popover
    v-model:show="showPopover"
    trigger="manual"
    placement="bottom"
    :actions="actions"
    :offset="[0, -32]"
    style="--van-popover-action-width: 90px;"
    @select="handleTrayAction"
  >
    <template #reference>
      <div class="tray" @click.stop="handleTrayClick">
        <div class="remain" :style="{ visibility: isExt || props.tray.remain === -1 ? 'hidden' : 'visible' }">
          <div :style="{ backgroundColor: bgColor, width: `${props.tray.remain}%` }"></div>
        </div>
        <div class="filament" :style="{ '--tray-bg': bgColor }"></div>
        <span class="name" :style="{ color: textColor }">{{ name }}</span>
        <span class="material" :style="{ color: textColor }">{{ material }}</span>
        <template v-if="exist || isExt">
          <span v-if="readonly" class="icon icon-readonly" :style="{ backgroundColor: textColor}"></span>
          <span v-else class="icon icon-edit" :style="{ backgroundColor: textColor}"></span>
        </template>
        <div v-if="isCurrent" class="arrow">
          <div class="line" :style="{ borderColor: bgColor }" ></div>
          <i-material-symbols-arrow-drop-down :style="{ color: bgColor }" />
        </div>
      </div>
    </template>
  </van-popover>
</template>

<script setup lang="ts">
import { colord } from 'colord'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { type PopoverAction } from 'vant'
import type { DeviceTray } from '../api/device'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    name: string
    amsId: number
    tray: DeviceTray
    trayNow: number
    trayTar: number
    trayPrev: number
    popoverAction?: (amsId: number, tray: DeviceTray, action: PopoverAction) => void
  }>(),
  {
  }
)

const showPopover = ref(false)

const actions = computed<PopoverAction[]>(() => {
  if (!exist.value && !isExt.value) return []

  const menu: PopoverAction[] = [
    { type: 'edit', text: readonly.value ? t('view') : t('edit') },
  ]

  if (isLoading.value) { // 换料中
    if (props.trayTar !== 255 && isTarget.value) {
      menu.push({ type: 'load', text: t('loading_filament'), disabled: true })
    } else if (props.trayTar === 255 && isPrev.value) {
      menu.push({ type: 'load', text: t('unloading_filament'), disabled: true })
    } else {
      menu.push({ type: 'load', text: t('load'), disabled: true })
    }
  } else {
    menu.push(isCurrent.value ? { type: 'unload', text: t('unload') } : { type: 'load', text: t('load') })
  }

  if (!isExt.value) {
    menu.push({ type: 'reload', text: t('reload') })
  }
  return menu
})

const material = computed(() => props.tray.tray_type || '?')
const color = computed(() => `#${props.tray.tray_color}`)
const exist = computed(() => props.tray.tray_info_idx?.length > 0)
const readonly = computed(() => props.tray.tag_uid !== '0000000000000000')
const isLoading = computed(() => props.trayNow !== props.trayTar)
const isCurrent = computed(() => trayEqual(props.trayNow))
const isTarget = computed(() => trayEqual(props.trayTar))
const isPrev = computed(() => trayEqual(props.trayPrev))
const isExt = computed(() => trayEqual(254))

const trayEqual = (target: number) => (target === 254 && Number(props.tray.id) === 254) || (props.amsId * 4 + Number(props.tray.id) === target)

const handleTrayClick = () => {
  if (!props.tray) return
  showPopover.value = !showPopover.value
}

const handleTrayAction = (action: PopoverAction) => {
  showPopover.value = false
  if (props.popoverAction) props.popoverAction(props.amsId, props.tray, action)
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
  margin-left: 6px;
}
.remain {
  position: relative;
  width: 24px;
  height: 4px;
  border-radius: 2px;
  top: -6px;
  margin: 0 12px;
  background-color: var(--van-background-5);
  overflow: hidden;
}
.remain > div {
  height: 100%;
  border-radius: 2px;
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
.name {
  font-size: 11px;
}
.material {
  font-size: 12px;
}
.icon {
  height: 12px;
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
  margin: 4px;
}
.icon-edit {
  mask-image: url(/src/assets/images/rename_edit.svg);
}
.icon-readonly {
  mask-image: url(/src/assets/images/ams_slot_readonly.svg);
}
.arrow {
  position: relative;
  top: -53px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.line {
  width: 4px;
  height: 15px;
  border: 2px dashed;
  margin-bottom: -8px;
}
:deep(.van-popover__action-text) {
  white-space: nowrap !important;
}
</style>
