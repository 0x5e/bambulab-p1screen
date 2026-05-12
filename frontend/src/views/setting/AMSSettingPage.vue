<template>
  <BaseSubPage title="AMS 设置">
    <div v-if="device">
      <SettingCell
        title="插入耗材时读取"
        label="插入耗材后，AMS 会自动读取耗材信息。需要花费大约20秒。"
        :selected="tray_read_option"
        @click="onChangeUserSetting('tray_read_option', $event)"
      />
      <SettingCell
        title="开机时读取"
        label="每次开机时，AMS 将会自动读取其所插入的耗材信息。需要花费大约1分钟。"
        :selected="startup_read_option"
        @click="onChangeUserSetting('startup_read_option', $event)"
      />
      <SettingCell
        title="剩余容量估计"
        label="AMS 将会尝试估算Bambulab官方耗材的剩余容量。"
        :selected="calibrate_remain_flag"
        @click="onChangeUserSetting('calibrate_remain_flag', $event)"
      />
      <SettingCell
        title="AMS自动续料"
        label="AMS 将在当前耗材用尽后，自动使用与该耗材品牌、类型和颜色完全相同的其他耗材继续打印。"
        :selected="auto_switch_filament"
        @click="onChangePrintOption('auto_switch_filament', $event)"
      />
    </div>
  </BaseSubPage>
</template>

<script setup lang="tsx">
import { ref, watch } from 'vue'
import { PrinterClient } from '../../api/PrinterClient'
import { HomeFlagBit } from '../../api/enums'
import { showToast } from 'vant'
import { usePrinterStore } from '../../stores/printer'

const client = PrinterClient.getInstance()
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
    showToast({ message: '成功', position: 'bottom'})
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
    showToast({ message: `失败：${error.message}`, position: 'bottom'})
  }
}

const onChangePrintOption = async (key: string, selected: boolean) => {
  try {
    await client.request('print.print_option', { [key]: selected })
    showToast({ message: '成功', position: 'bottom'})
  } catch (error: any) {
    showToast({ message: `失败：${error.message}`, position: 'bottom'})
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
