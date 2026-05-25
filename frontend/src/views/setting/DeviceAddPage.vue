<template>
  <BaseSubPage :title="t('add_device')">
  <div class="device-manage-page">
    <van-tabs v-model:active="activeTab" class="mode-tabs device-mode-tabs">
      <van-tab name="server">
        <template #title>
          <span class="device-mode-tab-title">
            <i-material-symbols-cloud-outline />
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
                      :disabled="addingCloudDeviceSerial === device.serial"
                      @click="handleAddCloudDevice(device)"
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
            <form class="cloud-login-form" @submit.prevent="handleServerLogin">
              <van-cell-group inset>
                <van-cell :title="t('region')" class="region-cell">
                  <template #value>
                    <van-tabs v-model:active="serverRegion" class="mode-tabs region-tabs">
                      <van-tab name="china" :title="t('region_china')" />
                      <van-tab name="global" :title="t('region_global')" />
                    </van-tabs>
                  </template>
                </van-cell>

                <van-field
                  v-if="serverRegion === 'china'"
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
                  v-else
                  v-model.trim="email"
                  :label="t('email')"
                  :placeholder="t('email')"
                  input-align="right"
                  type="email"
                  autocomplete="username"
                  enterkeyhint="next"
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
                  autocomplete="one-time-code"
                  enterkeyhint="done"
                  @update:model-value="verificationCode = normalizeDigits($event, VERIFICATION_CODE_LENGTH)"
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
              </van-cell-group>

              <van-cell-group inset>
                <van-cell
                  :title="t('login')"
                  class="save-btn"
                  :clickable="canServerLogin"
                  @click="handleServerLogin"
                />
              </van-cell-group>
            </form>
          </template>
        </div>
      </van-tab>
      <van-tab name="lan">
        <template #title>
          <span class="device-mode-tab-title">
            <i-material-symbols-lan-outline-rounded />
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
  PrinterClient,
  PrinterEvent,
  type CloudDevice,
  type CloudPreference,
  type LoginSuccessResult,
} from '@bambulab-p1screen/printer-api'
import { CLOUD_BASE_URLS, CLOUD_MQTT_BROKERS, connectPrinter, createApiUrl, createMqttUrl } from '../../printer'
import { ROUTE_NAME } from '../../router/routes'
import { addDevice, getDevices, removeDevice, setCurrentDevice } from '../../utils/device'
import { markDeviceListPopupRestore } from '../../utils/navigation'
import {
  getCloudUser,
  getCloudUserAvatarText,
  removeCloudUser,
  setCloudUser,
  type UserRecord,
  type ServerRegion,
} from '../../utils/user'

const { t } = useI18n()
const router = useRouter()

type DeviceMode = 'server' | 'lan'

const PHONE_LENGTH = 11
const VERIFICATION_CODE_LENGTH = 6
const SEND_CODE_COOLDOWN_SECONDS = 60
const CLOUD_DEVICE_ADD_TIMEOUT_MS = 10000
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
const isSendingCode = ref(false)
const sendCodeCountdown = ref(0)
const isLoggingIn = ref(false)
const addingCloudDeviceSerial = ref('')
const name = ref('')
const ip = ref('')
const serial = ref('')
const code = ref('')
const verificationCodeInputRef = ref<HTMLElement | null>(null)
const ipInputRef = ref<HTMLElement | null>(null)
const serialInputRef = ref<HTMLElement | null>(null)
const codeInputRef = ref<HTMLElement | null>(null)
const canSave = computed(() => Boolean(name.value && ip.value && serial.value && code.value))
const canServerLogin = computed(() => {
  if (isLoggingIn.value) return false
  if (serverRegion.value === 'china') {
    return phone.value.length === PHONE_LENGTH && verificationCode.value.length === VERIFICATION_CODE_LENGTH
  }
  return email.value.includes('@') && verificationCode.value.length === VERIFICATION_CODE_LENGTH
})
let sendCodeTimer: number | null = null

const sendCodeDisabled = computed(() => {
  const isAccountInvalid = serverRegion.value === 'china'
    ? phone.value.length !== PHONE_LENGTH
    : !email.value.includes('@')
  return isAccountInvalid || isSendingCode.value || sendCodeCountdown.value > 0
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
      .filter(device => device.from !== 'local')
      .map(device => device.serial)
  )
  return cloudDevices.value.map(device => {
    const serial = device.dev_id
    return {
      code: device.dev_access_code ?? '',
      isAdded: localCloudSerials.has(serial),
      name: device.name,
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
    connect: 'local' as const,
    from: 'local' as const,
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

const createCloudClient = () => new CloudClient({ baseUrl: createApiUrl(CLOUD_BASE_URLS[serverRegion.value]) })

const createCloudClientForUser = (user: UserRecord) => {
  const cloud = new CloudClient({ baseUrl: createApiUrl(CLOUD_BASE_URLS[user.region]) })
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
      [CloudErrorCode.LoginFailed]: t('cloud_error_login_failed'),
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

const buildCloudUser = (result: LoginSuccessResult): UserRecord => {
  const account = getServerAccount()
  return {
    accessToken: result.accessToken,
    account,
    region: serverRegion.value,
    username: result.username,
  }
}

const saveCloudLoginResult = async (result: LoginSuccessResult) => {
  const user = buildCloudUser(result)
  setCloudUser(user)
  cloudUser.value = user
  await Promise.all([
    refreshCloudPreference(),
    refreshCloudDevices(),
  ])
  verificationCode.value = ''
  showToast({
    message: t('login_success'),
    position: 'bottom',
  })
}

const getPreferenceUserPatch = (preference: CloudPreference): Pick<UserRecord, 'avatar' | 'id' | 'nickname'> => {
  return {
    avatar: preference.avatar,
    id: preference.handle,
    nickname: preference.nickname || getDisplayAccount(cloudUser.value?.account ?? '') || cloudUser.value?.username,
  }
}

const getFallbackUserPatch = (user: UserRecord): Pick<UserRecord, 'nickname'> => {
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
  cloud.email = getServerAccount()
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
    const result = await loginWithVerificationCode(cloud)
    await saveCloudLoginResult(result)
  } catch (error) {
    showToast({
      message: t('failed', { message: getCloudErrorMessage(error) }),
      position: 'bottom',
    })
  } finally {
    isLoggingIn.value = false
  }
}

const loginWithVerificationCode = (cloud: CloudClient) => {
  cloud.email = getServerAccount()
  return cloud.loginWithVerificationCode(verificationCode.value)
}

const handleLogout = () => {
  removeCloudUser()
  getDevices()
    .filter(device => device.from !== 'local')
    .forEach(device => removeDevice(device.serial))
  cloudUser.value = null
  cloudDevices.value = []
  localDevices.value = []
  showToast({
    message: t('logout_success'),
    position: 'bottom',
  })
}

const handleAddCloudDevice = async (device: {
  code: string
  name: string
  serial: string
}) => {
  const user = cloudUser.value
  if (!user || addingCloudDeviceSerial.value) return
  showToast({
    message: t('device_adding'),
    position: 'bottom',
  })
  const tempClient = new PrinterClient()
  addingCloudDeviceSerial.value = device.serial
  try {
    const lanIP = await getCloudDeviceLANIP(tempClient, user, device.serial)
    const deviceItem = {
      connect: 'cloud' as const,
      from: user.region,
      name: device.name,
      ip: lanIP,
      serial: device.serial,
      code: device.code,
    }
    addDevice(deviceItem)
    setCurrentDevice(device.serial)
    connectPrinter(deviceItem)
    localDevices.value = getDevices()
    showToast({
      message: t('device_add_success'),
      position: 'bottom',
    })
  } catch (error) {
    showToast({
      message: t('failed', { message: getCloudErrorMessage(error) }),
      position: 'bottom',
    })
  } finally {
    tempClient.disconnect()
    addingCloudDeviceSerial.value = ''
  }
}

const getCloudDeviceLANIP = (tempClient: PrinterClient, user: UserRecord, serial: string) => {
  return new Promise<string>((resolve, reject) => {
    let settled = false
    const cleanup = () => {
      window.clearTimeout(timer)
      tempClient.off(PrinterEvent.MQTT_STATE_CHANGE, handleMqttStateChange)
      tempClient.off(PrinterEvent.PRINT_PUSH_STATUS, handlePrintPushStatus)
    }
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      callback()
    }
    const resolveIfReady = () => {
      const lanIP = tempClient.getLocalIPAddress()
      if (lanIP) {
        finish(() => resolve(lanIP))
      }
    }
    const handleMqttStateChange = () => {
      const error = tempClient.lastError
      if (error) {
        finish(() => reject(error))
        return
      }
      resolveIfReady()
    }
    const handlePrintPushStatus = () => {
      resolveIfReady()
    }
    const timer = window.setTimeout(() => {
      finish(() => reject(new Error(t('cloud_error_connection'))))
    }, CLOUD_DEVICE_ADD_TIMEOUT_MS)

    tempClient.on(PrinterEvent.MQTT_STATE_CHANGE, handleMqttStateChange)
    tempClient.on(PrinterEvent.PRINT_PUSH_STATUS, handlePrintPushStatus)
    const mqttClient = tempClient.connect({
      mqttUrl: createMqttUrl(CLOUD_MQTT_BROKERS[user.region]),
      username: user.username,
      password: user.accessToken,
      serial,
    })
    if (!mqttClient) {
      finish(() => reject(new Error(t('cloud_error_connection'))))
    }
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
}

.device-mode-tab-title > * + * {
  margin-left: 4px;
}

.device-mode-tab-title > svg {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

.verification-code-btn {
  height: 30px;
  width: 85px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: var(--van-primary-color);
  color: #000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  padding: var(--van-cell-horizontal-padding);
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

.cloud-login-form {
  display: grid;
  gap: 10px;
  margin: 0;
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
