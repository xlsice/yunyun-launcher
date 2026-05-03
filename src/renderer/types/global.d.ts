// ============================================================
//  全局类型定义
// ============================================================

// --- 认证 ---
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

// --- Java ---
export interface JavaRuntime {
  path: string
  version: string
  majorVersion: number
  is64bit: boolean
}

// --- 版本 ---
export interface VersionInfo {
  id: string
  type: string
  url: string
  releaseTime: string
}

export interface DownloadProgress {
  downloaded: number
  total: number
  percentage: number
  currentFile: string
  speed: string
}

// --- 启动 ---
export interface LaunchConfig {
  versionId: string
  gameDir: string
  javaPath: string
  javaArgs: string
  username: string
  uuid: string
  accessToken: string
  width: number
  height: number
}

// --- IPC 返回类型 ---
export interface IpcResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

// --- 云云生态 ---
export interface YunYunAuth {
  nickname: string
  uuid: string
  token: string
  expires: number
}

export interface YunYunPointsData {
  points: number
  totalEarned: number
  totalSpent: number
}

export interface YunYunCheckInStatusData {
  checked: boolean
  streak: number
}

export interface YunYunCheckInData {
  points: number
  streak: number
  isWeekBonus: boolean
}

export interface YunYunLogEntry {
  amount: number
  reason: string
  createdAt: string
}

export interface YunYunLotteryResult {
  prizeName: string
  prizeType: string
}

export interface YunYunLotteryHistoryEntry {
  prizeName: string
  prizeType: string
  createdAt: string
}

// ============================================================
//  API 接口
// ============================================================
export interface YunYunLauncherAPI {
  // 窗口控制
  minimize: () => void
  maximize: () => void
  close: () => void

  // 微软登录
  requestDeviceCode: () => Promise<IpcResult<DeviceCodeResponse>>
  pollForToken: (
    deviceCode: string,
    interval: number
  ) => Promise<IpcResult<AuthResult>>
  refreshToken: (
    refreshToken: string
  ) => Promise<IpcResult<AuthResult>>

  // Java 检测
  findJava: () => Promise<IpcResult<JavaRuntime[]>>

  // 版本管理
  fetchVersions: () => Promise<IpcResult<VersionInfo[]>>
  downloadVersion: (
    versionId: string,
    gameDir: string
  ) => Promise<IpcResult<void>>
  onDownloadProgress: (
    callback: (p: DownloadProgress) => void
  ) => () => void

  // 启动
  launchGame: (config: LaunchConfig) => Promise<IpcResult<void>>
  killGame: () => Promise<IpcResult<void>>
  onLaunchLog: (callback: (line: string) => void) => () => void
  onLaunchExit: (callback: (code: number) => void) => () => void

  // --- 云云登录 ---
  yunyunLogin: (
    nickname: string
  ) => Promise<IpcResult<{ status: string; code?: string }>>
  yunyunVerify: (
    nickname: string,
    code: string
  ) => Promise<IpcResult<YunYunAuth>>
  yunyunGetAuth: () => Promise<YunYunAuth | null>
  yunyunSetAuth: (data: YunYunAuth) => Promise<boolean>
  yunyunClearAuth: () => Promise<boolean>

  // --- 积分 ---
  yunyunGetPoints: (
    uuid: string,
    token: string
  ) => Promise<IpcResult<YunYunPointsData>>

  // --- 每日签到 ---
  yunyunCheckInStatus: (
    uuid: string,
    token: string
  ) => Promise<IpcResult<YunYunCheckInStatusData>>
  yunyunCheckIn: (
    uuid: string,
    token: string
  ) => Promise<IpcResult<YunYunCheckInData>>

  // --- 积分流水 ---
  yunyunGetLogs: (
    uuid: string,
    token: string
  ) => Promise<IpcResult<YunYunLogEntry[]>>

  // --- 抽奖 ---
  yunyunDrawLottery: (
    uuid: string,
    token: string,
    cost: number
  ) => Promise<IpcResult<YunYunLotteryResult>>
  yunyunGetLotteryHistory: (
    uuid: string,
    token: string
  ) => Promise<IpcResult<YunYunLotteryHistoryEntry[]>>

  // --- 设置存储 ---
  yunyunGetSettings: () => Promise<any>
  yunyunSetSettings: (key: string, value: any) => Promise<boolean>

  // 通用 IPC
  invoke: (channel: string, ...args: any[]) => Promise<any>
  on: (channel: string, callback: (...args: any[]) => void) => void
}

declare global {
  interface Window {
    yunyunLauncher: YunYunLauncherAPI
  }
}

export {}
