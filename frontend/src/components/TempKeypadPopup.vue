<template>
  <van-popup :show="show" class="popup" position="right" @click-overlay="handleClose">
    <div class="popup-header">
      <button class="popup-header-back" type="button" @click="handleClose">
        <span class="material-symbols-rounded">arrow_back_ios</span>
      </button>
      <div class="popup-header-title">{{ title }}</div>
      <van-button class="popup-header-confirm" type="primary" size="normal" :disabled="inputValue.length === 0" @click="handleConfirm">确定</van-button>
    </div>

    <div class="temp-display">
      <div class="temp-value">{{ displayValue }}</div>
      <div class="temp-unit">°C</div>
    </div>

    <div class="temp-keypad">
      <button v-for="key in keys" :key="key" class="temp-key" type="button" @click="handleKey(key)">
        {{ key }}
      </button>
      <button class="temp-key temp-key--zero" type="button" @click="handleKey('0')">0</button>
      <button class="temp-key temp-key--back" type="button" @click="handleBackspace">
        <span class="material-symbols-rounded">backspace</span>
      </button>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { TemperatureType } from '../services/device'

const props = withDefaults(
  defineProps<{
    show: boolean
    value?: number
    type?: TemperatureType
  }>(),
  {
    value: undefined
  }
)

const title = computed(() => {
  switch (props.type) {
    case TemperatureType.Nozzle:
      return '喷嘴温度'
    case TemperatureType.Heatbed:
      return '热床温度'
    case TemperatureType.Chamber:
      return '机箱温度'
    default:
      return '温度'
  }
})

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void
  (event: 'confirm', type: TemperatureType | undefined, value: number): void
}>()

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
const inputValue = ref('')

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      inputValue.value = props.value !== undefined ? String(props.value) : ''
    }
  }
)

const displayValue = computed(() => {
  return inputValue.value
})

const handleKey = (key: string) => {
  if (inputValue.value.length >= 3) return
  if (inputValue.value === '0') {
    inputValue.value = key
    return
  }
  inputValue.value += key
}

const handleBackspace = () => {
  inputValue.value = inputValue.value.slice(0, -1)
}

const handleClose = () => {
  emit('update:show', false)
}

const handleConfirm = () => {
  const value = Number(inputValue.value)
  emit('confirm', props.type, Number.isFinite(value) ? value : 0)
  emit('update:show', false)
}
</script>

<style scoped>
.temp-display {
  background: var(--van-background-2);
  border-radius: 10px;
  padding: 14px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  font-size: 20px;
  height: 58px;
}

.temp-value {
  text-align: center;
  letter-spacing: 1px;
  padding-left: 22px;
}

.temp-unit {
  color: var(--van-text-color-2);
}

.temp-keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  align-self: start;
}

.temp-key {
  background: var(--van-background-5);
  border: 0;
  border-radius: 8px;
  width: 100px;
  height: 44px;
  font-size: 18px;
  cursor: pointer;
}

.temp-key--zero {
  grid-column: 2 / 3;
}

.temp-key--back {
  display: grid;
  place-items: center;
}
</style>
