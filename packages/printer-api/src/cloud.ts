export type CloudClientOptions = {
  baseUrl: string
}

export type CloudDevice = {
  dev_id: string
  name: string
  online?: boolean
  print_status?: string
  dev_model_name?: string
  dev_product_name?: string
  dev_access_code?: string
  nozzle_diameter?: number
}

export type CloudPreference = {
  avatar: string
  handle: string
  nickname: string
  uid: string
}

export type LoginSuccessResult = {
  type: 'success'
  accessToken: string
  username: string
}

type CloudRequestOptions = {
  auth?: boolean
  authToken?: string
  body?: unknown
  headers?: Record<string, string>
  method?: string
  return400?: boolean
}

type CloudUrlName =
  | 'LOGIN'
  | 'EMAIL_CODE'
  | 'SMS_CODE'
  | 'BIND'
  | 'SLICER_SETTINGS'
  | 'TASKS'
  | 'PROJECTS'
  | 'PREFERENCE'

const CLOUD_URLS: Record<CloudUrlName, string> = {
  LOGIN: '/v1/user-service/user/login',
  EMAIL_CODE: '/v1/user-service/user/sendemail/code',
  SMS_CODE: '/v1/user-service/user/sendsmscode',
  BIND: '/v1/iot-service/api/user/bind',
  SLICER_SETTINGS: '/v1/iot-service/api/slicer/setting?version=1.10.0.89',
  TASKS: '/v1/user-service/my/tasks',
  PROJECTS: '/v1/iot-service/api/user/project',
  PREFERENCE: '/v1/design-user-service/my/preference',
}

const DEFAULT_HEADERS: Record<string, string> = {
  'X-BBL-Client-Name': 'OrcaSlicer',
  'X-BBL-Client-Type': 'slicer',
  'X-BBL-Client-Version': '01.09.05.51',
  'X-BBL-Language': 'en-US',
  'X-BBL-OS-Type': 'linux',
  'X-BBL-OS-Version': '6.2.0',
  'X-BBL-Agent-Version': '01.09.05.01',
  'X-BBL-Executable-info': '{}',
  'X-BBL-Agent-OS-Type': 'linux',
  'accept': 'application/json',
  'Content-Type': 'application/json',
}

export enum CloudErrorCode {
  AuthUsername = 'auth_username',
  Cloudflare = 'cloudflare',
  CodeExpired = 'code_expired',
  CodeIncorrect = 'code_incorrect',
  CodeRequired = 'code_required',
  ConnectionFailed = 'connection_failed',
  LoginFailed = 'login_failed',
  UnsupportedLoginType = 'unsupported_login_type',
  UnknownResponse = 'unknown_response',
}

export class CloudError extends Error {
  readonly code: CloudErrorCode
  readonly httpStatus: number
  readonly responseText?: string

  constructor(
    code: CloudErrorCode,
    message: string,
    httpStatus = 0,
    responseText?: string,
  ) {
    super(message)
    this.name = 'CloudError'
    this.code = code
    this.httpStatus = httpStatus
    this.responseText = responseText
  }
}

export class CloudClient {
  readonly baseUrl: string
  email = ''
  username = ''
  authToken = ''

  /**
   * Creates a Bambu Cloud API client.
   *
   * @param options.baseUrl Base URL for Bambu Cloud API requests, such as `https://api.bambulab.com`.
   */
  constructor(options: CloudClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
  }

  /**
   * Indicates whether the client currently has a cloud authentication token.
   *
   * @returns `true` when an auth token has been stored on this client.
   */
  get bambuConnected() {
    return this.authToken !== ''
  }

  /**
   * Logs in with an email/account and password.
   *
   * @param email Bambu account email or account identifier.
   * @param password Bambu account password.
   * @returns The access token and resolved cloud MQTT username.
   */
  async login(email: string, password: string): Promise<LoginSuccessResult> {
    this.email = email

    const response = await this.request('LOGIN', {
      body: {
        account: email,
        password,
        apiError: '',
      },
      method: 'POST',
      return400: true,
    })

    const authJson = await readResponseJson(response)
    if (response.status === 400) {
      throwLoginResponseError(authJson, response.status)
    }

    const accessToken = authJson?.accessToken ?? ''
    if (accessToken !== '') {
      this.authToken = accessToken
      this.username = await this.resolveUsername()
      return { type: 'success', accessToken: this.authToken, username: this.username }
    }

    throwKnownLoginTypeError(authJson, 400)
    throw new CloudError(CloudErrorCode.UnknownResponse, `Response not understood: ${JSON.stringify(authJson)}`)
  }

  /**
   * Completes a verification-code login after `requestNewCode()` or a code-required login response.
   *
   * @param code Email or SMS verification code entered by the user.
   * @returns The access token and resolved cloud MQTT username.
   */
  async loginWithVerificationCode(code: string): Promise<LoginSuccessResult> {
    const response = await this.request('LOGIN', {
      body: {
        account: this.email,
        code,
      },
      method: 'POST',
      return400: true,
    })

    if (response.status === 400) {
      const errorJson = await response.json()
      if (errorJson?.code === 1) {
        await this.requestNewCode()
        throw new CloudError(CloudErrorCode.CodeExpired, 'Email code expired', 400)
      }
      if (errorJson?.code === 2) {
        throw new CloudError(CloudErrorCode.CodeIncorrect, 'Email code incorrect', 400)
      }
      throw new CloudError(CloudErrorCode.UnknownResponse, `Response not understood: ${JSON.stringify(errorJson)}`, 400)
    }

    const authJson = await response.json()
    this.authToken = authJson.accessToken
    this.username = await this.resolveUsername()
    return { type: 'success', accessToken: this.authToken, username: this.username }
  }

  /**
   * Requests a new login verification code for the current account.
   *
   * @returns A promise that resolves when Bambu Cloud accepts the code request.
   */
  async requestNewCode() {
    if (this.email.includes('@')) {
      await this.request('EMAIL_CODE', {
        body: {
          email: this.email,
          type: 'codeLogin',
        },
        method: 'POST',
      })
      return
    }

    await this.request('SMS_CODE', {
      body: {
        phone: this.email,
        type: 'codeLogin',
      },
      method: 'POST',
    })
  }

  /**
   * Validates stored cloud credentials by saving them on the client and fetching the device list.
   *
   * @param email Bambu account email or phone number associated with the token.
   * @param username Cloud MQTT username, usually `u_<uid>`.
   * @param authToken Bambu Cloud access token.
   * @returns `true` when the credentials can fetch devices.
   */
  async testAuthentication(email: string, username: string, authToken: string) {
    this.email = email
    this.username = username
    this.authToken = authToken
    const result = await this.getDeviceList()
    return result !== null
  }

  /**
   * Fetches printers bound to the authenticated Bambu account.
   *
   * @returns A normalized list of cloud devices.
   */
  async getDeviceList(): Promise<CloudDevice[]> {
    const response = await this.request('BIND', { auth: true })
    const data = await response.json()
    return (data.devices ?? []).map((device: Record<string, any>) => ({
      dev_id: device.dev_id,
      name: device.name,
      online: device.online,
      print_status: device.print_status,
      dev_model_name: device.dev_model_name,
      dev_product_name: device.dev_product_name,
      dev_access_code: device.dev_access_code,
      nozzle_diameter: device.nozzle_diameter,
    }))
  }

  /**
   * Fetches the authenticated account's display profile.
   *
   * @returns Normalized profile information from Bambu Cloud preferences.
   */
  async getPreference(authToken = this.authToken): Promise<CloudPreference> {
    const response = await this.request('PREFERENCE', {
      auth: true,
      authToken,
    })
    return normalizeCloudPreference(await response.json())
  }

  /**
   * Fetches Bambu slicer setting metadata used by cloud projects and tasks.
   *
   * @returns The raw slicer settings response from Bambu Cloud.
   */
  async getSlicerSettings() {
    const response = await this.request('SLICER_SETTINGS', { auth: true })
    return response.json()
  }

  /**
   * Fetches the authenticated account's cloud print task history.
   *
   * @returns The raw task-list response from Bambu Cloud.
   */
  async getTaskList() {
    const response = await this.request('TASKS', { auth: true })
    return response.json()
  }

  /**
   * Fetches cloud projects associated with the authenticated account.
   *
   * @returns The raw project-list response from Bambu Cloud.
   */
  async getProjects() {
    const response = await this.request('PROJECTS', { auth: true })
    return response.json()
  }

  private async resolveUsername(authToken = this.authToken) {
    let username = getUsernameFromJwt(authToken)
    if (username) {
      return username
    }

    const preference = await this.getPreference(authToken)
    const uid = preference.uid
    if (uid) {
      username = `u_${uid}`
    }
    if (!username) {
      throw new CloudError(
        CloudErrorCode.AuthUsername,
        'Unable to retrieve username from authentication token',
        400,
      )
    }
    return username
  }

  private async request(urlName: CloudUrlName, options: CloudRequestOptions = {}) {
    const url = this.getUrl(urlName)
    const headers = this.buildHeaders(options)
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      redirect: 'manual',
    })
    await this.testResponse(response, options.return400)
    return response
  }

  private buildHeaders(options: CloudRequestOptions) {
    const headers: Record<string, string> = {
      ...DEFAULT_HEADERS,
      ...options.headers,
    }
    if (options.auth) {
      headers.Authorization = `Bearer ${options.authToken ?? this.authToken}`
    }
    return headers
  }

  private getUrl(urlName: CloudUrlName) {
    return joinUrl(this.baseUrl, CLOUD_URLS[urlName])
  }

  private async testResponse(response: Response, return400 = false) {
    if (response.status < 400) {
      return
    }

    const responseText = await response.clone().text()
    if ((response.status === 403 || response.status === 429) && responseText.includes('cloudflare')) {
      throw new CloudError(CloudErrorCode.Cloudflare, 'Blocked by Cloudflare', response.status, responseText)
    }
    if (response.status === 400 && return400) {
      return
    }
    throw new CloudError(
      CloudErrorCode.ConnectionFailed,
      `Connection failed with error code: ${response.status}`,
      response.status,
      responseText,
    )
  }
}

const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/g, '')

const joinUrl = (baseUrl: string, path: string) => `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (value === undefined || value === null) continue
    const text = `${value}`.trim()
    if (text) return text
  }
  return ''
}

const readResponseJson = async (response: Response) => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const throwKnownLoginTypeError = (value: unknown, httpStatus: number) => {
  const data = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {}
  const loginType = pickString(data.loginType)
  if (loginType === 'verifyCode') {
    throw new CloudError(CloudErrorCode.CodeRequired, 'Email code required', httpStatus)
  }
  if (loginType === 'tfa') {
    throw new CloudError(
      CloudErrorCode.UnsupportedLoginType,
      'Two factor authentication is not supported',
      httpStatus,
    )
  }
}

const throwLoginResponseError = (value: unknown, httpStatus: number) => {
  const data = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {}
  throwKnownLoginTypeError(data, httpStatus)
  if (httpStatus === 400) {
    const message = pickString(data.message, data.error, data.msg, data.reason, 'Login failed')
    throw new CloudError(CloudErrorCode.LoginFailed, message, httpStatus, JSON.stringify(data))
  }
}

const normalizeCloudPreference = (value: unknown): CloudPreference => {
  const preference = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {}
  const uid = pickString(preference.uid, preference.user_id, preference.userId, preference.id)

  return {
    avatar: pickString(
      preference.avatar,
      preference.avatar_url,
      preference.avatarUrl,
      preference.head_img_url,
      preference.headImgUrl,
    ),
    handle: pickString(preference.handle, preference.user_handle, preference.userHandle),
    nickname: pickString(preference.nickname, preference.nickName, preference.name, preference.userName),
    uid,
  }
}

const getUsernameFromJwt = (authToken: string) => {
  const tokens = authToken.split('.')
  if (tokens.length !== 3) {
    return null
  }
  try {
    return JSON.parse(base64UrlDecode(tokens[1]))?.username ?? null
  } catch {
    return null
  }
}

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  if (typeof atob === 'function') {
    return decodeURIComponent(
      Array.from(atob(padded), char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')
    )
  }
  return Buffer.from(padded, 'base64').toString('utf-8')
}
