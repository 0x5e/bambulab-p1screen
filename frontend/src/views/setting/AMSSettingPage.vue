<template>
  <BaseSubPage :title="t('ams_settings')">
    <div v-if="device">
      <SettingCell
        :title="t('ams_tray_read')"
        :label="t('ams_tray_read_desc')"
        :selected="tray_read_option"
        @click="onChangeUserSetting('tray_read_option', $event)"
      />
      <SettingCell
        :title="t('ams_startup_read')"
        :label="t('ams_startup_read_desc')"
        :selected="startup_read_option"
        @click="onChangeUserSetting('startup_read_option', $event)"
      />
      <SettingCell
        :title="t('ams_remain_estimate')"
        :label="t('ams_remain_estimate_desc')"
        :selected="calibrate_remain_flag"
        @click="onChangeUserSetting('calibrate_remain_flag', $event)"
      />
      <SettingCell
        :title="t('ams_auto_switch')"
        :label="t('ams_auto_switch_desc')"
        :selected="auto_switch_filament"
        @click="onChangePrintOption('auto_switch_filament', $event)"
      />
    </div>
  </BaseSubPage>
</template>

<script setup lang="tsx">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { HomeFlagBit } from '@bambulab-p1screen/printer-api'
import { client } from '../../printer'
import { showToast } from 'vant'
import { usePrinterStore } from '../../stores/printer'

const { t } = useI18n()
const { device } = usePrinterStore()
const tray_read_option = ref(device.value?.ams.insert_flag === true)
const startup_read_option = ref(device.value?.ams.power_on_flag === true)
const calibrate_remain_flag = ref(Boolean((device.value?.home_flag ?? 0) & (1 << HomeFlagBit.calibrate_remain_flag)))
const auto_switch_filament = ref(Boolean((device.value?.home_flag ?? 0) & (1 << HomeFlagBit.auto_switch_filament)))

watch(device, () => {
  tray_read_option.value = device.value?.ams.insert_flag === true
  startup_read_option.value = device.value?.ams.power_on_flag === true
  calibrate_remain_flag.value = Boolean((device.value?.home_flag ?? 0) & (1 << HomeFlagBit.calibrate_remain_flag))
  auto_switch_filament.value = Boolean((device.value?.home_flag ?? 0) & (1 << HomeFlagBit.auto_switch_filament))
}, { immediate: true })

const onChangeUserSetting = async (key: string, selected: boolean) => {
  if (!device.value) return
  try {
    const params: any = {
      'ams_id': 0,
      'tray_read_option': device.value.ams.insert_flag,
      'startup_read_option': device.value.ams.power_on_flag,
      'calibrate_remain_flag': Boolean((device.value.home_flag ?? 0) & (1 << HomeFlagBit.calibrate_remain_flag)),
    }
    params[key] = selected
    await client.request('print.ams_user_setting', params)
    showToast({ message: t('success'), position: 'bottom'})
    switch(key) {
      case 'tray_read_option':
        device.value.ams.insert_flag = selected
        break
      case 'startup_read_option':
        device.value.ams.power_on_flag = selected
        break
      case 'calibrate_remain_flag':
        if (selected) {
          device.value.home_flag = device.value.home_flag | (1 << HomeFlagBit.calibrate_remain_flag)
        } else {
          device.value.home_flag = device.value.home_flag & ~(1 << HomeFlagBit.calibrate_remain_flag)
        }
        break
    }
  } catch (error: any) {
    showToast({ message: t('failed', { message: error.message }), position: 'bottom'})
  }
}

const onChangePrintOption = async (key: string, selected: boolean) => {
  try {
    await client.request('print.print_option', { [key]: selected })
    showToast({ message: t('success'), position: 'bottom'})
  } catch (error: any) {
    showToast({ message: t('failed', { message: error.message }), position: 'bottom'})
  }
}

</script>

<style scoped>
.van-checkbox {
  display: block;
  padding-top: 4px;
  padding-right: 8px;
}
</style>
