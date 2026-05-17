<template>
  <BasePopup
    :show="show"
    :title="title"
    @update:show="emit('update:show', $event)"
  >
    <template #header-right>
      <van-button
        class="header-action-btn"
        type="primary"
        size="normal"
        :disabled="inputValue.length === 0"
        @click="handleConfirm"
      >
        {{ t('confirm') }}
      </van-button>
    </template>

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
        <button class="temp-key" type="button" @click="handleKey('<')">
          <i-material-symbols-backspace-rounded />
        </button>
      </div>
    </div>
  </BasePopup>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { TemperatureType } from '@bambulab-p1screen/printer-api'

const { t } = useI18n()

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
      return t('nozzle_temperature')
    case TemperatureType.Heatbed:
      return t('heatbed_temperature')
    case TemperatureType.Chamber:
      return t('chamber_temperature')
    default:
      return t('temperature')
  }
})

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void
  (event: 'confirm', type: TemperatureType | undefined, value: number): void
}>()

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
const inputValue = ref('')

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.show) return
  if (event.key >= '0' && event.key <= '9') {
    event.preventDefault()
    handleKey(event.key)
  } else if (event.key === 'Backspace') {
    event.preventDefault()
    handleKey('<')
  } else if (event.key === 'Enter') {
    event.preventDefault()
    handleConfirm()
  }
}

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      inputValue.value = props.value !== undefined ? String(props.value) : ''
      window.addEventListener('keydown', handleKeydown)
    } else {
      window.removeEventListener('keydown', handleKeydown)
    }
  }
)

const handleKey = (key: string) => {
  if (key === '<') {
    inputValue.value = inputValue.value.slice(0, -1)
    return
  }
  if (inputValue.value.length >= 3) {
    return
  } else if (inputValue.value === '0') {
    inputValue.value = key
  } else {
    inputValue.value += key
  }
}

const handleConfirm = () => {
  if (inputValue.value.length === 0) return
  const value = Number(inputValue.value)
  emit('confirm', props.type, Number.isFinite(value) ? value : 0)
  emit('update:show', false)
}

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.temp-popup-content {
  width: 250px;
  max-width: 100%;
  display: grid;
  gap: 8px;
}

.header-action-btn {
  width: 80px;
  height: 32px;
  font-size: 16px;
}

.temp-display {
  background: var(--van-background-2);
  border-radius: 10px;
  padding: 14px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  font-size: 20px;
  height: 50px;
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
  display: flex;
  align-items: center;
  justify-content: center;

  background: var(--van-background-5);
  border: 0;
  border-radius: 4px;
  width: 100%;
  min-width: 0;
  height: 44px;
  font-size: 18px;
}

.temp-key--zero {
  grid-column: 2 / 3;
}

@media (orientation: portrait) {
  .temp-popup-content {
    width: 100%;
  }
}
</style>
