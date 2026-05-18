<template>
  <BaseSubPage :title="t('add_device')">
  <div class="device-manage-page">
    <van-tabs v-model:active="activeTab" class="mode-tabs device-mode-tabs">
      <van-tab name="server">
        <template #title>
          <span class="device-mode-tab-title">
            <i-material-symbols-cloud />
            {{ t('server_mode') }}
          </span>
        </template>
        <div class="device-tab-content">
          <template v-if="cloudUser">
            <van-cell-group inset>
              <van-cell class="cloud-user-cell">
                <template #icon>
                  <i-material-symbols-account-circle
                    v-if="isLoadingPreference"
                    class="cloud-avatar cloud-avatar-loading"
                  />
                  <img v-else-if="cloudUser.avatar" class="cloud-avatar" :src="cloudUser.avatar" />
                  <div v-else class="cloud-avatar cloud-avatar-placeholder">
                    {{ getCloudUserAvatarText(cloudUser) }}
                  </div>
                </template>
                <template #title>
                  <div class="cloud-user-name">{{ cloudUserName }}</div>
                  <div v-if="cloudUserHandle" class="cloud-user-id">@{{ cloudUserHandle }}</div>
                </template>
              </van-cell>
            </van-cell-group>

            <van-cell-group inset>
              <van-cell v-if="isLoadingCloudDevices" :title="t('loading')" />
              <template v-else>
                <van-cell
                  v-for="device in cloudDeviceItems"
                  :key="device.serial"
                  class="cloud-device-cell"
                >
                  <template #title>
                    <span class="cloud-device-title">{{ device.name }}</span>
                  </template>
                  <template #value>
                    <span v-if="device.isAdded" class="cloud-device-status">{{ t('device_added') }}</span>
                    <button
                      v-else
                      class="cloud-device-add-btn"
                      type="button"
                      @click="handleAddCloudDevice"
                    >
                      {{ t('add') }}
                    </button>
                  </template>
                </van-cell>
              </template>
            </van-cell-group>

            <van-cell-group inset>
              <van-cell :title="t('logout')" class="delete-btn" clickable @click="handleLogout" />
            </van-cell-group>
          </template>
          <template v-else>
            <van-cell-group inset>
              <van-cell :title="t('region')" class="region-cell">
                <template #value>
                  <van-tabs v-model:active="serverRegion" class="mode-tabs region-tabs">
                    <van-tab name="china" :title="t('region_china')" />
                    <van-tab name="global" :title="t('region_global')" />
                  </van-tabs>
                </template>
              </van-cell>

              <template v-if="serverRegion === 'china'">
                <van-field
                  :model-value="phone"
                  :label="t('phone_number')"
                  :placeholder="t('phone_number')"
                  input-align="right"
                  type="tel"
                  inputmode="numeric"
                  maxlength="11"
                  enterkeyhint="next"
                  @update:model-value="phone = normalizeDigits($event, PHONE_LENGTH)"
                  @keydown.enter.prevent="verificationCodeInputRef?.focus()"
                />
                <van-field
                  ref="verificationCodeInputRef"
                  :model-value="verificationCode"
                  :label="t('verification_code')"
                  :placeholder="t('verification_code')"
                  input-align="right"
                  type="tel"
                  inputmode="numeric"
                  maxlength="6"
                  enterkeyhint="done"
                  @update:model-value="verificationCode = normalizeDigits($event, VERIFICATION_CODE_LENGTH)"
                  @keydown.enter.prevent="handleServerLogin"
                >
                  <template #button>
                    <button
                      class="verification-code-btn"
                      type="button"
                      :disabled="sendCodeDisabled"
                      @click="handleSendVerificationCode"
                    >
                      {{ sendVerificationCodeText }}
                    </button>
                  </template>
                </van-field>
              </template>
              <template v-else>
                <van-field
                  v-model.trim="email"
                  :label="t('email')"
                  :placeholder="t('email')"
                  input-align="right"
                  type="email"
                  enterkeyhint="next"
                  @keydown.enter.prevent="passwordInputRef?.focus()"
                />
                <van-field
                  ref="passwordInputRef"
                  v-model="password"
                  :label="t('password')"
                  :placeholder="t('password')"
                  input-align="right"
                  type="password"
                  enterkeyhint="done"
                  @keydown.enter.prevent="handleServerLogin"
                />
              </template>
            </van-cell-group>

            <van-cell-group inset>
              <van-cell
                :title="t('login')"
                class="save-btn"
                :clickable="canServerLogin"
                @click="handleServerLogin"
              />
            </van-cell-group>
          </template>
        </div>
      </van-tab>
      <van-tab name="lan">
        <template #title>
          <span class="device-mode-tab-title">
            <i-material-symbols-lan-rounded />
            {{ t('lan_mode') }}
          </span>
        </template>
        <div class="device-tab-content">
          <van-cell-group inset>
            <van-field
              v-model.trim="name"
              :label="t('device_name')"
              :placeholder="t('device_name')"
              autocomplete="off"
              input-align="right"
              enterkeyhint="next"
              @keydown.enter.prevent="ipInputRef?.focus()"
            />
            <van-field
              ref="ipInputRef"
              v-model.trim="ip"
              :label="t('ip_address')"
              :placeholder="t('ip_address')"
              autocomplete="off"
              input-align="right"
              enterkeyhint="next"
              @keydown.enter.prevent="serialInputRef?.focus()"
            />
            <van-field
              ref="serialInputRef"
              v-model.trim="serial"
              :label="t('serial_number')"
              :placeholder="t('serial_number')"
              autocomplete="off"
              input-align="right"
              enterkeyhint="next"
              @keydown.enter.prevent="codeInputRef?.focus()"
            />
            <van-field
              ref="codeInputRef"
              v-model.trim="code"
              :label="t('pairing_code')"
              :placeholder="t('pairing_code')"
              autocomplete="off"
              input-align="right"
              enterkeyhint="done"
              @keydown.enter.prevent="codeInputRef?.blur()"
            />
          </van-cell-group>

          <van-cell-group inset>
            <van-cell
              :title="t('add')"
              class="save-btn"
              :clickable="canSave"
              @click="handleSave"
            />
          </van-cell-group>
        </div>
      </van-tab>
    </van-tabs>
  </div>
  </BaseSubPage>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { showToast } from 'vant'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import {
  CloudClient,
  CloudError,
  CloudErrorCode,
  type CloudDevice,
  type CloudPreference,
  type LoginSuccessResult,
} from '@bambulab-p1screen/printer-api'
import { connectPrinter } from '../../printer'
import { ROUTE_NAME } from '../../router/routes'
import { addDevice, getDevices, setCurrentDevice } from '../../utils/device'
import { markDeviceListPopupRestore } from '../../utils/navigation'
import {
  getCloudUser,
  getCloudUserAvatarText,
  removeCloudUser,
  setCloudUser,
  type CloudUserInfo,
  type ServerRegion,
} from '../../utils/user'

const { t } = useI18n()
const router = useRouter()

type DeviceMode = 'server' | 'lan'

const PHONE_LENGTH = 11
const VERIFICATION_CODE_LENGTH = 6
const SEND_CODE_COOLDOWN_SECONDS = 60
const CLOUD_BASE_URLS: Record<ServerRegion, string> = {
  china: '/api/https/api.bambulab.cn',
  global: '/api/https/api.bambulab.com',
}

const activeTab = ref<DeviceMode>('server')
const cloudUser = ref(getCloudUser())
const serverRegion = ref<ServerRegion>(cloudUser.value?.region ?? 'china')
const isLoadingPreference = ref(Boolean(cloudUser.value))
const isLoadingCloudDevices = ref(Boolean(cloudUser.value))
const cloudDevices = ref<CloudDevice[]>([])
const localDevices = ref(getDevices())
const phone = ref('')
const verificationCode = ref('')
const email = ref('')
const password = ref('')
const isSendingCode = ref(false)
const sendCodeCountdown = ref(0)
const isLoggingIn = ref(false)
const name = ref('')
const ip = ref('')
const serial = ref('')
const code = ref('')
const verificationCodeInputRef = ref<HTMLElement | null>(null)
const passwordInputRef = ref<HTMLElement | null>(null)
const ipInputRef = ref<HTMLElement | null>(null)
const serialInputRef = ref<HTMLElement | null>(null)
const codeInputRef = ref<HTMLElement | null>(null)
const canSave = computed(() => Boolean(name.value && ip.value && serial.value && code.value))
const canServerLogin = computed(() => {
  if (isLoggingIn.value) return false
  if (serverRegion.value === 'china') {
    return phone.value.length === PHONE_LENGTH && verificationCode.value.length === VERIFICATION_CODE_LENGTH
  }
  return email.value.includes('@') && Boolean(password.value)
})
let sendCodeTimer: number | null = null

const sendCodeDisabled = computed(() => {
  return phone.value.length !== PHONE_LENGTH || isSendingCode.value || sendCodeCountdown.value > 0
})
const sendVerificationCodeText = computed(() => {
  if (sendCodeCountdown.value > 0) {
    return `${sendCodeCountdown.value}s`
  }
  return t('send_verification_code')
})
const cloudUserName = computed(() => {
  if (isLoadingPreference.value) return t('loading')
  return cloudUser.value?.nickname || getDisplayAccount(cloudUser.value?.account ?? '') || cloudUser.value?.username || ''
})
const cloudUserHandle = computed(() => {
  if (isLoadingPreference.value) return ''
  return cloudUser.value?.id ?? ''
})
const cloudDeviceItems = computed(() => {
  const localCloudSerials = new Set(
    localDevices.value
      .filter(device => device.from === 'cloud')
      .map(device => device.serial)
  )
  return cloudDevices.value.map(device => {
    const serial = device.dev_id
    return {
      isAdded: localCloudSerials.has(serial),
      name: device.name || device.dev_product_name || device.dev_model_name || serial,
      serial,
    }
  })
})

onBeforeRouteLeave((to) => {
  if (to.name === ROUTE_NAME.SETTING_HOME) {
    markDeviceListPopupRestore()
  }
})

onMounted(() => {
  refreshCloudPreference()
  refreshCloudDevices()
})

onBeforeUnmount(() => {
  clearSendCodeCountdown()
})

const handleSave = () => {
  if (!canSave.value) return
  const device = {
    from: 'lan' as const,
    name: name.value,
    ip: ip.value,
    serial: serial.value,
    code: code.value,
  }
  addDevice(device)
  setCurrentDevice(serial.value)
  connectPrinter(device)
  router.back()
  showToast({
    message: t('save_success'),
    position: 'bottom',
  })
}

const normalizeDigits = (value: string, maxLength: number) => {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

const createCloudClient = () => new CloudClient({ baseUrl: CLOUD_BASE_URLS[serverRegion.value] })

const createCloudClientForUser = (user: CloudUserInfo) => {
  const cloud = new CloudClient({ baseUrl: CLOUD_BASE_URLS[user.region] })
  cloud.email = user.account
  cloud.username = user.username
  cloud.authToken = user.accessToken
  return cloud
}

const getChinaAccount = () => phone.value

const getServerAccount = () => {
  if (serverRegion.value === 'china') {
    return getChinaAccount()
  }
  return email.value
}

const getCloudErrorMessage = (error: unknown) => {
  if (error instanceof CloudError) {
    const cloudErrorMessages: Partial<Record<CloudErrorCode, string>> = {
      [CloudErrorCode.Cloudflare]: t('cloud_error_cloudflare'),
      [CloudErrorCode.CodeExpired]: t('cloud_error_code_expired'),
      [CloudErrorCode.CodeIncorrect]: t('cloud_error_code_incorrect'),
      [CloudErrorCode.CodeRequired]: t('cloud_error_code_required'),
      [CloudErrorCode.ConnectionFailed]: t('cloud_error_connection'),
      [CloudErrorCode.UnsupportedLoginType]: t('cloud_error_unsupported_login_type'),
    }
    return cloudErrorMessages[error.code] ?? error.message
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return `${error}`
}

const getDisplayAccount = (account: string) => {
  if (account.startsWith('+86') && account.length === PHONE_LENGTH + 3) {
    return account.slice(3)
  }
  return account
}

const buildCloudUser = (result: LoginSuccessResult): CloudUserInfo => {
  const account = getServerAccount()
  return {
    accessToken: result.accessToken,
    account,
    region: serverRegion.value,
    username: result.username,
  }
}

const getPreferenceUserPatch = (preference: CloudPreference): Pick<CloudUserInfo, 'avatar' | 'id' | 'nickname'> => {
  return {
    avatar: preference.avatar,
    id: preference.handle,
    nickname: preference.nickname || getDisplayAccount(cloudUser.value?.account ?? '') || cloudUser.value?.username,
  }
}

const getFallbackUserPatch = (user: CloudUserInfo): Pick<CloudUserInfo, 'nickname'> => {
  return {
    nickname: user.nickname || getDisplayAccount(user.account) || user.username,
  }
}

const refreshCloudPreference = async () => {
  if (!cloudUser.value) return
  const cloud = createCloudClientForUser(cloudUser.value)
  isLoadingPreference.value = true
  try {
    const preference = await cloud.getPreference()
    cloudUser.value = {
      ...cloudUser.value,
      ...getPreferenceUserPatch(preference),
    }
  } catch {
    cloudUser.value = {
      ...cloudUser.value,
      ...getFallbackUserPatch(cloudUser.value),
    }
  } finally {
    isLoadingPreference.value = false
  }
}

const refreshCloudDevices = async () => {
  if (!cloudUser.value) return
  const cloud = createCloudClientForUser(cloudUser.value)
  localDevices.value = getDevices()
  isLoadingCloudDevices.value = true
  try {
    cloudDevices.value = await cloud.getDeviceList()
  } catch {
    cloudDevices.value = []
  } finally {
    isLoadingCloudDevices.value = false
  }
}

const clearSendCodeCountdown = () => {
  if (!sendCodeTimer) return
  window.clearInterval(sendCodeTimer)
  sendCodeTimer = null
}

const startSendCodeCountdown = () => {
  clearSendCodeCountdown()
  sendCodeCountdown.value = SEND_CODE_COOLDOWN_SECONDS
  sendCodeTimer = window.setInterval(() => {
    sendCodeCountdown.value -= 1
    if (sendCodeCountdown.value <= 0) {
      sendCodeCountdown.value = 0
      clearSendCodeCountdown()
    }
  }, 1000)
}

const handleSendVerificationCode = async () => {
  if (sendCodeDisabled.value) return
  const cloud = createCloudClient()
  cloud.email = getChinaAccount()
  isSendingCode.value = true
  try {
    await cloud.requestNewCode()
    startSendCodeCountdown()
    showToast({
      message: t('verification_code_sent'),
      position: 'bottom',
    })
  } catch (error) {
    showToast({
      message: t('failed', { message: getCloudErrorMessage(error) }),
      position: 'bottom',
    })
  } finally {
    isSendingCode.value = false
  }
}

const handleServerLogin = async () => {
  if (!canServerLogin.value) return
  const cloud = createCloudClient()
  isLoggingIn.value = true
  try {
    const result = serverRegion.value === 'china'
      ? await loginWithChinaVerificationCode(cloud)
      : await cloud.login(email.value, password.value)
    const user = buildCloudUser(result)
    setCloudUser(user)
    cloudUser.value = user
    await Promise.all([
      refreshCloudPreference(),
      refreshCloudDevices(),
    ])
    verificationCode.value = ''
    password.value = ''
    showToast({
      message: t('login_success'),
      position: 'bottom',
    })
  } catch (error) {
    showToast({
      message: t('failed', { message: getCloudErrorMessage(error) }),
      position: 'bottom',
    })
  } finally {
    isLoggingIn.value = false
  }
}

const loginWithChinaVerificationCode = (cloud: CloudClient) => {
  cloud.email = getChinaAccount()
  return cloud.loginWithVerificationCode(verificationCode.value)
}

const handleLogout = () => {
  removeCloudUser()
  cloudUser.value = null
  cloudDevices.value = []
  showToast({
    message: t('logout_success'),
    position: 'bottom',
  })
}

const handleAddCloudDevice = () => {
  showToast({
    message: t('developing'),
    position: 'bottom',
  })
}

</script>

<style scoped>
.device-manage-page {
  padding-bottom: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  overflow: auto;
}

:deep(.region-cell) {
  align-items: center;
  padding-top: 7px;
  padding-bottom: 7px;
}

:deep(.region-cell .van-cell__value) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.mode-tabs {
  --mode-tabs-width: 300px;
  --mode-tabs-height: 34px;
  --mode-tabs-padding: 3px;
  --mode-tab-height: 28px;
  --mode-tabs-margin: 0 auto;
}

.region-tabs {
  --mode-tabs-width: 140px;
  --mode-tabs-height: 30px;
  --mode-tabs-padding: 2px;
  --mode-tab-height: 24px;
  --mode-tabs-margin: 0 0 0 auto;
}

:deep(.mode-tabs > .van-tabs__wrap) {
  width: var(--mode-tabs-width);
  height: var(--mode-tabs-height);
  margin: var(--mode-tabs-margin);
  padding: var(--mode-tabs-padding);
  box-sizing: border-box;
  border-radius: 999px;
  background: var(--van-background-2);
}

:deep(.region-tabs > .van-tabs__wrap) {
  border: 1px solid var(--van-border-color);
}

:deep(.mode-tabs .van-tabs__nav) {
  height: 100%;
  padding: 0;
  background: transparent;
}

:deep(.mode-tabs .van-tabs__nav--line) {
  padding-bottom: 0;
}

:deep(.mode-tabs .van-tabs__line),
:deep(.region-tabs > .van-tabs__content) {
  display: none;
}

:deep(.mode-tabs .van-tab) {
  height: var(--mode-tab-height);
  border-radius: 999px;
  color: var(--van-text-color-2);
}

:deep(.mode-tabs .van-tab__text) {
  height: 100%;
  display: flex;
  align-items: center;
}

:deep(.mode-tabs .van-tab--active) {
  background: var(--van-background-4);
  color: var(--van-text-color);
}

.device-mode-tab-title {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.device-mode-tab-title > svg {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

.verification-code-btn {
  height: 30px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: var(--van-primary-color);
  color: #000;
  display: inline-flex;
  align-items: center;
  font-size: 13px;
}

.verification-code-btn:disabled {
  background: var(--van-background-4);
  color: var(--van-text-color-3);
}

.cloud-device-cell {
  align-items: center;
}

.cloud-device-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cloud-device-status {
  color: var(--van-text-color-2);
}

.cloud-device-add-btn {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--van-blue);
  font: inherit;
  line-height: inherit;
}

.cloud-user-cell {
  align-items: center;
}

.cloud-avatar {
  width: 44px;
  height: 44px;
  margin-right: 12px;
  border-radius: 50%;
  object-fit: cover;
}

.cloud-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--van-background-4);
  color: var(--van-text-color);
  font-size: 18px;
  font-weight: 600;
}

.cloud-avatar-loading {
  color: var(--van-text-color-3);
}

.cloud-user-name {
  color: var(--van-text-color);
  font-size: 16px;
  line-height: 22px;
}

.cloud-user-id {
  margin-top: 2px;
  color: var(--van-text-color-3);
  font-size: 12px;
  line-height: 18px;
}

:deep(.van-field__button) {
  height: var(--van-cell-line-height);
  display: flex;
  align-items: center;
  overflow: visible;
}

:deep(.device-mode-tabs > .van-tabs__content) {
  padding-top: 10px;
}

.device-tab-content {
  display: grid;
  gap: 10px;
}

:deep(.van-field__control) {
  color: var(--van-text-color-2);
}

:deep(.van-field__control:read-only) {
  color: var(--van-text-color-3);
}

.save-btn {
  color: var(--van-blue);
  opacity: 0.5;
}

.save-btn.van-cell--clickable {
  opacity: 1;
}

.delete-btn {
  color: var(--van-red);
}
</style>
