import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CloudClient,
  CloudError,
  CloudErrorCode,
} from './cloud'

type FetchCall = {
  body?: string
  headers: Record<string, string>
  method: string
  url: string
}

const jsonResponse = (
  body: unknown,
  init: ResponseInit = {},
) => new Response(JSON.stringify(body), {
  headers: { 'content-type': 'application/json', ...init.headers },
  status: init.status ?? 200,
  statusText: init.statusText,
})

const textResponse = (
  body: string,
  init: ResponseInit = {},
) => new Response(body, {
  headers: init.headers,
  status: init.status ?? 200,
  statusText: init.statusText,
})

const createFetchMock = (responses: Response[]) => {
  const calls: FetchCall[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      body: init?.body as string | undefined,
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      method: init?.method ?? 'GET',
      url: input.toString(),
    })
    const response = responses.shift()
    if (!response) {
      throw new Error('Unexpected fetch call')
    }
    return response
  }) as unknown as typeof fetch
  vi.stubGlobal('fetch', fetchMock)
  return { calls }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const createCloudClient = (baseUrl = 'https://api.bambulab.com') => new CloudClient({ baseUrl })

const jwtToken = (payload: Record<string, unknown>) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  return `header.${encodedPayload}.signature`
}

const expectCloudError = async (
  action: () => Promise<unknown>,
  code: CloudErrorCode,
  httpStatus?: number,
) => {
  try {
    await action()
    throw new Error('Expected CloudError')
  } catch (err) {
    expect(err).toBeInstanceOf(CloudError)
    expect((err as CloudError).code).toBe(code)
    if (httpStatus !== undefined) {
      expect((err as CloudError).httpStatus).toBe(httpStatus)
    }
    return err as CloudError
  }
}

describe('CloudClient', () => {
  it('logs in with accessToken and resolves username from JWT payload', async () => {
    const token = jwtToken({ username: 'u_12345' })
    const { calls } = createFetchMock([
      jsonResponse({ accessToken: token }),
    ])
    const cloud = createCloudClient()

    const result = await cloud.login('user@example.com', 'secret')

    expect(result).toEqual({ type: 'success', accessToken: token, username: 'u_12345' })
    expect(cloud.authToken).toBe(token)
    expect(cloud.username).toBe('u_12345')
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: 'https://api.bambulab.com/v1/user-service/user/login',
    })
    expect(JSON.parse(calls[0].body ?? '{}')).toEqual({
      account: 'user@example.com',
      password: 'secret',
      apiError: '',
    })
    expect(calls[0].headers).toMatchObject({
      accept: 'application/json',
      'content-type': 'application/json',
      'x-bbl-client-name': 'OrcaSlicer',
      'x-bbl-client-type': 'slicer',
      'x-bbl-client-version': '01.09.05.51',
      'x-bbl-language': 'en-US',
      'x-bbl-os-type': 'linux',
      'x-bbl-os-version': '6.2.0',
      'x-bbl-agent-version': '01.09.05.01',
      'x-bbl-executable-info': '{}',
      'x-bbl-agent-os-type': 'linux',
    })
    expect(calls[0].headers['user-agent']).toBeUndefined()
    expect(calls[0].headers['accept-encoding']).toBeUndefined()
  })

  it('reports cloud connection state from auth token', () => {
    const cloud = createCloudClient()

    expect(cloud.bambuConnected).toBe(false)
    cloud.authToken = 'token'
    expect(cloud.bambuConnected).toBe(true)
  })

  it('supports caller-provided base URL and preserves query strings', async () => {
    const { calls } = createFetchMock([
      jsonResponse({ ok: true }),
    ])
    const cloud = createCloudClient('https://edge.example.com/cloud')
    cloud.authToken = 'token'

    await cloud.getSlicerSettings()

    expect(calls[0].url).toBe('https://edge.example.com/cloud/v1/iot-service/api/slicer/setting?version=1.10.0.89')
  })

  it('uses caller-provided API base URL instead of region rewriting', async () => {
    const token = jwtToken({ username: 'u_cn' })
    const { calls } = createFetchMock([
      jsonResponse({ accessToken: token }),
    ])
    const cloud = createCloudClient('https://cn-api.example.com')

    await cloud.login('user@example.com', 'secret')

    expect(calls[0].url).toBe('https://cn-api.example.com/v1/user-service/user/login')
  })

  it('reports verify-code login requirement like ha-bambulab', async () => {
    createFetchMock([
      jsonResponse({ loginType: 'verifyCode' }),
    ])
    const cloud = createCloudClient()

    await expectCloudError(
      () => cloud.login('user@example.com', 'secret'),
      CloudErrorCode.CodeRequired,
      400,
    )
  })

  it('reports 2FA login as unsupported for now', async () => {
    createFetchMock([
      jsonResponse({ loginType: 'tfa', tfaKey: 'tfa-key' }),
    ])
    const cloud = createCloudClient()

    await expectCloudError(
      () => cloud.login('user@example.com', 'secret'),
      CloudErrorCode.UnsupportedLoginType,
      400,
    )
  })

  it('reports unknown login responses', async () => {
    createFetchMock([
      jsonResponse({ loginType: 'unexpected' }),
    ])
    const cloud = createCloudClient()

    await expectCloudError(
      () => cloud.login('user@example.com', 'secret'),
      CloudErrorCode.UnknownResponse,
    )
  })

  it('requests email verification codes for email accounts', async () => {
    const { calls } = createFetchMock([
      jsonResponse({ ok: true }),
    ])
    const cloud = createCloudClient()
    cloud.email = 'user@example.com'

    await cloud.requestNewCode()

    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: 'https://api.bambulab.com/v1/user-service/user/sendemail/code',
    })
    expect(JSON.parse(calls[0].body ?? '{}')).toEqual({
      email: 'user@example.com',
      type: 'codeLogin',
    })
  })

  it('requests SMS verification codes for non-email accounts', async () => {
    const { calls } = createFetchMock([
      jsonResponse({ ok: true }),
    ])
    const cloud = createCloudClient('https://cn-api.example.com')
    cloud.email = '13800000000'

    await cloud.requestNewCode()

    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: 'https://cn-api.example.com/v1/user-service/user/sendsmscode',
    })
    expect(JSON.parse(calls[0].body ?? '{}')).toEqual({
      phone: '13800000000',
      type: 'codeLogin',
    })
  })

  it('requests SMS verification codes from the API host', async () => {
    const { calls } = createFetchMock([
      jsonResponse({ ok: true }),
    ])
    const cloud = createCloudClient('https://api.bambulab.cn/')
    cloud.email = '13800000000'

    await cloud.requestNewCode()

    expect(calls[0].url).toBe('https://api.bambulab.cn/v1/user-service/user/sendsmscode')
  })

  it('logs in with verification code and resolves JWT username', async () => {
    const token = jwtToken({ username: 'u_code' })
    const { calls } = createFetchMock([
      jsonResponse({ accessToken: token }),
    ])
    const cloud = createCloudClient()
    cloud.email = 'user@example.com'

    const result = await cloud.loginWithVerificationCode('123456')

    expect(result.username).toBe('u_code')
    expect(calls[0].url).toBe('https://api.bambulab.com/v1/user-service/user/login')
    expect(JSON.parse(calls[0].body ?? '{}')).toEqual({
      account: 'user@example.com',
      code: '123456',
    })
  })

  it('auto-requests a new code when verification code expired', async () => {
    const { calls } = createFetchMock([
      jsonResponse({ code: 1 }, { status: 400 }),
      jsonResponse({ ok: true }),
    ])
    const cloud = createCloudClient()
    cloud.email = 'user@example.com'

    await expectCloudError(
      () => cloud.loginWithVerificationCode('123456'),
      CloudErrorCode.CodeExpired,
      400,
    )

    expect(calls).toHaveLength(2)
    expect(calls[1].url).toBe('https://api.bambulab.com/v1/user-service/user/sendemail/code')
  })

  it('reports incorrect verification code', async () => {
    createFetchMock([
      jsonResponse({ code: 2 }, { status: 400 }),
    ])
    const cloud = createCloudClient()
    cloud.email = 'user@example.com'

    await expectCloudError(
      () => cloud.loginWithVerificationCode('123456'),
      CloudErrorCode.CodeIncorrect,
      400,
    )
  })

  it('reports unknown verification-code 400 responses', async () => {
    createFetchMock([
      jsonResponse({ code: 99 }, { status: 400 }),
    ])
    const cloud = createCloudClient()
    cloud.email = 'user@example.com'

    await expectCloudError(
      () => cloud.loginWithVerificationCode('123456'),
      CloudErrorCode.UnknownResponse,
      400,
    )
  })

  it('falls back to preference API when token is not JWT', async () => {
    const { calls } = createFetchMock([
      jsonResponse({ accessToken: 'opaque-token' }),
      jsonResponse({ uid: '98765' }),
    ])
    const cloud = createCloudClient()

    const result = await cloud.login('user@example.com', 'secret')

    expect(result.username).toBe('u_98765')
    expect(calls[1]).toMatchObject({
      method: 'GET',
      url: 'https://api.bambulab.com/v1/design-user-service/my/preference',
    })
    expect(calls[1].headers.authorization).toBe('Bearer opaque-token')
  })

  it('falls back to preference API when JWT payload cannot be decoded', async () => {
    const { calls } = createFetchMock([
      jsonResponse({ accessToken: 'header.bad-payload.signature' }),
      jsonResponse({ uid: '24680' }),
    ])
    const cloud = createCloudClient()

    const result = await cloud.login('user@example.com', 'secret')

    expect(result.username).toBe('u_24680')
    expect(calls[1].url).toBe('https://api.bambulab.com/v1/design-user-service/my/preference')
  })

  it('fetches normalized preference profile fields', async () => {
    const { calls } = createFetchMock([
      jsonResponse({
        avatar: 'https://example.com/avatar.png',
        handle: 'bambu_user',
        nickname: 'Bambu User',
        uid: '13579',
      }),
    ])
    const cloud = createCloudClient('https://cn-api.example.com')
    cloud.authToken = 'token'

    const preference = await cloud.getPreference()

    expect(preference).toEqual({
      avatar: 'https://example.com/avatar.png',
      handle: 'bambu_user',
      nickname: 'Bambu User',
      uid: '13579',
    })
    expect(calls[0]).toMatchObject({
      method: 'GET',
      url: 'https://cn-api.example.com/v1/design-user-service/my/preference',
    })
    expect(calls[0].headers.authorization).toBe('Bearer token')
  })

  it('can decode JWT payloads when atob is unavailable', async () => {
    const token = jwtToken({ username: 'u_buffer' })
    const originalAtob = globalThis.atob
    createFetchMock([
      jsonResponse({ accessToken: token }),
    ])
    const cloud = createCloudClient()

    try {
      Reflect.deleteProperty(globalThis, 'atob')
      const result = await cloud.login('user@example.com', 'secret')
      expect(result.username).toBe('u_buffer')
    } finally {
      globalThis.atob = originalAtob
    }
  })

  it('reports username resolution failure when preference API has no uid', async () => {
    createFetchMock([
      jsonResponse({ accessToken: 'opaque-token' }),
      jsonResponse({}),
    ])
    const cloud = createCloudClient()

    await expectCloudError(
      () => cloud.login('user@example.com', 'secret'),
      CloudErrorCode.AuthUsername,
      400,
    )
  })

  it('fetches device list with auth token', async () => {
    const { calls } = createFetchMock([
      jsonResponse({
        devices: [
          {
            dev_access_code: '12345678',
            dev_id: 'ABC123',
            dev_model_name: 'C12',
            dev_product_name: 'P1S',
            name: 'Bambu P1S',
            nozzle_diameter: 0.4,
            online: true,
            print_status: 'SUCCESS',
          },
        ],
      }),
    ])
    const cloud = createCloudClient()
    cloud.authToken = 'token'

    const devices = await cloud.getDeviceList()

    expect(calls[0]).toMatchObject({
      method: 'GET',
      url: 'https://api.bambulab.com/v1/iot-service/api/user/bind',
    })
    expect(calls[0].headers.authorization).toBe('Bearer token')
    expect(devices).toEqual([
      {
        dev_access_code: '12345678',
        dev_id: 'ABC123',
        dev_model_name: 'C12',
        dev_product_name: 'P1S',
        name: 'Bambu P1S',
        nozzle_diameter: 0.4,
        online: true,
        print_status: 'SUCCESS',
      },
    ])
  })

  it('tests authentication by saving credentials and getting devices', async () => {
    createFetchMock([
      jsonResponse({ devices: [] }),
    ])
    const cloud = createCloudClient()

    await expect(cloud.testAuthentication('user@example.com', 'u_saved', 'saved-token')).resolves.toBe(true)
    expect(cloud.email).toBe('user@example.com')
    expect(cloud.username).toBe('u_saved')
    expect(cloud.authToken).toBe('saved-token')
  })

  it('fetches task list, project list, and slicer settings', async () => {
    const { calls } = createFetchMock([
      jsonResponse({ total: 0, hits: [] }),
      jsonResponse({ projects: [] }),
      jsonResponse({ print: { public: [] } }),
    ])
    const cloud = createCloudClient()
    cloud.authToken = 'token'

    await expect(cloud.getTaskList()).resolves.toEqual({ total: 0, hits: [] })
    await expect(cloud.getProjects()).resolves.toEqual({ projects: [] })
    await expect(cloud.getSlicerSettings()).resolves.toEqual({ print: { public: [] } })

    expect(calls.map(call => call.url)).toEqual([
      'https://api.bambulab.com/v1/user-service/my/tasks',
      'https://api.bambulab.com/v1/iot-service/api/user/project',
      'https://api.bambulab.com/v1/iot-service/api/slicer/setting?version=1.10.0.89',
    ])
  })

  it('reports Cloudflare blocks for 403 and 429 responses containing cloudflare', async () => {
    createFetchMock([
      textResponse('blocked by cloudflare', { status: 403 }),
    ])
    const cloud403 = createCloudClient()
    await expectCloudError(
      () => cloud403.getDeviceList(),
      CloudErrorCode.Cloudflare,
      403,
    )

    createFetchMock([
      textResponse('temporary cloudflare block', { status: 429 }),
    ])
    const cloud429 = createCloudClient()
    await expectCloudError(
      () => cloud429.getDeviceList(),
      CloudErrorCode.Cloudflare,
      429,
    )
  })

  it('reports generic connection failures for non-return400 HTTP errors', async () => {
    createFetchMock([
      textResponse('server error', { status: 500 }),
    ])
    const cloud = createCloudClient()

    const err = await expectCloudError(
      () => cloud.getDeviceList(),
      CloudErrorCode.ConnectionFailed,
      500,
    )
    expect(err.responseText).toBe('server error')
  })
})
