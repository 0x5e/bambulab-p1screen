<template>
  <BaseSubPage :title="t('settings')">
    <div class="settings-page">
      <van-cell-group inset>
        <van-cell :title="t('print_options')" is-link to="/setting/print-option" />
        <van-cell :title="t('ams_options')" is-link to="/setting/ams-setting" />
      </van-cell-group>

      <van-cell-group inset>
        <van-cell
          :title="t('language')"
          :value="languageLabel"
          is-link
          @click="showLanguageSheet = true"
        />
      </van-cell-group>

      <van-cell-group inset>
        <van-cell :title="t('device_serial')" :value="getCurrentDevice()?.name" is-link to="/setting/serial" />
      </van-cell-group>

      <van-cell-group inset :title="t('about_project')">
        <van-cell :title="t('current_version')" :value="currentVersion" />
      </van-cell-group>
    </div>

    <van-action-sheet
      v-model:show="showLanguageSheet"
      :actions="languageActions"
      :cancel-text="t('cancel')"
      @select="handleLanguageSelect"
    />
  </BaseSubPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getCurrentDevice } from '../../utils/device'
import { getLocalePreference, setLocalePreference, type LocalePreference } from '../../i18n'

const { t, locale } = useI18n()
const currentVersion = import.meta.env.APP_VERSION

const languagePref = ref<LocalePreference>(getLocalePreference())
const showLanguageSheet = ref(false)

const resolveLocale = (pref: LocalePreference) => {
  if (pref === 'auto') {
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }
  return pref
}

const languageLabel = computed(() => {
  switch (languagePref.value) {
    case 'zh': return t('language_zh')
    case 'en': return t('language_en')
    default: return t('language_auto')
  }
})

const languageActions = computed(() => [
  { name: t('language_auto'), value: 'auto' as const },
  { name: t('language_zh'), value: 'zh' as const },
  { name: t('language_en'), value: 'en' as const },
])

const handleLanguageSelect = (action: { name: string, value: LocalePreference }) => {
  languagePref.value = action.value
  setLocalePreference(action.value)
  locale.value = resolveLocale(action.value)
  showLanguageSheet.value = false
}
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 12px;
  padding-bottom: 16px;
}
</style>
