<template>
  <BaseSubPage :title="t('print_options')">
    <SettingCell
      v-if="device"
      :title="t('auto_recovery')"
      :label="t('auto_recovery_desc')"
      :selected="auto_recovery"
      @click="onChange"
    />
  </BaseSubPage>
</template>

<script setup lang="tsx">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { HomeFlagBit } from '@bambulab-p1screen/printer-api'
import { client } from '../../printer'
import { usePrinterStore } from '../../stores/printer'

const { t } = useI18n()
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
