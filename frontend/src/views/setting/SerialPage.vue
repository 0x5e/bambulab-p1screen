<template>
  <BasePage :title="t('device_serial')">
    <van-cell-group v-if="modules" inset :title="t('device_info')">
      <van-cell :title="t('device_name')" :value="getCurrentDevice()?.name" />
      <!-- <van-cell title="打印机使用时间" value="x 小时" /> -->
    </van-cell-group>
    <van-cell-group v-if="modules" inset :title="t('serial_number')">
      <van-cell v-for="module in modules" :key="module.sn" :title="module.product_name" :value="module.sn" v-show="module.visible" />
    </van-cell-group>
  </BasePage>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { getCurrentDevice } from '../../utils/device'
import { usePrinterStore } from '../../stores/printer'

const { t } = useI18n()
const { modules } = usePrinterStore()
</script>
<style scoped>

</style>
