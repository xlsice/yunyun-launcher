import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import {
  requestDeviceCode,
  pollForToken,
  refreshAccessToken,
} from './auth'
import { findJavaRuntimes } from './java-finder'
import { fetchVersionManifest, downloadVersion } from './downloader'
import { launchMinecraft, killMinecraft } from './launcher'
import { authStore, settingsStore } from './store'
import {
  yunyunLogin,
  yunyunVerify,
  yunyunGetPoints,
  yunyunCheckInStatus,
  yunyunCheckIn,
  yunyunGetLogs,
  yunyunDrawLottery,
  yunyunGetLotteryHistory,
} from './yunyun-api'
import type { ChildProcess } from 'child_process'

let mainWindow: BrowserWindow | null = null
let mcProcess: ChildProcess | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#f7f3e9',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  })

  if (
    process.env.NODE_ENV === 'development' ||
    process.argv.includes('--dev')
  ) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  registerIpcHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// === 窗口控制 IPC ===
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.close())

// ============================================================
//  Phase 1: 核心功能 IPC Handlers
// ============================================================
function registerIpcHandlers(): void {
  // --- 微软登录 ---
  ipcMain.handle('auth:request-device-code', async () => {
    try {
      const result = await requestDeviceCode()
      return { success: true, data: result }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(
    'auth:poll-token',
    async (_event, deviceCode: string, interval: number) => {
      try {
        const result = await pollForToken(deviceCode, interval)
        return { success: true, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    'auth:refresh-token',
    async (_event, refreshToken: string) => {
      try {
        const result = await refreshAccessToken(refreshToken)
        return { success: true, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  // --- Java 检测 ---
  ipcMain.handle('java:find', async () => {
    try {
      const runtimes = findJavaRuntimes()
      return { success: true, data: runtimes }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // --- 版本下载 ---
  ipcMain.handle('version:fetch-manifest', async () => {
    try {
      const versions = await fetchVersionManifest()
      return { success: true, data: versions }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(
    'version:download',
    async (_event, versionId: string, gameDir: string) => {
      try {
        await downloadVersion(versionId, gameDir, (progress) => {
          mainWindow?.webContents.send('download-progress', progress)
        })
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  // --- 启动 ---
  ipcMain.handle('launch:start', async (_event, config: any) => {
    try {
      // 如果已有进程在运行，先关闭
      if (mcProcess && !mcProcess.killed) {
        killMinecraft(mcProcess)
        mcProcess = null
      }

      mcProcess = launchMinecraft(
        config,
        (line: string) => {
          mainWindow?.webContents.send('launch-log', line)
        },
        (code: number | null) => {
          mainWindow?.webContents.send(
            'launch-exit',
            code ?? -1
          )
          mcProcess = null
        }
      )

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // --- 强制关闭 ---
  ipcMain.handle('launch:kill', async () => {
    try {
      if (mcProcess) {
        killMinecraft(mcProcess)
        mcProcess = null
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ============================================================
  //  Phase 2: 云云生态 API IPC Handlers
  // ============================================================

  // --- 云云登录 ---
  ipcMain.handle('yunyun:login', async (_event, nickname: string) => {
    try {
      const result = await yunyunLogin(nickname)
      return { success: true, data: result }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle(
    'yunyun:verify',
    async (_event, nickname: string, code: string) => {
      try {
        const result = await yunyunVerify(nickname, code)
        return { success: true, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  // --- Auth Store ---
  ipcMain.handle('yunyun:get-auth', async () => {
    return authStore.get('auth', null)
  })

  ipcMain.handle('yunyun:set-auth', async (_event, data: any) => {
    authStore.set('auth', data)
    return true
  })

  ipcMain.handle('yunyun:clear-auth', async () => {
    authStore.delete('auth')
    return true
  })

  // --- 积分 ---
  ipcMain.handle(
    'yunyun:get-points',
    async (_event, uuid: string, token: string) => {
      try {
        const result = await yunyunGetPoints(uuid, token)
        return { success: true, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  // --- 签到 ---
  ipcMain.handle(
    'yunyun:checkin-status',
    async (_event, uuid: string, token: string) => {
      try {
        const result = await yunyunCheckInStatus(uuid, token)
        return { success: true, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    'yunyun:checkin',
    async (_event, uuid: string, token: string) => {
      try {
        const result = await yunyunCheckIn(uuid, token)
        return { success: true, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  // --- 积分流水 ---
  ipcMain.handle(
    'yunyun:get-logs',
    async (_event, uuid: string, token: string) => {
      try {
        const result = await yunyunGetLogs(uuid, token)
        return { success: true, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  // --- 抽奖 ---
  ipcMain.handle(
    'yunyun:draw-lottery',
    async (_event, uuid: string, token: string, cost: number) => {
      try {
        const result = await yunyunDrawLottery(uuid, token, cost)
        return { success: true, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    'yunyun:lottery-history',
    async (_event, uuid: string, token: string) => {
      try {
        const result = await yunyunGetLotteryHistory(uuid, token)
        return { success: true, data: result }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  // --- 设置 Store ---
  ipcMain.handle('yunyun:get-settings', async () => {
    return settingsStore.store
  })

  ipcMain.handle(
    'yunyun:set-settings',
    async (_event, key: string, value: any) => {
      settingsStore.set(key, value)
      return true
    }
  )
}
