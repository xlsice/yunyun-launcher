// ============================================================
// 云云生态 API 客户端
// 所有请求在主进程执行，Token 只在主进程持有
// ============================================================
import fetch from 'node-fetch'

const API_BASE = 'https://shimoray.com/api/v1'

export interface YunYunAuth {
  nickname: string
  uuid: string
  token: string
  expires: number
}

// ============================================================
//  登录
// ============================================================

/** 请求验证码 */
export async function yunyunLogin(
  nickname: string
): Promise<{ status: string; code?: string }> {
  const res = await fetch(`${API_BASE}/auth/web-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`登录请求失败: ${res.status} ${text}`)
  }
  return res.json() as Promise<{ status: string; code?: string }>
}

/** 确认验证码 → 获取 Token */
export async function yunyunVerify(
  nickname: string,
  code: string
): Promise<YunYunAuth> {
  const res = await fetch(`${API_BASE}/auth/verify-web`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, code }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`验证失败: ${res.status} ${text}`)
  }
  return res.json() as Promise<YunYunAuth>
}

// ============================================================
//  积分
// ============================================================

/** 获取积分 */
export async function yunyunGetPoints(
  uuid: string,
  token: string
): Promise<{ points: number; totalEarned: number; totalSpent: number }> {
  const res = await fetch(`${API_BASE}/points/${uuid}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`获取积分失败: ${res.status} ${text}`)
  }
  return res.json() as Promise<{
    points: number
    totalEarned: number
    totalSpent: number
  }>
}

// ============================================================
//  每日签到
// ============================================================

/** 查询签到状态 */
export async function yunyunCheckInStatus(
  uuid: string,
  token: string
): Promise<{ checked: boolean; streak: number }> {
  const res = await fetch(`${API_BASE}/points/checkin/${uuid}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`获取签到状态失败: ${res.status} ${text}`)
  }
  return res.json() as Promise<{ checked: boolean; streak: number }>
}

/** 执行签到 */
export async function yunyunCheckIn(
  uuid: string,
  token: string
): Promise<{ points: number; streak: number; isWeekBonus: boolean }> {
  const res = await fetch(`${API_BASE}/points/checkin/${uuid}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`签到失败: ${res.status} ${text}`)
  }
  return res.json() as Promise<{
    points: number
    streak: number
    isWeekBonus: boolean
  }>
}

// ============================================================
//  积分流水
// ============================================================

/** 获取积分流水 */
export async function yunyunGetLogs(
  uuid: string,
  token: string
): Promise<Array<{ amount: number; reason: string; createdAt: string }>> {
  const res = await fetch(`${API_BASE}/points/logs/${uuid}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`获取流水失败: ${res.status} ${text}`)
  }
  return res.json() as Promise<
    Array<{ amount: number; reason: string; createdAt: string }>
  >
}

// ============================================================
//  抽奖
// ============================================================

/** 抽奖 */
export async function yunyunDrawLottery(
  uuid: string,
  token: string,
  cost: number
): Promise<{ prizeName: string; prizeType: string }> {
  const res = await fetch(`${API_BASE}/lottery/draw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ uuid, cost }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`抽奖失败: ${res.status} ${text}`)
  }
  return res.json() as Promise<{ prizeName: string; prizeType: string }>
}

/** 获取抽奖记录 */
export async function yunyunGetLotteryHistory(
  uuid: string,
  token: string
): Promise<
  Array<{ prizeName: string; prizeType: string; createdAt: string }>
> {
  const res = await fetch(`${API_BASE}/lottery/history/${uuid}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`获取抽奖记录失败: ${res.status} ${text}`)
  }
  return res.json() as Promise<
    Array<{ prizeName: string; prizeType: string; createdAt: string }>
  >
}
