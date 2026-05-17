<template>
  <BaseSubPage :title="t('nozzle_extruder')">
    <div class="nozzle-container">
      <img src="../../assets/images/extruder_normal_23.png" />
      <div>
        <label class="extruder-label">{{ t('extruder') }}</label>
        <button class="extruder-btn" type="button" @click="handleMove('e', -10)">
          <img src="../../assets/images/monitor_extruder_up.svg" />
        </button>
        <button class="extruder-btn" type="button" @click="handleMove('e', 10)">
          <img src="../../assets/images/monitor_extruder_down.svg" />
        </button>
      </div>
      <div>
        <label class="nozzle-label">{{ t('nozzle') }}</label>
        <label class="nozzle-temp" v-on:click="openTempPopup">
          <span>{{ Math.floor(Number(device?.nozzle_temper ?? '0')) }}</span> / {{ Math.floor(Number(device?.nozzle_target_temper ?? '0')) }} °C
        </label>
        <div class="nozzle-types">
          <label class="nozzle-type">{{ t('speed_standard') }}</label>
          <label class="nozzle-type">{{ nozzleTypeName() }}</label>
          <label class="nozzle-type">{{ device?.nozzle_diameter || 0 }}mm</label>
          <span class="nozzle-edit" v-on:click="editNozzle" hidden></span>
        </div>
      </div>
    </div>

    <TempKeypadPopup
      v-model:show="showTempPopup"
      :type="TemperatureType.Nozzle"
      @confirm="handleTempConfirm"
    />

  </BaseSubPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { showDialog, showToast } from 'vant'
import { TemperatureType } from '@bambulab-p1screen/printer-api'
import { client } from '../../printer'
import { usePrinterStore } from '../../stores/printer'

const { device } = usePrinterStore()
const { t } = useI18n()
const showTempPopup = ref(false)
const nozzleTypeName = () => {
  return { stainless_steel: t('nozzle_type_stainless_steel'), hardened_steel: t('nozzle_type_hardened_steel'), '': t('unknown') }[device.value?.nozzle_type || '']
}

const handleMove = (axis: 'e', step: -10 | -1 | 0| 1 | 10) => {
  console.log(`[NozzlePage] move axis=e, step=${step}`)
  if (Number(device.value?.nozzle_temper ?? '0') < 170) {
    showDialog({ message: t('nozzle_heat_warning') })
    return
  }

  let gcode = `M211 S
M211 X1 Y1 Z1
M1002 push_ref_mode
M83
G1 E${step} F150
M1002 pop_ref_mode
M211 R
`
  client.request('print.gcode_line', { param: gcode })
}

const openTempPopup = () => {
  showTempPopup.value = true
}

const handleTempConfirm = (type: TemperatureType | undefined, value: number) => {
  if (!type) return

  console.log(`[NozzlePage] set temperature type=${type}, value=${value}`)
  client.setTemperature(type, value)
}

const editNozzle = () => {
  showToast({
    message: t('not_supported'),
    position: 'bottom',
  })
}

</script>

<style scoped>
.nozzle-container {
  display: grid;
  grid-template-columns: 180px 80px 170px;
  align-items: center;
  justify-items: center;
  justify-content: center;
  height: 100%;
}

.nozzle-container > img {
  width: 100px;
}

label {
  display: block;
  font-size: 14px;
  color: var(--van-text-color-2);
  text-align: center;
  margin-bottom: 10px;
}

.extruder-btn {
  background: var(--van-background-4);
  border-radius: 12px;
  padding: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  width: 60px;
  height: 50px;
}

.extruder-btn:active, .nozzle-temp:active, .nozzle-edit:active {
  filter: brightness(0.9);
}

.nozzle-label, .nozzle-type {
  text-align: left;
}
.nozzle-temp {
  background-color: var(--van-background-4);
  padding: 0 12px;
  border-radius: 6px;
  width: 120px;
  font-size: 16px;
  line-height: 40px;
  height: 40px;
}
.nozzle-temp > span {
  color: var(--van-text-color);
  font-size: 17px;
  font-weight: 500;
}

.nozzle-types {
  margin: 23px 0;
  position: relative;
}

.nozzle-type {
  color: var(--van-text-color);
  font-size: 12px;
  line-height: 18px;
  margin-bottom: 0;
}

.nozzle-edit {
  position: absolute;
  top: 36px;
  left: 80px;
  background-color: var(--van-text-color-2);
  mask-image: url(/src/assets/images/ams_editable.svg);
  width: 13px;
  height: 15px;
}

@media (orientation: portrait) {
  .nozzle-container {
    grid-template-rows: 200px 200px;
    grid-template-columns: 80px 170px;
  }
  .nozzle-container > img {
    grid-row: 1;
    grid-column: 1 / span 2;
    width: auto;
    height: 100px;
  }
  .nozzle-container > div {
    grid-row: 2;
  }
}

</style>
