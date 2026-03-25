<template>
  <BasePopup
    :show="show"
    :title="title"
    :show-confirm="true"
    :confirm-disabled="inputValue.length === 0"
    @update:show="emit('update:show', $event)"
    @confirm="handleConfirm"
  >
    <div class="temp-popup-content">
      <div class="temp-display">
        <div class="temp-value">{{ inputValue }}</div>
        <div class="temp-unit">°C</div>
      </div>

      <div class="temp-keypad">
        <button v-for="key in keys" :key="key" class="temp-key" type="button" @click="handleKey(key)">
          {{ key }}
        </button>
        <button class="temp-key temp-key--zero" type="button" @click="handleKey('0')">0</button>
        <button class="temp-key temp-key--back" type="button" @click="handleBackspace">
          <i-material-symbols-backspace-rounded />
        </button>
      </div>
    </div>
  </BasePopup>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { TemperatureType } from '../api/enums'
import BasePopup from './BasePopup.vue'

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

const handleConfirm = () => {
  const value = Number(inputValue.value)
  emit('confirm', props.type, Number.isFinite(value) ? value : 0)
  emit('update:show', false)
}
</script>

<style scoped>
.temp-popup-content {
  width: 340px;
  max-width: 100%;
  display: grid;
  gap: 8px;
}

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
  width: 100%;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  align-self: start;
}

.temp-key {
  background: var(--van-background-5);
  border: 0;
  border-radius: 8px;
  width: 100%;
  min-width: 0;
  height: 44px;
  font-size: 18px;
}

.temp-key--zero {
  grid-column: 2 / 3;
}

.temp-key--back {
  display: grid;
  place-items: center;
}

@media (orientation: portrait) {
  .temp-popup-content {
    width: 100%;
  }
}
</style>
