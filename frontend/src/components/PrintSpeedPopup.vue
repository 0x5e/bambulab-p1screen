<template>
  <BasePopup
    :show="show"
    title="打印速度"
    @update:show="emit('update:show', $event)"
  >
    <div class="print-speed-buttons">
      <van-button
        v-for="item in buttons"
        :key="item.value"
        :class="{ 'print-speed-button': true, 'print-speed-button-active': item.value === value }"
        type="primary"
        size="large"
        @click="handleConfirm(item.value)"
      >
        {{ item.label }}
      </van-button>
    </div>
  </BasePopup>
</template>

<script setup lang="ts">
import BasePopup from './BasePopup.vue'
import { PrintSpeedLevel } from '../api/enums'

type SpeedButton = {
  label: string
  value: PrintSpeedLevel
}

const buttons: SpeedButton[] = [{
  label: '狂暴模式（166%）',
  value: PrintSpeedLevel.Ludicrous,
}, {
  label: '运动模式（124%）',
  value: PrintSpeedLevel.Sport,
}, {
  label: '标准模式（100%）',
  value: PrintSpeedLevel.Standard,
}, {
  label: '静音模式（50%）',
  value: PrintSpeedLevel.Silent,
}]

withDefaults(
  defineProps<{
    show: boolean
    value?: number
  }>(),
  {
    value: undefined
  }
)

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void
  (event: 'confirm', value: number): void
}>()

const handleConfirm = (value: number) => {
  emit('confirm', value)
  emit('update:show', false)
}

</script>

<style scoped>

.print-speed-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
}

.print-speed-button {
  background: var(--van-background-5);
  border: 0;
  border-radius: 8px;
  width: 200px;
  height: 55px;
}

.print-speed-button-active {
  background: var(--van-primary-color);
}

</style>
