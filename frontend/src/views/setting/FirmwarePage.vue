<template>
  <BaseSubPage title="固件">
    <van-cell-group v-if="modules" inset>
      <van-cell v-for="module in modules" :key="module.sn" :title="module.product_name" :value="module.sw_ver" v-show="module.visible" />
    </van-cell-group>
  </BaseSubPage>
</template>
<script setup lang="ts">
import { usePrinterStore } from '../../stores/printer'

const { modules } = usePrinterStore()
</script>
<style scoped>

</style>
