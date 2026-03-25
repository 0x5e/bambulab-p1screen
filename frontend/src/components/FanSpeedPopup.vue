<template>
  <BasePopup
    :show="show"
    title="风扇"
    @update:show="emit('update:show', $event)"
  >
    <div class="fan-speed-card" v-for="item in fans" :key="item.type">
      <div>
        <img class="fan-speed-icon" :src="client.getFanSpeed(item.type) !== 0 ? fanOnIcon : fanOffIcon" />
        <span class="fan-speed-name">{{ item.name }} {{ (client.getFanSpeed(item.type) / 255 * 100).toFixed(0) }}%</span>
      </div>
      <van-slider v-model="fanSpeeds[item.type].value" @change="(value) => onChange(item.type, value)"/>
    </div>
  </BasePopup>
</template>

<script setup lang="ts">
import { FanType } from '../api/enums'
import { PrinterClient } from '../api/PrinterClient'
import fanOnIcon from '../assets/images/monitor_fan_on.svg'
import fanOffIcon from '../assets/images/monitor_fan_off.svg'
import { ref, type Ref } from 'vue'
import BasePopup from './BasePopup.vue'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void
}>()

const client = PrinterClient.getInstance()

const fans: { type: FanType, name: string }[] = [{
  type: FanType.Part,
  name: '部件'
}, {
  type: FanType.Aux,
  name: '辅助'
}, {
  type: FanType.Chamber,
  name: '机箱'
}]

const fanSpeeds: Record<FanType, Ref<number>> = {
  [FanType.Part]: ref(client.getFanSpeed(FanType.Part)),
  [FanType.Aux]: ref(client.getFanSpeed(FanType.Aux)),
  [FanType.Chamber]: ref(client.getFanSpeed(FanType.Chamber))
}

const onChange = (type: FanType, value: number) => {
  let speed = Math.floor(Number(value) / 100 * 255)
  console.log(`[Controls] setFanSpeed: type=${type}, speed=${speed}`)
  client.setFanSpeed(type, speed)
}

</script>

<style scoped>
.fan-speed-card {
  background: var(--van-background-5);
  border-radius: 10px;
  width: 250px;
  max-width: 100%;
  max-height: 100px;
  padding: 8px 22px 14px;
}

.fan-speed-card div {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 13px;
}

.fan-speed-card .van-slider {
  height: 4px;
  width: 100%;
  margin: 22px 0 0;
}

@media (orientation: portrait) {
  .fan-speed-card {
    width: 100%;
  }
}
</style>
