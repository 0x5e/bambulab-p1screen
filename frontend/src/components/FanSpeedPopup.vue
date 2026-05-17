<template>
  <BasePopup
    :show="show"
    :title="t('fan')"
    @update:show="emit('update:show', $event)"
  >
    <div class="fan-speed-card">
      <div class="fan-title-group">
        <span class="fan-speed-name">{{ t('fan_part') }}</span>
        <img class="fan-speed-icon" :src="fanPartSpeed > 0 ? fanOnIcon : fanOffIcon" />
      </div>
      <van-switch
        :model-value="fanPartSpeed > 0"
        @update:model-value="(val) => onSwitchChange(FanType.Part, val)"
        size="20px"
      />
      <van-stepper
        v-model="fanPartSpeed"
        @plus="() => onStepperChange(FanType.Part, Math.min(fanPartSpeed + 10, 100))"
        @minus="() => onStepperChange(FanType.Part, Math.max(fanPartSpeed - 10, 0))"
        :min="0"
        :max="100"
        :step="10"
        button-size="24px"
        input-width="36px"
        disable-input
      />
    </div>

    <div class="fan-speed-card">
      <div class="fan-title-group">
        <span class="fan-speed-name">{{ t('fan_aux') }}</span>
        <img class="fan-speed-icon" :src="fanAuxSpeed > 0 ? fanOnIcon : fanOffIcon" />
      </div>
      <van-switch
        :model-value="fanAuxSpeed > 0"
        @update:model-value="(val) => onSwitchChange(FanType.Aux, val)"
        size="20px"
      />
      <van-stepper
        v-model="fanAuxSpeed"
        @plus="() => onStepperChange(FanType.Aux, Math.min(fanAuxSpeed + 10, 100))"
        @minus="() => onStepperChange(FanType.Aux, Math.max(fanAuxSpeed - 10, 0))"
        :min="0"
        :max="100"
        :step="10"
        button-size="24px"
        input-width="36px"
        disable-input
      />
    </div>

    <div class="fan-speed-card">
      <div class="fan-title-group">
        <span class="fan-speed-name">{{ t('fan_chamber') }}</span>
        <img class="fan-speed-icon" :src="fanChamberSpeed > 0 ? fanOnIcon : fanOffIcon" />
      </div>
      <van-switch
        :model-value="fanChamberSpeed > 0"
        @update:model-value="(val) => onSwitchChange(FanType.Chamber, val)"
        size="20px"
      />
      <van-stepper
        v-model="fanChamberSpeed"
        @plus="() => onStepperChange(FanType.Chamber, Math.min(fanChamberSpeed + 10, 100))"
        @minus="() => onStepperChange(FanType.Chamber, Math.max(fanChamberSpeed - 10, 0))"
        :min="0"
        :max="100"
        :step="10"
        button-size="24px"
        input-width="36px"
        disable-input
      />
    </div>
  </BasePopup>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FanType } from '@bambulab-p1screen/printer-api'
import { client } from '../printer'
import { usePrinterStore } from '../stores/printer'
import fanOnIcon from '../assets/images/monitor_fan_on.svg'
import fanOffIcon from '../assets/images/monitor_fan_off.svg'

const { t } = useI18n()
const { device } = usePrinterStore()

const getFanSpeedPercent = (type: FanType) => Math.round(client.getFanSpeed(type) / 255 * 10) * 10
const fanPartSpeed = ref(getFanSpeedPercent(FanType.Part))
const fanAuxSpeed = ref(getFanSpeedPercent(FanType.Aux))
const fanChamberSpeed = ref(getFanSpeedPercent(FanType.Chamber))

watch(device, () => {
  fanPartSpeed.value = getFanSpeedPercent(FanType.Part)
  fanAuxSpeed.value = getFanSpeedPercent(FanType.Aux)
  fanChamberSpeed.value = getFanSpeedPercent(FanType.Chamber)
}, { immediate: true })

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void
}>()

const onSwitchChange = (type: FanType, checked: boolean) => {
  const percentage = checked ? 100 : 0
  const speed = Math.round(percentage / 100 * 255)
  console.log(`[Controls] setFanSpeed (switch): type=${type}, speed=${speed}`)
  client.setFanSpeed(type, speed)
}

const onStepperChange = (type: FanType, value: number) => {
  const percentage = Number(value)
  const speed = Math.round(percentage / 100 * 255)
  console.log(`[Controls] setFanSpeed (stepper): type=${type}, speed=${speed}`)
  client.setFanSpeed(type, speed)
}

</script>

<style scoped>
.fan-speed-card {
  background: var(--van-background-4);
  border-radius: 10px;
  width: 250px;
  max-width: 100%;
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  align-items: center;
}

.fan-title-group {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
}

.fan-speed-icon {
  width: 16px;
  height: 16px;
  margin-left: 4px;
}

.fan-speed-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--van-text-color-2);
}

.fan-speed-card :deep(.van-switch) {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
}

.fan-speed-card .van-stepper {
  grid-column: 2;
  grid-row: 2;
  margin-top: 8px;
  justify-self: end;
}

:deep(.van-stepper__minus--disabled, .van-stepper__plus--disabled) {
  filter: brightness(1.08);
}

@media (orientation: portrait) {
  .fan-speed-card {
    width: 100%;
  }
}
</style>
