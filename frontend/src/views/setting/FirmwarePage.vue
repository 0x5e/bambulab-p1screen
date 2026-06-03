<template>
  <BasePage :title="t('firmware')">
    <van-cell-group v-if="modules" inset>
      <van-cell v-for="module in modules" :key="module.sn" :title="module.product_name" :value="module.sw_ver" v-show="module.visible" />
    </van-cell-group>
  </BasePage>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { usePrinterStore } from '../../stores/printer'

const { t } = useI18n()
const { modules } = usePrinterStore()
</script>
<style scoped>

</style>
