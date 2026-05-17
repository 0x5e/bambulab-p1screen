import { computed, type Ref } from 'vue'
import humanizeDuration from 'humanize-duration'
import { useI18n } from 'vue-i18n'
import { CurrentStage, GcodeState } from '../api/enums'
import type { DevicePrint } from '../api/device'

const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: 'shortEn',
  languages: {
    shortEn: {
      y: () => 'y',
      mo: () => 'mo',
      w: () => 'w',
      d: () => 'd',
      h: () => 'h',
      m: () => 'm',
      s: () => 's',
      ms: () => 'ms',
    },
  },
  spacer: '',
  delimiter: '',
})

export const usePrintStatus = (device: Ref<DevicePrint | undefined>) => {
  const { t } = useI18n()

  const printPercent = computed(() => {
    if (device.value?.gcode_state === GcodeState.Prepare) {
      return 0
    }
    return device.value?.mc_percent || 0
  })

  const printSubStateLabel = computed(() => {
    switch (device.value?.stg_cur) {
      case CurrentStage.PRINTING:
        return t('print_state_printing')
      case CurrentStage.HEATBED_PREHEATING:
        return t('print_state_heatbed_preheating')
      case CurrentStage.CHANGING_FILAMENT:
        return t('print_state_changing_filament')
      case CurrentStage.HOMING_TOOLHEAD:
        return t('print_state_homing_toolhead')
      case CurrentStage.CLEANING_NOZZLE_TIP:
        return t('print_state_cleaning_nozzle_tip')
      default:
        return ''
    }
  })

  const printStateLabel = computed(() => {
    switch (device.value?.gcode_state) {
      case GcodeState.Idle:
        return t('print_state_idle')
      case GcodeState.Prepare:
        return t('print_state_preparing', { percent: device.value?.gcode_file_prepare_percent })
      case GcodeState.Running:
        return printSubStateLabel.value
      case GcodeState.Pause:
        return t('print_state_paused')
      case GcodeState.Finish:
        return t('print_state_finished')
      case GcodeState.Failed:
        return t('print_state_failed')
      default:
        return ''
    }
  })

  const printInfo = computed(() => {
    if ([GcodeState.Finish, GcodeState.Failed].includes(device.value?.gcode_state ?? GcodeState.Unknown)) {
      return ''
    }

    const remainingTimeText = shortEnglishHumanizer((device.value?.mc_remaining_time || 0) * 60 * 1000, {
      units: ['d', 'h', 'm'],
      round: true,
    })

    return `${device.value?.layer_num || 0}/${device.value?.total_layer_num || 0} | -${remainingTimeText}`
  })

  const isPaused = computed(() => device.value?.gcode_state === GcodeState.Pause)
  const showPrintActions = computed(() =>
    [GcodeState.Pause, GcodeState.Running].includes(device.value?.gcode_state ?? GcodeState.Unknown)
  )

  return {
    isPaused,
    printInfo,
    printPercent,
    printStateLabel,
    showPrintActions,
  }
}
