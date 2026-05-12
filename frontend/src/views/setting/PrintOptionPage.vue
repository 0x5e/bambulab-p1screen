<template>
  <BaseSubPage title="打印选项">
    <SettingCell
      v-if="device"
      title="丢步自动恢复"
      label="检测到电机运行异常导致跳过步骤时，尝试自动恢复。"
      :selected="auto_recovery"
      @click="onChange"
    />
  </BaseSubPage>
</template>

<script setup lang="tsx">
import { ref, watch } from 'vue'
import { PrinterClient } from '../../api/PrinterClient'
import { HomeFlagBit } from '../../api/enums'
import { usePrinterStore } from '../../stores/printer'

const client = PrinterClient.getInstance()
const { device } = usePrinterStore()
const auto_recovery = ref(Boolean((device.value?.home_flag ?? 0) & (1 << HomeFlagBit.auto_recovery)))

watch(device, () => {
  auto_recovery.value = Boolean((device.value?.home_flag ?? 0) & (1 << HomeFlagBit.auto_recovery))
}, { immediate: true })

const onChange = async (selected: boolean) => {
  console.log('auto_recovery:', auto_recovery.value)
  console.log('selected:', selected)
  await client.request('print.print_option', { option: selected ? 1 : 0, auto_recovery: selected })
}
</script>

<style scoped>
.van-checkbox {
  display: block;
  padding-top: 4px;
  padding-right: 8px;
}
</style>
