// ============================================================
//  Phase 1: 核心类型定义
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
