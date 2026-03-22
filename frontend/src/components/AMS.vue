<template>
  <div class="ams-card">
    <div class="ams-card-container">
      <Tray :name="`${amsPrefix}1`" :material="trayList ? trayList[0].tray_type : '?'" :color="trayList ? `#${trayList[0].tray_color}` : ''" />
      <Tray :name="`${amsPrefix}2`" :material="trayList ? trayList[1].tray_type : '?'" :color="trayList ? `#${trayList[1].tray_color}` : ''" />
      <Tray :name="`${amsPrefix}3`" :material="trayList ? trayList[2].tray_type : '?'" :color="trayList ? `#${trayList[2].tray_color}` : ''" />
      <Tray :name="`${amsPrefix}4`" :material="trayList ? trayList[3].tray_type : '?'" :color="trayList ? `#${trayList[3].tray_color}` : ''" />
      <span class="ams-name" >AMS-{{ amsPrefix }}</span>
    </div>
    <img class="ams-hum" :src="humIcon"/>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Tray from '../components/Tray.vue'
import { PrinterClient } from '../services/PrinterClient'
import humLevelIcon from '../assets/images/hum_level1_no_num_dark.svg'
import humLevel1Icon from '../assets/images/hum_level1_dark.svg'
import humLevel2Icon from '../assets/images/hum_level2_dark.svg'
import humLevel3Icon from '../assets/images/hum_level3_dark.svg'
import humLevel4Icon from '../assets/images/hum_level4_dark.svg'
import humLevel5Icon from '../assets/images/hum_level5_dark.svg'

const props = withDefaults(
  defineProps<{
    amsId: string
  }>(),
  {
  }
)

const client = PrinterClient.getInstance()
const amsPrefix = ref(String.fromCharCode('A'.charCodeAt(0) + Number(props.amsId ?? '0')))
const ams = computed(() => client.device.print.ams?.ams?.find(item => item.id === props.amsId))
const trayList = computed(() => {
  return ams.value?.tray.sort((a, b) => Number(a.id) - Number(b.id))
})

const humIcon = computed(() => {
  const humLevel = Number(ams.value?.humidity ?? '0')
  return [humLevelIcon, humLevel1Icon, humLevel2Icon, humLevel3Icon, humLevel4Icon, humLevel5Icon][humLevel]
})

</script>

<style scoped>
.ams-card {
  width: calc(64px * 4 + 8px);
  background-color: var(--van-background-2);
}
.ams-card-container {
  display: grid;
  grid-template-columns: repeat(4, 60px);
  padding: 8px;
  border-radius: 8px;
  border: var(--van-background-4) 1px solid;
  overflow: hidden;
  margin-bottom: -35px;
}
.ams-name {
  width: 300px;
  background-color: var(--van-background-3);
  margin-top: 8px;
  margin-bottom: -8px;
  margin-left: -8px;
  padding-left: 8px;
  font-size: 12px;
  line-height: 20px;
}
.ams-hum {
  position: relative;
  width: 30px;
  aspect-ratio: 1;
  left: 248px;
  padding: 4px;
  border-radius: 12px;
  border: var(--van-background-3) 1px solid;
  background-color: var(--van-background);
}
</style>
