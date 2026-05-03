import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('yunyunLauncher', {
  // --- 窗口控制 ---
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // --- 微软登录 ---
  requestDeviceCode: () => ipcRenderer.invoke('auth:request-device-code'),
  pollForToken: (deviceCode: string, interval: number) =>
    ipcRenderer.invoke('auth:poll-token', deviceCode, interval),
  refreshToken: (refreshToken: string) =>
    ipcRenderer.invoke('auth:refresh-token', refreshToken),

  // --- Java 检测 ---
  findJava: () => ipcRenderer.invoke('java:find'),

  // --- 版本管理 ---
  fetchVersions: () => ipcRenderer.invoke('version:fetch-manifest'),
  downloadVersion: (versionId: string, gameDir: string) =>
    ipcRenderer.invoke('version:download', versionId, gameDir),
  onDownloadProgress: (callback: (p: any) => void) => {
    const handler = (_event: any, p: any) => callback(p)
    ipcRenderer.on('download-progress', handler)
    return () => ipcRenderer.removeListener('download-progress', handler)
  },

  // --- 启动 ---
  launchGame: (config: any) => ipcRenderer.invoke('launch:start', config),
  killGame: () => ipcRenderer.invoke('launch:kill'),
  onLaunchLog: (callback: (line: string) => void) => {
    const handler = (_event: any, line: string) => callback(line)
    ipcRenderer.on('launch-log', handler)
    return () => ipcRenderer.removeListener('launch-log', handler)
  },
  onLaunchExit: (callback: (code: number) => void) => {
    const handler = (_event: any, code: number) => callback(code)
    ipcRenderer.on('launch-exit', handler)
    return () => ipcRenderer.removeListener('launch-exit', handler)
  },

  // ============================================================
  //  Phase 2: 云云生态 API
  // ============================================================

  // --- 云云登录 ---
  yunyunLogin: (nickname: string) =>
    ipcRenderer.invoke('yunyun:login', nickname),
  yunyunVerify: (nickname: string, code: string) =>
    ipcRenderer.invoke('yunyun:verify', nickname, code),
  yunyunGetAuth: () => ipcRenderer.invoke('yunyun:get-auth'),
  yunyunSetAuth: (data: any) => ipcRenderer.invoke('yunyun:set-auth', data),
  yunyunClearAuth: () => ipcRenderer.invoke('yunyun:clear-auth'),

  // --- 积分 ---
  yunyunGetPoints: (uuid: string, token: string) =>
    ipcRenderer.invoke('yunyun:get-points', uuid, token),

  // --- 每日签到 ---
  yunyunCheckInStatus: (uuid: string, token: string) =>
    ipcRenderer.invoke('yunyun:checkin-status', uuid, token),
  yunyunCheckIn: (uuid: string, token: string) =>
    ipcRenderer.invoke('yunyun:checkin', uuid, token),

  // --- 积分流水 ---
  yunyunGetLogs: (uuid: string, token: string) =>
    ipcRenderer.invoke('yunyun:get-logs', uuid, token),

  // --- 抽奖 ---
  yunyunDrawLottery: (uuid: string, token: string, cost: number) =>
    ipcRenderer.invoke('yunyun:draw-lottery', uuid, token, cost),
  yunyunGetLotteryHistory: (uuid: string, token: string) =>
    ipcRenderer.invoke('yunyun:lottery-history', uuid, token),

  // --- 设置存储 ---
  yunyunGetSettings: () => ipcRenderer.invoke('yunyun:get-settings'),
  yunyunSetSettings: (key: string, value: any) =>
    ipcRenderer.invoke('yunyun:set-settings', key, value),

  // --- 通用 IPC ---
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
})
