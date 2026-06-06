<template>
  <van-popup
    :show="show"
    :class="{ popup: true, 'popup-bottom': isPortrait }"
    :position="isPortrait ? 'bottom' : 'right'"
    teleport=".root"
    :overlay-style="{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }"
    :style="{ position: 'absolute' }"
    @click-overlay="handleClose"
  >
    <NavHeader
      :title="title"
      @back="handleClose"
    >
      <template v-if="slots['header-right']" #right>
        <slot name="header-right"></slot>
      </template>
    </NavHeader>

    <slot></slot>
  </van-popup>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useSlots } from 'vue'

withDefaults(
  defineProps<{
    show: boolean
    title: string
  }>(),
  {}
)

const isPortrait = ref(false)
const slots = useSlots()

const updateOrientation = () => {
  isPortrait.value = window.innerHeight > window.innerWidth
}

onMounted(() => {
  updateOrientation()
  window.addEventListener('resize', updateOrientation)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateOrientation)
})

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void
}>()

const handleClose = () => {
  emit('update:show', false)
}

</script>

<style scoped>
.nav-header {
  height: 40px;
}

.popup {
  position: absolute !important;
  background: var(--van-background-3);
  padding: 4px 12px;
  display: grid;
  gap: 8px;
  align-content: start;
  height: 100%;
  padding-right: calc(12px + env(safe-area-inset-right));
}

.popup-bottom {
  width: 100%;
  height: auto;
  max-height: 100%;
  padding-right: 12px;
  padding-bottom: 12px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}

@media (orientation: portrait) {
  .popup {
    padding-bottom: 4px;
    padding-bottom: calc(4px + env(safe-area-inset-bottom));
  }
}
</style>
