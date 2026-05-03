import fetch from 'node-fetch'

// === 公共 Client ID（Azure AD Application） ===
const CLIENT_ID = '5d507d0e-8565-4688-9564-6913c5b97d86'

// === 接口定义 ===
export interface DeviceCodeResponse {
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}

export interface AuthResult {
  accessToken: string
  uuid: string
  username: string
  refreshToken: string
}

interface InternalDeviceCode extends DeviceCodeResponse {
  deviceCode: string
}

// ============================================================
//  Step 1: 请求设备码
//  POST https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode
// ============================================================
export async function requestDeviceCode(): Promise<InternalDeviceCode> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: 'XboxLive.signin offline_access',
  })

  const res = await fetch(
    'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`请求设备码失败 (${res.status}): ${text}`)
  }

  const data = (await res.json()) as any
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn: data.expires_in,
    interval: data.interval,
  }
}

// ============================================================
//  Step 2: 轮询 Token
//  POST https://login.microsoftonline.com/consumers/oauth2/v2.0/token
// ============================================================
export async function pollForToken(
  deviceCode: string,
  interval: number
): Promise<AuthResult> {
  const startTime = Date.now()

  while (true) {
    // 等待 interval 秒
    await sleep(interval * 1000)

    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: CLIENT_ID,
      device_code: deviceCode,
    })

    const res = await fetch(
      'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      }
    )

    const data = (await res.json()) as any

    if (res.ok) {
      // 成功获取 access_token 和 refresh_token
      const msAccessToken = data.access_token
      const msRefreshToken = data.refresh_token

      // Step 3-6: 完成 Minecraft 认证链
      return completeMinecraftAuth(msAccessToken, msRefreshToken)
    }

    const error = data.error

    if (error === 'authorization_pending') {
      // 用户尚未完成授权，继续轮询
      continue
    }

    if (error === 'slow_down') {
      // 轮询过快，增加间隔
      interval += 5
      continue
    }

    if (error === 'authorization_declined') {
      throw new Error('用户取消了登录授权')
    }

    if (error === 'expired_token') {
      throw new Error('设备码已过期，请重新获取')
    }

    // 检查是否手动超时 (10分钟)
    if (Date.now() - startTime > 600_000) {
      throw new Error('登录超时，请重新获取设备码')
    }

    throw new Error(`Token 轮询失败: ${JSON.stringify(data)}`)
  }
}

// ============================================================
//  Step 3: Xbox Live 认证
//  POST https://user.auth.xboxlive.com/user/authenticate
// ============================================================
async function authenticateXboxLive(
  msAccessToken: string
): Promise<{ token: string; uhs: string }> {
  const body = {
    Properties: {
      AuthMethod: 'RPS',
      SiteName: 'user.auth.xboxlive.com',
      RpsTicket: `d=${msAccessToken}`,
    },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT',
  }

  const res = await fetch(
    'https://user.auth.xboxlive.com/user/authenticate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Xbox Live 认证失败 (${res.status}): ${text}`)
  }

  const data = (await res.json()) as any
  return {
    token: data.Token,
    uhs: data.DisplayClaims.xui[0].uhs,
  }
}

// ============================================================
//  Step 4: XSTS 认证
//  POST https://xsts.auth.xboxlive.com/xsts/authorize
// ============================================================
async function authenticateXSTS(
  xboxToken: string
): Promise<{ token: string; uhs: string }> {
  const body = {
    Properties: {
      SandboxId: 'RETAIL',
      UserTokens: [xboxToken],
    },
    RelyingParty: 'rp://api.minecraftservices.com/',
    TokenType: 'JWT',
  }

  const res = await fetch(
    'https://xsts.auth.xboxlive.com/xsts/authorize',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const text = await res.text()

    // 检查是否是儿童账户需要家长授权
    if (res.status === 401) {
      const data = JSON.parse(text) as any
      if (data.XErr === 2148916233) {
        throw new Error('此账户没有 Minecraft，请购买游戏')
      }
      if (data.XErr === 2148916238) {
        throw new Error('此账户是儿童账户，需要家长授权才能登录')
      }
    }

    throw new Error(`XSTS 认证失败 (${res.status}): ${text}`)
  }

  const data = (await res.json()) as any
  return {
    token: data.Token,
    uhs: data.DisplayClaims.xui[0].uhs,
  }
}

// ============================================================
//  Step 5: Minecraft 认证
//  POST https://api.minecraftservices.com/authentication/login_with_xbox
// ============================================================
async function authenticateMinecraft(
  uhs: string,
  xstsToken: string
): Promise<{ accessToken: string }> {
  const body = {
    identityToken: `XBL3.0 x=${uhs};${xstsToken}`,
  }

  const res = await fetch(
    'https://api.minecraftservices.com/authentication/login_with_xbox',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Minecraft 认证失败 (${res.status}): ${text}`)
  }

  const data = (await res.json()) as any
  return { accessToken: data.access_token }
}

// ============================================================
//  Step 6: 获取 Minecraft Profile
//  GET https://api.minecraftservices.com/minecraft/profile
// ============================================================
async function getMinecraftProfile(
  minecraftToken: string
): Promise<{ uuid: string; username: string }> {
  const res = await fetch(
    'https://api.minecraftservices.com/minecraft/profile',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${minecraftToken}`,
      },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`获取 Minecraft Profile 失败 (${res.status}): ${text}`)
  }

  const data = (await res.json()) as any
  return {
    uuid: data.id,
    username: data.name,
  }
}

// ============================================================
//  完整的认证链
// ============================================================
async function completeMinecraftAuth(
  msAccessToken: string,
  msRefreshToken: string
): Promise<AuthResult> {
  // Step 3: Xbox Live 认证
  const xbox = await authenticateXboxLive(msAccessToken)

  // Step 4: XSTS 认证
  const xsts = await authenticateXSTS(xbox.token)

  // Step 5: Minecraft 认证
  const mc = await authenticateMinecraft(xsts.uhs, xsts.token)

  // Step 6: 获取 Profile
  const profile = await getMinecraftProfile(mc.accessToken)

  return {
    accessToken: mc.accessToken,
    uuid: profile.uuid,
    username: profile.username,
    refreshToken: msRefreshToken,
  }
}

// ============================================================
//  刷新 Token
//  POST https://login.microsoftonline.com/consumers/oauth2/v2.0/token
// ============================================================
export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthResult> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    refresh_token: refreshToken,
  })

  const res = await fetch(
    'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`刷新 Token 失败 (${res.status}): ${text}`)
  }

  const data = (await res.json()) as any

  return completeMinecraftAuth(data.access_token, data.refresh_token)
}

// ============================================================
//  工具函数
// ============================================================
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
