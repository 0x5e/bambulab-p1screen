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
        <van-cell v-if="showExportDeviceInfo" :title="t('export_device_info')" is-link @click="handleExportDeviceInfo" />
        <van-cell
          v-if="showCheckForUpdates"
          :title="t('check_for_updates')"
          is-link
          @click="handleCheckForUpdates"
        />
        <van-cell :title="t('current_version')" :value="currentVersion" />
      </van-cell-group>
    </div>

    <van-action-sheet
      v-model:show="showLanguageSheet"
      :description="t('language')"
      :cancel-text="t('cancel')"
      :actions="languageActions"
      @select="handleLanguageSelect"
    />
  </BaseSubPage>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { useI18n } from 'vue-i18n'
import semverGt from 'semver/functions/gt'
import { getCurrentDevice } from '../../utils/device'
import { getLocalePreference, setLocalePreference, type LocalePreference } from '../../i18n'
import { usePrinterStore } from '../../stores/printer'

const { t, locale } = useI18n()
const currentVersion = import.meta.env.APP_VERSION
const LATEST_RELEASE_URL = 'https://api.github.com/repos/0x5e/bambulab-p1screen/releases/latest'

const { device, modules } = usePrinterStore()
const languagePref = ref<LocalePreference>(getLocalePreference())
const showLanguageSheet = ref(false)

type GitHubRelease = {
  tag_name?: string
  assets?: GitHubReleaseAsset[]
}

type GitHubReleaseAsset = {
  name?: string
  browser_download_url?: string
}

type P1ScreenBridge = {
  isAvailable?: () => boolean
}

type P1ScreenWindow = Window & {
  P1ScreenBridge?: P1ScreenBridge
  __P1ScreenGetDeviceInfo?: typeof getDeviceInfo
}

const getNativeBridge = () => (window as P1ScreenWindow).P1ScreenBridge
const isAndroidApp = () => !!getNativeBridge()
const showCheckForUpdates = isAndroidApp()
const showExportDeviceInfo = computed(() => !!device.value && !!modules.value?.length)

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

const getVersionTag = (value: string) => value.match(/^(v\d+\.\d+\.\d+)/i)?.[1] ?? 'v0.0.0'

const getApkDownloadUrl = (release: GitHubRelease) => {
  const apkAsset = release.assets?.find(asset => asset.name?.toLowerCase().endsWith('.apk'))
  return apkAsset?.browser_download_url ?? ''
}

const openExternalUrl = (url: string) => {
  window.location.assign(url)
}

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error)

const getDeviceInfo = () => ({
  print: device.value ?? null,
  module: modules.value ?? null,
})

const handleExportDeviceInfo = () => {
  if (isAndroidApp()) {
    openExternalUrl(`${window.location.origin}/api/getDeviceInfo`)
    return
  }

  const now = new Date()
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  const url = URL.createObjectURL(new Blob([JSON.stringify(getDeviceInfo(), null, 2)], { type: 'application/json;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `deviceInfo-${timestamp}.json`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  ;(window as P1ScreenWindow).__P1ScreenGetDeviceInfo = getDeviceInfo
})

onUnmounted(() => {
  delete (window as P1ScreenWindow).__P1ScreenGetDeviceInfo
})

const handleCheckForUpdates = async () => {
  try {
    showToast({ message: t('checking_updates'), position: 'bottom' })

    const response = await fetch(LATEST_RELEASE_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }

    const release = await response.json() as GitHubRelease
    const currentTag = getVersionTag(currentVersion)
    const latestTag = release.tag_name ?? ''
    const hasUpdate = /^v\d+\.\d+\.\d+$/i.test(currentTag)
      && /^v\d+\.\d+\.\d+$/i.test(latestTag)
      && semverGt(latestTag, currentTag)

    if (!hasUpdate) {
      showToast({ message: t('already_latest_version'), position: 'bottom' })
      return
    }

    const apkDownloadUrl = getApkDownloadUrl(release)
    if (!apkDownloadUrl) {
      showToast({ message: t('apk_asset_not_found'), position: 'bottom' })
      return
    }

    await showConfirmDialog({
      title: t('update_available'),
      message: t('update_available_message', { version: latestTag }),
      confirmButtonText: t('confirm'),
      cancelButtonText: t('cancel'),
    })

    openExternalUrl(apkDownloadUrl)
  } catch (error) {
    if (error === 'cancel') return

    showToast({
      message: t('check_updates_failed', { message: getErrorMessage(error) }),
      position: 'bottom',
    })
  }
}
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 10px;
}
</style>
