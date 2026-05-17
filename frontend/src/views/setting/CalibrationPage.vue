<template>
  <BaseSubPage :title="t('print_calibration')">
    <template #right>
      <van-button
        class="header-action-btn"
        type="primary"
        size="normal"
        :disabled="option === 0"
        @click="handleConfirm"
      >
        {{ t('confirm') }}
      </van-button>
    </template>
    <SettingCell
      :title="t('auto_bed_leveling')"
      :label="t('auto_bed_leveling_desc')"
      :selected="bedLevelling"
      @click="bedLevelling = $event"
    />
    <SettingCell
      :title="t('vibration_compensation')"
      :label="t('vibration_compensation_desc')"
      :selected="vibrationCompensation"
      @click="vibrationCompensation = $event"
    />
    <SettingCell
      :title="t('motor_noise_cancellation')"
      :label="t('motor_noise_cancellation_desc')"
      :selected="motorCancellation"
      @click="motorCancellation = $event"
    />
  </BaseSubPage>
</template>

<script setup lang="tsx">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ROUTE_NAME } from '../../router/routes'
import { showConfirmDialog } from 'vant'
import { client } from '../../printer'

const { t } = useI18n()
const router = useRouter()

const bedLevelling = ref(true)
const vibrationCompensation = ref(true)
const motorCancellation = ref(false)
const option = computed(() => {
  let bitmask = 0
  if (bedLevelling.value) bitmask |= 1 << 1
  if (vibrationCompensation.value) bitmask |= 1 << 2
  if (motorCancellation.value) bitmask |= 1 << 3
  return bitmask
})

const handleConfirm = async () => {
  try {
    await showConfirmDialog({
      message: t('calibration_confirm_msg'),
      cancelButtonText: t('cancel'),
      confirmButtonText: t('start_calibration'),
      messageAlign: 'left',
    })
  } catch {
    return
  }

  await client.request('print.calibration', { option: option.value })
  router.push({ name: ROUTE_NAME.HOME })

}
</script>

<style scoped>
.van-checkbox {
  display: block;
  padding-top: 4px;
  padding-right: 8px;
}
.header-action-btn {
  width: 80px;
  height: 32px;
  font-size: 16px;
}
</style>
