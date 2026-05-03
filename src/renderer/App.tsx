import React, { useState, useEffect, useCallback, useRef } from 'react'

// ====== 类型定义 ======
type TabKey = 'home' | 'shop' | 'mod' | 'profile' | 'settings'

interface TabDef {
  key: TabKey
  label: string
  emoji: string
}

interface VersionInfo {
  id: string
  type: string
  url: string
  releaseTime: string
}

interface JavaRuntime {
  path: string
  version: string
  majorVersion: number
  is64bit: boolean
}

interface AuthResult {
  accessToken: string
  uuid: string
  username: string
  refreshToken: string
}

interface DownloadProgress {
  downloaded: number
  total: number
  percentage: number
  currentFile: string
  speed: string
}

const tabs: TabDef[] = [
  { key: 'home', label: '首页', emoji: '🏠' },
  { key: 'shop', label: '商城', emoji: '🛒' },
  { key: 'mod', label: 'Mod', emoji: '📦' },
  { key: 'profile', label: '我的', emoji: '👤' },
  { key: 'settings', label: '设置', emoji: '⚙️' },
]

// ====== 首页 Tab ======
function HomeTab({
  authResult,
  isLoggingIn,
  deviceCode,
  loginError,
  versions,
  selectedVersion,
  onSelectVersion,
  javaRuntimes,
  selectedJava,
  onSelectJava,
  memory,
  onMemoryChange,
  isDownloading,
  downloadProgress,
  isLaunching,
  launchLogs,
  onLogin,
  onCancelLogin,
  onLaunch,
  onKill,
}: {
  authResult: AuthResult | null
  isLoggingIn: boolean
  deviceCode: string | null
  loginError: string | null
  versions: VersionInfo[]
  selectedVersion: string
  onSelectVersion: (v: string) => void
  javaRuntimes: JavaRuntime[]
  selectedJava: string
  onSelectJava: (v: string) => void
  memory: string
  onMemoryChange: (v: string) => void
  isDownloading: boolean
  downloadProgress: DownloadProgress | null
  isLaunching: boolean
  launchLogs: string[]
  onLogin: () => void
  onCancelLogin: () => void
  onLaunch: () => void
  onKill: () => void
}) {
  // 过滤只显示正式版
  const releaseVersions = versions.filter(
    (v) => v.type === 'release'
  )
  const snapshotVersions = versions.filter(
    (v) => v.type === 'snapshot'
  )

  return (
    <div className="home-tab">
      {/* Logo & 服务器名 */}
      <div className="home-hero">
        <div className="home-logo">☁️</div>
        <h1 className="home-server-name pixel-font">云云服务器</h1>
        <p className="home-subtitle">YunYun Minecraft Server</p>
      </div>

      {/* 登录区域 */}
      <div className="home-login-section">
        {authResult ? (
          // 已登录
          <div className="login-info">
            <img
              className="player-avatar"
              src={`https://mc-heads.net/avatar/${authResult.uuid}/48`}
              alt={authResult.username}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://mc-heads.net/avatar/MHF_Steve/48'
              }}
            />
            <div className="login-info-text">
              <span className="player-name-display pixel-font">
                {authResult.username}
              </span>
              <span className="player-uuid-display">
                {authResult.uuid.substring(0, 8)}...
              </span>
            </div>
            <button className="logout-btn" onClick={onCancelLogin}>
              切换账户
            </button>
          </div>
        ) : isLoggingIn ? (
          // 登录中
          <div className="login-in-progress">
            {deviceCode ? (
              <>
                <div className="device-code-display pixel-font">
                  {deviceCode}
                </div>
                <p className="device-code-instruction">
                  打开{' '}
                  <a
                    href="https://www.microsoft.com/link"
                    target="_blank"
                    rel="noreferrer"
                    className="ms-link"
                  >
                    microsoft.com/link
                  </a>{' '}
                  输入上方代码
                </p>
                <p className="device-code-waiting">
                  等待授权中...
                  <span className="dot-anim">.</span>
                </p>
                <button
                  className="cancel-login-btn"
                  onClick={onCancelLogin}
                >
                  取消
                </button>
              </>
            ) : (
              <p className="device-code-waiting">正在请求设备码...</p>
            )}
          </div>
        ) : (
          // 未登录
          <button
            className="login-btn pixel-btn"
            onClick={onLogin}
          >
            <span className="ms-icon">🔑</span>
            微软账号登录
          </button>
        )}
        {loginError && (
          <p className="login-error">⚠ {loginError}</p>
        )}
      </div>

      {/* 游戏设置 */}
      <div className="home-settings">
        {/* 版本选择 */}
        <div className="setting-row">
          <label className="setting-label">游戏版本</label>
          <select
            className="setting-select"
            value={selectedVersion}
            onChange={(e) => onSelectVersion(e.target.value)}
            disabled={isLaunching}
          >
            {releaseVersions.length > 0 ? (
              <optgroup label="正式版">
                {releaseVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.id}
                  </option>
                ))}
              </optgroup>
            ) : (
              <option value="">加载中...</option>
            )}
            {snapshotVersions.length > 0 && (
              <optgroup label="快照版">
                {snapshotVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.id}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Java 选择 */}
        <div className="setting-row">
          <label className="setting-label">Java 运行环境</label>
          <select
            className="setting-select"
            value={selectedJava}
            onChange={(e) => onSelectJava(e.target.value)}
            disabled={isLaunching}
          >
            {javaRuntimes.length > 0 ? (
              javaRuntimes.map((j) => (
                <option key={j.path} value={j.path}>
                  Java {j.majorVersion} ({j.version})
                  {j.is64bit ? ' 64位' : ' 32位'} — {j.path}
                </option>
              ))
            ) : (
              <option value="">未检测到 Java</option>
            )}
          </select>
          <button
            className="refresh-java-btn"
            onClick={() => onSelectJava('__refresh__')}
            disabled={isLaunching}
            title="重新检测 Java"
          >
            🔄
          </button>
        </div>

        {/* 内存设置 */}
        <div className="setting-row">
          <label className="setting-label">内存分配</label>
          <div className="memory-input-group">
            <input
              type="number"
              className="memory-input"
              value={memory}
              onChange={(e) => onMemoryChange(e.target.value)}
              min="1"
              max="32"
              disabled={isLaunching}
            />
            <span className="memory-unit">GB</span>
          </div>
        </div>
      </div>

      {/* 启动/下载按钮 */}
      <div className="home-action">
        {isDownloading ? (
          <div className="download-progress-section">
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${downloadProgress?.percentage || 0}%`,
                }}
              />
            </div>
            <p className="download-info">
              {downloadProgress?.currentFile}
              {' — '}
              {downloadProgress?.downloaded}/{downloadProgress?.total}
              {' — '}
              {downloadProgress?.speed}
            </p>
          </div>
        ) : isLaunching ? (
          // 启动中
          <div className="launch-controls">
            <button
              className="launch-btn pixel-btn kill-btn"
              onClick={onKill}
            >
              ⏹ 关闭游戏
            </button>
          </div>
        ) : (
          <button
            className="launch-btn pixel-btn pulse-glow"
            onClick={onLaunch}
            disabled={
              !authResult ||
              !selectedVersion ||
              !selectedJava
            }
          >
            <span className="launch-icon">▶</span>
            {!authResult
              ? '请先登录'
              : !selectedJava
              ? '请选择 Java'
              : '启动游戏'}
          </button>
        )}
      </div>

      {/* 游戏日志 */}
      {isLaunching && launchLogs.length > 0 && (
        <div className="launch-log-container">
          <div className="launch-log-header pixel-font">游戏日志</div>
          <div className="launch-log-content">
            {launchLogs.map((line, i) => (
              <span key={i} className="log-line">
                {line}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 快捷信息 */}
      {!isLaunching && (
        <div className="home-stats">
          <div className="stat-card">
            <span className="stat-emoji">👥</span>
            <span className="stat-value">12</span>
            <span className="stat-label">在线玩家</span>
          </div>
          <div className="stat-card">
            <span className="stat-emoji">🌍</span>
            <span className="stat-value">生存</span>
            <span className="stat-label">当前模式</span>
          </div>
          <div className="stat-card">
            <span className="stat-emoji">📡</span>
            <span className="stat-value status-online">在线</span>
            <span className="stat-label">服务器状态</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ====== 商城 Tab ======
function ShopTab() {
  return (
    <div className="shop-tab">
      <h2 className="tab-title">🛒 云云商城</h2>
      <p className="tab-desc">
        在游戏内使用金币购买称号、粒子特效和装饰道具
      </p>
      <div className="shop-placeholder">
        <div className="shop-cloud-anim">☁️</div>
        <p className="pixel-font">商城页面正在建设中...</p>
        <p className="text-mid">敬请期待！</p>
      </div>
    </div>
  )
}

// ====== Mod Tab ======
function ModTab() {
  return (
    <div className="mod-tab">
      <h2 className="tab-title">📦 Mod 管理</h2>
      <p className="tab-desc">
        管理和更新你的模组，一键安装云云服务器专属 Mod 包
      </p>
      <div className="mod-list-placeholder">
        <div className="mod-item-demo">
          <span className="mod-icon">📄</span>
          <span className="mod-name">Fabric API</span>
          <span className="mod-ver">v0.95.0</span>
        </div>
        <div className="mod-item-demo">
          <span className="mod-icon">📄</span>
          <span className="mod-name">Sodium</span>
          <span className="mod-ver">v0.5.11</span>
        </div>
        <div className="mod-item-demo">
          <span className="mod-icon">📄</span>
          <span className="mod-name">Iris Shaders</span>
          <span className="mod-ver">v1.7.5</span>
        </div>
        <button className="pixel-btn mod-install-btn">
          📥 一键安装 Mod 包
        </button>
      </div>
    </div>
  )
}

// ====== 我的 Tab ======
function ProfileTab({
  authResult,
}: {
  authResult: AuthResult | null
}) {
  const displayName = authResult?.username || 'Steve'
  const displayUuid = authResult?.uuid || generateFakeUUID()
  const avatarUrl = authResult
    ? `https://mc-heads.net/avatar/${authResult.uuid}/64`
    : undefined

  return (
    <div className="profile-tab">
      <h2 className="tab-title">👤 我的</h2>
      <div className="profile-card">
        {avatarUrl ? (
          <img
            className="avatar-placeholder"
            src={avatarUrl}
            alt={displayName}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="avatar-placeholder">☁️</div>
        )}
        <h3 className="player-name pixel-font">{displayName}</h3>
        <p className="player-id">UUID: {displayUuid}</p>
        <div className="profile-stats">
          <div className="pstat">
            <span className="pstat-val">🪙 1,280</span>
            <span className="pstat-label">金币</span>
          </div>
          <div className="pstat">
            <span className="pstat-val">⭐ 42</span>
            <span className="pstat-label">成就点数</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function generateFakeUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ====== 设置 Tab ======
function SettingsTab() {
  return (
    <div className="settings-tab">
      <h2 className="tab-title">⚙️ 设置</h2>
      <div className="settings-group">
        <h3 className="settings-group-title">游戏设置</h3>
        <div className="setting-row">
          <span>Java 路径</span>
          <span className="setting-val text-mid">自动检测</span>
        </div>
        <div className="setting-row">
          <span>游戏版本</span>
          <span className="setting-val">1.21</span>
        </div>
        <div className="setting-row">
          <span>内存分配</span>
          <span className="setting-val">4 GB</span>
        </div>
      </div>
      <div className="settings-group">
        <h3 className="settings-group-title">启动器设置</h3>
        <div className="setting-row">
          <span>开机启动</span>
          <span className="setting-val">关闭</span>
        </div>
        <div className="setting-row">
          <span>关闭后最小化</span>
          <span className="setting-val">开启</span>
        </div>
      </div>
      <div className="settings-footer">
        <p className="version-info">云云启动器 v0.1.0</p>
        <p className="copyright">© 2026 雪冷水</p>
      </div>
    </div>
  )
}

// ====== 标题栏 ======
function TitleBar({
  onMinimize,
  onMaximize,
  onClose,
}: {
  onMinimize: () => void
  onMaximize: () => void
  onClose: () => void
}) {
  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-logo">☁️</span>
        <span className="titlebar-text pixel-font">云云启动器</span>
      </div>
      <div className="titlebar-controls">
        <button
          className="titlebar-btn minimize"
          onClick={onMinimize}
          title="最小化"
        >
          ─
        </button>
        <button
          className="titlebar-btn maximize"
          onClick={onMaximize}
          title="最大化"
        >
          □
        </button>
        <button
          className="titlebar-btn close"
          onClick={onClose}
          title="关闭"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ====== 底栏导航 ======
function BottomBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
}) {
  return (
    <nav className="bottombar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`bottombar-tab ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          <span className="bottombar-emoji">{tab.emoji}</span>
          <span className="bottombar-label">{tab.label}</span>
          {activeTab === tab.key && (
            <span className="bottombar-indicator" />
          )}
        </button>
      ))}
    </nav>
  )
}

// ====== 浮动云朵装饰 ======
function FloatingClouds() {
  const clouds = [
    {
      emoji: '☁️',
      top: '8%',
      left: '5%',
      size: '2.5rem',
      duration: '14s',
      delay: '0s',
    },
    {
      emoji: '☁️',
      top: '15%',
      left: '60%',
      size: '2rem',
      duration: '16s',
      delay: '3s',
    },
    {
      emoji: '☁️',
      top: '45%',
      left: '80%',
      size: '1.8rem',
      duration: '18s',
      delay: '6s',
    },
    {
      emoji: '☁️',
      top: '70%',
      left: '10%',
      size: '2.2rem',
      duration: '15s',
      delay: '2s',
    },
    {
      emoji: '⛅',
      top: '30%',
      left: '35%',
      size: '1.6rem',
      duration: '20s',
      delay: '8s',
    },
  ]

  return (
    <div className="floating-clouds">
      {clouds.map((cloud, i) => (
        <span
          key={i}
          className="floating-cloud"
          style={{
            top: cloud.top,
            left: cloud.left,
            fontSize: cloud.size,
            animationDuration: cloud.duration,
            animationDelay: cloud.delay,
          }}
        >
          {cloud.emoji}
        </span>
      ))}
    </div>
  )
}

// ====== App 主组件 ======
export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [isMaximized, setIsMaximized] = useState(false)

  // --- 认证状态 ---
  const [authResult, setAuthResult] = useState<AuthResult | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [deviceCode, setDeviceCode] = useState<string | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)
  const pollingRef = useRef(false)
  const currentDeviceCodeRef = useRef<string>('')

  // --- 版本/Java ---
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [selectedVersion, setSelectedVersion] = useState('')
  const [javaRuntimes, setJavaRuntimes] = useState<JavaRuntime[]>([])
  const [selectedJava, setSelectedJava] = useState('')
  const [memory, setMemory] = useState('4')

  // --- 下载状态 ---
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null)

  // --- 启动状态 ---
  const [isLaunching, setIsLaunching] = useState(false)
  const [launchLogs, setLaunchLogs] = useState<string[]>([])

  // =============================================
  //  初始化：加载版本列表和 Java 列表
  // =============================================
  useEffect(() => {
    loadVersions()
    loadJavaRuntimes()
  }, [])

  const loadVersions = async () => {
    const api = window.yunyunLauncher
    if (!api) return
    const result = await api.fetchVersions()
    if (result.success && result.data) {
      setVersions(result.data)
      // 默认选择最新的正式版
      const latestRelease = result.data
        .filter((v) => v.type === 'release')
        .sort(
          (a, b) =>
            new Date(b.releaseTime).getTime() -
            new Date(a.releaseTime).getTime()
        )[0]
      if (latestRelease) {
        setSelectedVersion(latestRelease.id)
      }
    }
  }

  const loadJavaRuntimes = async () => {
    const api = window.yunyunLauncher
    if (!api) return
    const result = await api.findJava()
    if (result.success && result.data && result.data.length > 0) {
      setJavaRuntimes(result.data)
      setSelectedJava(result.data[0].path)
    }
  }

  // =============================================
  //  登录
  // =============================================
  const handleLogin = async () => {
    const api = window.yunyunLauncher
    if (!api) return

    setIsLoggingIn(true)
    setLoginError(null)
    setDeviceCode(null)

    try {
      const deviceResult = await api.requestDeviceCode()
      if (!deviceResult.success) {
        setLoginError(deviceResult.error || '请求设备码失败')
        setIsLoggingIn(false)
        return
      }

      const dc = deviceResult.data!
      setDeviceCode(dc.userCode)
      currentDeviceCodeRef.current = dc.userCode
      pollingRef.current = true

      // 开始轮询
      const authResult = await api.pollForToken(
        dc.userCode,
        dc.interval
      )

      if (!pollingRef.current) return // 用户取消了

      if (!authResult.success) {
        setLoginError(authResult.error || '登录失败')
        setIsLoggingIn(false)
        setDeviceCode(null)
        return
      }

      setAuthResult(authResult.data!)
      setIsLoggingIn(false)
      setDeviceCode(null)

      // 保存 refresh token 到 local storage
      try {
        localStorage.setItem(
          'yunyun_refresh_token',
          authResult.data!.refreshToken
        )
      } catch {}

      // 切换到我的标签页
      setActiveTab('profile')
    } catch (err: any) {
      setLoginError(err.message || '登录失败')
      setIsLoggingIn(false)
      setDeviceCode(null)
    }

    pollingRef.current = false
  }

  const handleCancelLogin = () => {
    pollingRef.current = false
    setIsLoggingIn(false)
    setDeviceCode(null)
    setLoginError(null)
    setAuthResult(null)
  }

  // =============================================
  //  启动游戏
  // =============================================
  const handleLaunch = async () => {
    const api = window.yunyunLauncher
    if (!api || !authResult || !selectedVersion || !selectedJava) return

    // 计算游戏目录
    const gameDir = localStorage.getItem('yunyun_game_dir') || '.minecraft'

    // 先下载（如果还没下载）
    const versionJsonPath = `${gameDir}/versions/${selectedVersion}/${selectedVersion}.json`
    // 我们通过尝试下载来确保文件存在（downloader 会跳过已存在的文件）

    setIsDownloading(true)
    setDownloadProgress(null)

    try {
      const dlResult = await api.downloadVersion(selectedVersion, gameDir)
      if (!dlResult.success) {
        setLoginError(dlResult.error || '下载失败')
        setIsDownloading(false)
        return
      }
    } catch (err: any) {
      setLoginError(err.message || '下载失败')
      setIsDownloading(false)
      return
    }

    setIsDownloading(false)
    setDownloadProgress(null)

    // 启动游戏
    setIsLaunching(true)
    setLaunchLogs([])
    setActiveTab('home')

    // 注册日志监听
    const unsubLog = api.onLaunchLog((line) => {
      setLaunchLogs((prev) => {
        const next = [...prev, line]
        // 最多保留 500 行
        if (next.length > 500) {
          return next.slice(next.length - 500)
        }
        return next
      })
    })

    const unsubExit = api.onLaunchExit((code) => {
      setLaunchLogs((prev) => [
        ...prev,
        `游戏已退出，退出码: ${code}`,
      ])
      setIsLaunching(false)
      unsubLog()
      unsubExit()
    })

    const launchConfig = {
      versionId: selectedVersion,
      gameDir: gameDir,
      javaPath: selectedJava,
      javaArgs: `-Xmx${memory}G -Xms${Math.max(1, Math.floor(Number(memory) / 2))}G`,
      username: authResult.username,
      uuid: authResult.uuid,
      accessToken: authResult.accessToken,
      width: 854,
      height: 480,
    }

    const launchResult = await api.launchGame(launchConfig)
    if (!launchResult.success) {
      setLaunchLogs((prev) => [
        ...prev,
        `启动失败: ${launchResult.error}`,
      ])
      setIsLaunching(false)
      unsubLog()
      unsubExit()
    }
  }

  const handleKill = async () => {
    const api = window.yunyunLauncher
    if (!api) return
    await api.killGame()
    setIsLaunching(false)
  }

  // =============================================
  //  下载进度监听
  // =============================================
  useEffect(() => {
    const api = window.yunyunLauncher
    if (!api) return
    const unsubscribe = api.onDownloadProgress((p) => {
      setDownloadProgress(p)
    })
    return () => {
      unsubscribe?.()
    }
  }, [])

  // =============================================
  //  窗口控制
  // =============================================
  const handleMinimize = useCallback(() => {
    window.yunyunLauncher?.minimize()
  }, [])

  const handleMaximize = useCallback(() => {
    window.yunyunLauncher?.maximize()
    setIsMaximized((prev) => !prev)
  }, [])

  const handleClose = useCallback(() => {
    window.yunyunLauncher?.close()
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setIsMaximized(window.innerWidth >= screen.width - 10)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // =============================================
  //  渲染
  // =============================================
  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            authResult={authResult}
            isLoggingIn={isLoggingIn}
            deviceCode={deviceCode}
            loginError={loginError}
            versions={versions}
            selectedVersion={selectedVersion}
            onSelectVersion={setSelectedVersion}
            javaRuntimes={javaRuntimes}
            selectedJava={selectedJava}
            onSelectJava={(v) => {
              if (v === '__refresh__') {
                loadJavaRuntimes()
              } else {
                setSelectedJava(v)
              }
            }}
            memory={memory}
            onMemoryChange={setMemory}
            isDownloading={isDownloading}
            downloadProgress={downloadProgress}
            isLaunching={isLaunching}
            launchLogs={launchLogs}
            onLogin={handleLogin}
            onCancelLogin={handleCancelLogin}
            onLaunch={handleLaunch}
            onKill={handleKill}
          />
        )
      case 'shop':
        return <ShopTab />
      case 'mod':
        return <ModTab />
      case 'profile':
        return <ProfileTab authResult={authResult} />
      case 'settings':
        return <SettingsTab />
      default:
        return <HomeTab {...({} as any)} />
    }
  }

  return (
    <div className="app-container">
      <FloatingClouds />

      <TitleBar
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
      />

      {/* 草地装饰 - 顶部 */}
      <div className="grass-decor-top">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="grass-blade"
            style={{
              animationDelay: `${i * 0.15}s`,
              height: `${6 + Math.random() * 14}px`,
            }}
          >
            🌱
          </span>
        ))}
      </div>

      {/* 主内容区 */}
      <main className="app-content">{renderTab()}</main>

      {/* 草地装饰 - 底部 */}
      <div className="grass-decor-bottom">
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            className="grass-blade"
            style={{
              animationDelay: `${i * 0.12}s`,
              height: `${8 + Math.random() * 16}px`,
            }}
          >
            🌿
          </span>
        ))}
      </div>

      <BottomBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
