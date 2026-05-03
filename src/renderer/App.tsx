import React, { useState, useEffect, useCallback, useRef } from 'react'

// ====== 类型定义 ======
type TabKey = 'home' | 'shop' | 'events' | 'lottery' | 'profile'

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

interface YunYunAuth {
  nickname: string
  uuid: string
  token: string
  expires: number
}

const tabs: TabDef[] = [
  { key: 'home', label: '首页', emoji: '🏠' },
  { key: 'shop', label: '商城', emoji: '🛒' },
  { key: 'events', label: '活动', emoji: '🎁' },
  { key: 'lottery', label: '抽奖', emoji: '🎰' },
  { key: 'profile', label: '我的', emoji: '👤' },
]

// ====== Toast 提示 ======
function Toast({
  message,
  type,
  onDone,
}: {
  message: string
  type: 'success' | 'error' | 'info'
  onDone: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className={`toast toast-${type}`}>
      <span>
        {type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
      </span>
      <span>{message}</span>
    </div>
  )
}

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
  yunyunAuth,
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
  yunyunAuth: YunYunAuth | null
}) {
  const releaseVersions = versions.filter((v) => v.type === 'release')
  const snapshotVersions = versions.filter((v) => v.type === 'snapshot')

  return (
    <div className="home-tab">
      {/* Logo & 服务器名 */}
      <div className="home-hero">
        <div className="home-logo">☁️</div>
        <h1 className="home-server-name pixel-font">云云服务器</h1>
        <p className="home-subtitle">YunYun Minecraft Server</p>
      </div>

      {/* 登录状态栏 */}
      <div className="auth-status-bar">
        <div className="auth-status-item">
          <span className="auth-label">微软</span>
          {authResult ? (
            <span className="auth-value auth-ok">
              {authResult.username}
            </span>
          ) : (
            <span className="auth-value auth-none">未登录</span>
          )}
        </div>
        <div className="auth-divider">|</div>
        <div className="auth-status-item">
          <span className="auth-label">云云</span>
          {yunyunAuth ? (
            <span className="auth-value auth-ok">
              {yunyunAuth.nickname}
            </span>
          ) : (
            <span className="auth-value auth-none">未登录</span>
          )}
        </div>
      </div>

      {/* 微软登录区域 */}
      <div className="home-login-section">
        {authResult ? (
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
              切换
            </button>
          </div>
        ) : isLoggingIn ? (
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
          <button className="login-btn pixel-btn" onClick={onLogin}>
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

        <div className="setting-row">
          <label className="setting-label">Java 环境</label>
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
                  {j.is64bit ? ' 64位' : ' 32位'}
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
            title="重新检测"
          >
            🔄
          </button>
        </div>

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

      {/* 启动/下载 */}
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
              !authResult || !selectedVersion || !selectedJava
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

// ====== 商城 Tab (webview) ======
function ShopTab({ yunyunAuth }: { yunyunAuth: YunYunAuth | null }) {
  const webviewRef = useRef<any>(null)

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv || !yunyunAuth) return

    const handleDomReady = () => {
      try {
        wv.executeJavaScript(`
          window.__YUNYUN_AUTH__ = ${JSON.stringify(yunyunAuth)};
          window.dispatchEvent(new CustomEvent('yunyun-auth-ready', { detail: ${JSON.stringify(yunyunAuth)} }));
        `)
      } catch {}
    }

    wv.addEventListener('dom-ready', handleDomReady)
    return () => wv.removeEventListener('dom-ready', handleDomReady)
  }, [yunyunAuth])

  return (
    <div className="shop-tab">
      <webview
        ref={webviewRef}
        src="https://shimoray.com/yunyun-shop/"
        className="shop-webview"
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
        // @ts-ignore webview 属性
        allowpopups="false"
      />
    </div>
  )
}

// ====== 活动 Tab ======
function EventsTab({
  yunyunAuth,
  showToast,
}: {
  yunyunAuth: YunYunAuth | null
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
}) {
  const [checkinStatus, setCheckinStatus] = useState<{
    checked: boolean
    streak: number
  } | null>(null)
  const [points, setPoints] = useState<{
    points: number
    totalEarned: number
    totalSpent: number
  } | null>(null)
  const [logs, setLogs] = useState<
    Array<{ amount: number; reason: string; createdAt: string }>
  >([])
  const [checkingIn, setCheckingIn] = useState(false)
  const [loading, setLoading] = useState(true)

  // 加载数据
  const loadData = useCallback(async () => {
    if (!yunyunAuth) {
      setLoading(false)
      return
    }
    const api = window.yunyunLauncher
    if (!api) return

    setLoading(true)
    try {
      const [statusRes, pointsRes, logsRes] = await Promise.all([
        api.yunyunCheckInStatus(yunyunAuth.uuid, yunyunAuth.token),
        api.yunyunGetPoints(yunyunAuth.uuid, yunyunAuth.token),
        api.yunyunGetLogs(yunyunAuth.uuid, yunyunAuth.token),
      ])

      if (statusRes.success && statusRes.data) {
        setCheckinStatus(statusRes.data)
      }
      if (pointsRes.success && pointsRes.data) {
        setPoints(pointsRes.data)
      }
      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data.slice(0, 20))
      }
    } catch {}
    setLoading(false)
  }, [yunyunAuth])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCheckIn = async () => {
    if (!yunyunAuth || checkingIn) return
    const api = window.yunyunLauncher
    if (!api) return

    setCheckingIn(true)
    try {
      const res = await api.yunyunCheckIn(
        yunyunAuth.uuid,
        yunyunAuth.token
      )
      if (res.success && res.data) {
        showToast(
          `签到成功！+${res.data.points} 积分${
            res.data.isWeekBonus ? ' (周奖励加成!)' : ''
          }`,
          'success'
        )
        // 刷新
        await loadData()
      } else {
        showToast(res.error || '签到失败', 'error')
      }
    } catch {
      showToast('签到失败，请重试', 'error')
    }
    setCheckingIn(false)
  }

  if (!yunyunAuth) {
    return (
      <div className="events-tab">
        <h2 className="tab-title">🎁 活动中心</h2>
        <div className="empty-state">
          <span className="empty-emoji">🔐</span>
          <p className="pixel-font">请先在「我的」页面登录云云账号</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="events-tab">
        <h2 className="tab-title">🎁 活动中心</h2>
        <div className="empty-state">
          <span className="empty-emoji">⏳</span>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  const streak = checkinStatus?.streak || 0
  const checked = checkinStatus?.checked || false

  return (
    <div className="events-tab">
      <h2 className="tab-title">🎁 活动中心</h2>

      {/* 每日签到卡 */}
      <div className="event-card checkin-card">
        <div className="checkin-header">
          <span className="checkin-title">📅 每日签到</span>
          <span className="checkin-streak">
            连续 <strong>{streak}</strong> 天
          </span>
        </div>

        {/* 7 天进度条 */}
        <div className="streak-dots">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <div
              key={day}
              className={`streak-dot ${day <= streak ? 'filled' : ''} ${day === 7 ? 'bonus' : ''}`}
              title={day === 7 ? '周奖励' : `第 ${day} 天`}
            >
              {day === 7 ? '🎁' : day}
            </div>
          ))}
        </div>

        <button
          className={`checkin-btn pixel-btn ${checked ? 'checked' : ''}`}
          onClick={handleCheckIn}
          disabled={checked || checkingIn}
        >
          {checked
            ? '✅ 今日已签到'
            : checkingIn
            ? '签到中...'
            : '签到 +300'}
        </button>
        {checked && (
          <p className="checkin-done-text">明天再来吧~</p>
        )}
      </div>

      {/* 积分面板 */}
      <div className="event-card points-card">
        <div className="points-main">
          <span className="points-label">当前积分</span>
          <span className="points-value">{points?.points ?? 0}</span>
        </div>
        <div className="points-detail">
          <div className="points-detail-item">
            <span className="points-detail-label">累计获得</span>
            <span className="points-detail-value earn">
              +{points?.totalEarned ?? 0}
            </span>
          </div>
          <div className="points-divider" />
          <div className="points-detail-item">
            <span className="points-detail-label">累计消费</span>
            <span className="points-detail-value spend">
              -{points?.totalSpent ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* 积分流水 */}
      <div className="event-card logs-card">
        <h3 className="logs-title">📋 积分流水</h3>
        {logs.length > 0 ? (
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>详情</th>
                  <th>变动</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i}>
                    <td className="log-time">
                      {new Date(log.createdAt).toLocaleString(
                        'zh-CN',
                        {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </td>
                    <td className="log-reason">{log.reason}</td>
                    <td
                      className={`log-amount ${log.amount >= 0 ? 'positive' : 'negative'}`}
                    >
                      {log.amount >= 0
                        ? `+${log.amount}`
                        : log.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-mid logs-empty">暂无记录</p>
        )}
      </div>
    </div>
  )
}

// ====== 抽奖 Tab ======
function LotteryTab({
  yunyunAuth,
  showToast,
}: {
  yunyunAuth: YunYunAuth | null
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
}) {
  const [drawing, setDrawing] = useState(false)
  const [lastResult, setLastResult] = useState<{
    prizeName: string
    prizeType: string
  } | null>(null)
  const [history, setHistory] = useState<
    Array<{ prizeName: string; prizeType: string; createdAt: string }>
  >([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!yunyunAuth) return
    const api = window.yunyunLauncher
    if (!api) return

    setLoadingHistory(true)
    try {
      const res = await api.yunyunGetLotteryHistory(
        yunyunAuth.uuid,
        yunyunAuth.token
      )
      if (res.success && res.data) {
        setHistory(res.data.slice(0, 10))
      }
    } catch {}
    setLoadingHistory(false)
  }, [yunyunAuth])

  useEffect(() => {
    if (yunyunAuth) loadHistory()
  }, [loadHistory, yunyunAuth])

  const handleDraw = async () => {
    if (!yunyunAuth || drawing) return
    const api = window.yunyunLauncher
    if (!api) return

    setDrawing(true)
    setLastResult(null)

    try {
      const res = await api.yunyunDrawLottery(
        yunyunAuth.uuid,
        yunyunAuth.token,
        100
      )
      if (res.success && res.data) {
        setLastResult(res.data)
        showToast(
          `抽到: ${res.data.prizeName} (${res.data.prizeType})`,
          'success'
        )
        await loadHistory()
      } else {
        showToast(res.error || '抽奖失败', 'error')
      }
    } catch {
      showToast('抽奖失败，请重试', 'error')
    }
    setDrawing(false)
  }

  if (!yunyunAuth) {
    return (
      <div className="lottery-tab">
        <h2 className="tab-title">🎰 幸运抽奖</h2>
        <div className="empty-state">
          <span className="empty-emoji">🔐</span>
          <p className="pixel-font">请先在「我的」页面登录云云账号</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lottery-tab">
      <h2 className="tab-title">🎰 幸运抽奖</h2>

      {/* 抽奖机 */}
      <div className="lottery-machine">
        <div className="lottery-display">
          {drawing ? (
            <div className="lottery-spinning">
              <span className="lottery-spin-icon">🎰</span>
              <p>抽奖中...</p>
            </div>
          ) : lastResult ? (
            <div className="lottery-result">
              <span className="lottery-prize-icon">
                {lastResult.prizeType === 'title'
                  ? '🏷️'
                  : lastResult.prizeType === 'effect'
                  ? '✨'
                  : '🎁'}
              </span>
              <p className="lottery-prize-name pixel-font">
                {lastResult.prizeName}
              </p>
              <p className="lottery-prize-type">
                {lastResult.prizeType}
              </p>
            </div>
          ) : (
            <div className="lottery-idle">
              <span className="lottery-idle-icon">🎰</span>
              <p>消耗 100 积分</p>
              <p className="text-mid">试试手气!</p>
            </div>
          )}
        </div>

        <button
          className="lottery-draw-btn pixel-btn"
          onClick={handleDraw}
          disabled={drawing}
        >
          {drawing ? '🎰 抽奖中...' : '🎰 开始抽奖 (100积分)'}
        </button>
      </div>

      {/* 抽奖记录 */}
      <div className="event-card lottery-history-card">
        <h3 className="logs-title">📜 抽奖记录</h3>
        {loadingHistory ? (
          <p className="text-mid">加载中...</p>
        ) : history.length > 0 ? (
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>奖品</th>
                  <th>类型</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td className="log-time">
                      {new Date(h.createdAt).toLocaleString(
                        'zh-CN',
                        {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </td>
                    <td className="log-reason">{h.prizeName}</td>
                    <td className="log-amount">{h.prizeType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-mid logs-empty">暂无抽奖记录</p>
        )}
      </div>
    </div>
  )
}

// ====== 我的 Tab ======
function ProfileTab({
  authResult,
  yunyunAuth,
  onYunYunAuthChange,
  showToast,
}: {
  authResult: AuthResult | null
  yunyunAuth: YunYunAuth | null
  onYunYunAuthChange: (auth: YunYunAuth | null) => void
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
}) {
  const [loginStep, setLoginStep] = useState<'idle' | 'nickname' | 'code'>(
    'idle'
  )
  const [nickname, setNickname] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const displayName = authResult?.username || '未登录'
  const displayUuid = authResult?.uuid || '---'

  // 请求验证码
  const handleRequestCode = async () => {
    if (!nickname.trim()) {
      setLoginError('请输入昵称')
      return
    }
    const api = window.yunyunLauncher
    if (!api) return

    setLoginLoading(true)
    setLoginError(null)

    try {
      const res = await api.yunyunLogin(nickname.trim())
      if (res.success) {
        setLoginStep('code')
        showToast('验证码已发送，请在游戏中输入', 'info')
      } else {
        setLoginError(res.error || '请求失败')
      }
    } catch (err: any) {
      setLoginError(err.message || '请求失败')
    }
    setLoginLoading(false)
  }

  // 确认验证码
  const handleVerify = async () => {
    if (!verifyCode.trim() || verifyCode.trim().length !== 6) {
      setLoginError('请输入6位验证码')
      return
    }
    const api = window.yunyunLauncher
    if (!api) return

    setLoginLoading(true)
    setLoginError(null)

    try {
      const res = await api.yunyunVerify(
        nickname.trim(),
        verifyCode.trim()
      )
      if (res.success && res.data) {
        const auth = res.data
        await api.yunyunSetAuth(auth)
        onYunYunAuthChange(auth)
        showToast(`登录成功！欢迎 ${auth.nickname}`, 'success')
        setLoginStep('idle')
        setNickname('')
        setVerifyCode('')
      } else {
        setLoginError(res.error || '验证失败')
      }
    } catch (err: any) {
      setLoginError(err.message || '验证失败')
    }
    setLoginLoading(false)
  }

  // 退出云云登录
  const handleLogout = async () => {
    const api = window.yunyunLauncher
    if (!api) return
    await api.yunyunClearAuth()
    onYunYunAuthChange(null)
    showToast('已退出云云登录', 'info')
  }

  const handleCancel = () => {
    setLoginStep('idle')
    setNickname('')
    setVerifyCode('')
    setLoginError(null)
  }

  return (
    <div className="profile-tab">
      <h2 className="tab-title">👤 我的</h2>

      {/* 微软账号信息 */}
      <div className="event-card profile-info-card">
        <h3 className="profile-section-title">微软账号</h3>
        <div className="profile-info-row">
          <span className="profile-info-label">用户名</span>
          <span className="profile-info-value pixel-font">
            {displayName}
          </span>
        </div>
        <div className="profile-info-row">
          <span className="profile-info-label">UUID</span>
          <span className="profile-info-value uuid-text">
            {displayUuid}
          </span>
        </div>
      </div>

      {/* 云云账号信息 */}
      <div className="event-card profile-info-card">
        <h3 className="profile-section-title">云云账号</h3>
        {yunyunAuth ? (
          <>
            <div className="profile-info-row">
              <span className="profile-info-label">昵称</span>
              <span className="profile-info-value pixel-font">
                {yunyunAuth.nickname}
              </span>
            </div>
            <div className="profile-info-row">
              <span className="profile-info-label">UUID</span>
              <span className="profile-info-value uuid-text">
                {yunyunAuth.uuid}
              </span>
            </div>
            <button
              className="logout-btn yunyun-logout-btn"
              onClick={handleLogout}
            >
              退出云云登录
            </button>
          </>
        ) : (
          <div className="yunyun-login-form">
            {loginStep === 'idle' && (
              <>
                <p className="text-mid login-hint">
                  登录云云账号以使用积分、商城等功能
                </p>
                <button
                  className="pixel-btn yunyun-login-start-btn"
                  onClick={() => setLoginStep('nickname')}
                >
                  ☁️ 登录云云账号
                </button>
              </>
            )}

            {loginStep === 'nickname' && (
              <div className="login-form-inner">
                <label className="login-form-label">输入你的游戏昵称</label>
                <input
                  className="login-form-input"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="游戏内昵称"
                  maxLength={32}
                  autoFocus
                />
                <div className="login-form-actions">
                  <button
                    className="cancel-login-btn"
                    onClick={handleCancel}
                  >
                    取消
                  </button>
                  <button
                    className="pixel-btn"
                    onClick={handleRequestCode}
                    disabled={loginLoading || !nickname.trim()}
                  >
                    {loginLoading ? '发送中...' : '获取验证码'}
                  </button>
                </div>
              </div>
            )}

            {loginStep === 'code' && (
              <div className="login-form-inner">
                <label className="login-form-label">
                  请在游戏中输入 <code>/verify</code> 查看验证码
                </label>
                <input
                  className="login-form-input"
                  type="text"
                  value={verifyCode}
                  onChange={(e) =>
                    setVerifyCode(
                      e.target.value.replace(/\D/g, '').slice(0, 6)
                    )
                  }
                  placeholder="输入6位验证码"
                  maxLength={6}
                  autoFocus
                />
                <div className="login-form-actions">
                  <button
                    className="cancel-login-btn"
                    onClick={handleCancel}
                  >
                    取消
                  </button>
                  <button
                    className="pixel-btn"
                    onClick={handleVerify}
                    disabled={loginLoading || verifyCode.length !== 6}
                  >
                    {loginLoading ? '验证中...' : '确认登录'}
                  </button>
                </div>
              </div>
            )}

            {loginError && (
              <p className="login-error profile-login-error">
                ⚠ {loginError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 版权 */}
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

  // --- 微软认证 ---
  const [authResult, setAuthResult] = useState<AuthResult | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [deviceCode, setDeviceCode] = useState<string | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)
  const pollingRef = useRef(false)

  // --- 云云认证 ---
  const [yunyunAuth, setYunyunAuth] = useState<YunYunAuth | null>(null)

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

  // --- Toast ---
  const [toasts, setToasts] = useState<
    Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>
  >([])
  const toastIdRef = useRef(0)

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      const id = ++toastIdRef.current
      setToasts((prev) => [...prev, { id, message, type }])
    },
    []
  )

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // =============================================
  //  初始化
  // =============================================
  useEffect(() => {
    loadVersions()
    loadJavaRuntimes()
    loadYunYunAuth()
  }, [])

  const loadVersions = async () => {
    const api = window.yunyunLauncher
    if (!api) return
    const result = await api.fetchVersions()
    if (result.success && result.data) {
      setVersions(result.data)
      const latestRelease = result.data
        .filter((v: VersionInfo) => v.type === 'release')
        .sort(
          (a: VersionInfo, b: VersionInfo) =>
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

  const loadYunYunAuth = async () => {
    const api = window.yunyunLauncher
    if (!api) return
    const auth = await api.yunyunGetAuth()
    if (auth) {
      setYunyunAuth(auth)
    }
  }

  // =============================================
  //  微软登录
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
      pollingRef.current = true

      const authResult = await api.pollForToken(
        dc.userCode,
        dc.interval
      )

      if (!pollingRef.current) return

      if (!authResult.success) {
        setLoginError(authResult.error || '登录失败')
        setIsLoggingIn(false)
        setDeviceCode(null)
        return
      }

      setAuthResult(authResult.data!)
      setIsLoggingIn(false)
      setDeviceCode(null)

      try {
        localStorage.setItem(
          'yunyun_refresh_token',
          authResult.data!.refreshToken
        )
      } catch {}

      showToast(`欢迎 ${authResult.data!.username}`, 'success')
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

    const gameDir = localStorage.getItem('yunyun_game_dir') || '.minecraft'

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

    setIsLaunching(true)
    setLaunchLogs([])
    setActiveTab('home')

    const unsubLog = api.onLaunchLog((line) => {
      setLaunchLogs((prev) => {
        const next = [...prev, line]
        if (next.length > 500) return next.slice(next.length - 500)
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
      gameDir,
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
  //  云云认证回调
  // =============================================
  const handleYunYunAuthChange = useCallback(
    (auth: YunYunAuth | null) => {
      setYunyunAuth(auth)
    },
    []
  )

  // =============================================
  //  渲染 Tab
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
              if (v === '__refresh__') loadJavaRuntimes()
              else setSelectedJava(v)
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
            yunyunAuth={yunyunAuth}
          />
        )
      case 'shop':
        return <ShopTab yunyunAuth={yunyunAuth} />
      case 'events':
        return <EventsTab yunyunAuth={yunyunAuth} showToast={showToast} />
      case 'lottery':
        return (
          <LotteryTab yunyunAuth={yunyunAuth} showToast={showToast} />
        )
      case 'profile':
        return (
          <ProfileTab
            authResult={authResult}
            yunyunAuth={yunyunAuth}
            onYunYunAuthChange={handleYunYunAuthChange}
            showToast={showToast}
          />
        )
      default:
        return null
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

      {/* Toast 层 */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <Toast
              key={t.id}
              message={t.message}
              type={t.type}
              onDone={() => dismissToast(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
