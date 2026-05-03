import React, { useState, useEffect, useCallback } from 'react'

// ====== Tab 类型 ======
type TabKey = 'home' | 'shop' | 'mod' | 'profile' | 'settings'

interface TabDef {
  key: TabKey
  label: string
  emoji: string
}

const tabs: TabDef[] = [
  { key: 'home', label: '首页', emoji: '🏠' },
  { key: 'shop', label: '商城', emoji: '🛒' },
  { key: 'mod', label: 'Mod', emoji: '📦' },
  { key: 'profile', label: '我的', emoji: '👤' },
  { key: 'settings', label: '设置', emoji: '⚙️' },
]

// ====== 子页面组件 ======

function HomeTab() {
  return (
    <div className="home-tab">
      {/* Logo & 服务器名 */}
      <div className="home-hero">
        <div className="home-logo">☁️</div>
        <h1 className="home-server-name pixel-font">云云服务器</h1>
        <p className="home-subtitle">YunYun Minecraft Server</p>
      </div>

      {/* 启动按钮 */}
      <button className="launch-btn pixel-btn pulse-glow">
        <span className="launch-icon">▶</span>
        启动游戏
      </button>

      <p className="home-version">Minecraft 1.21 · Fabric</p>

      {/* 快捷信息 */}
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
    </div>
  )
}

function ShopTab() {
  return (
    <div className="shop-tab">
      <h2 className="tab-title">🛒 云云商城</h2>
      <p className="tab-desc">在游戏内使用金币购买称号、粒子特效和装饰道具</p>
      <div className="shop-placeholder">
        <div className="shop-cloud-anim">☁️</div>
        <p className="pixel-font">商城页面正在建设中...</p>
        <p className="text-mid">敬请期待！</p>
      </div>
    </div>
  )
}

function ModTab() {
  return (
    <div className="mod-tab">
      <h2 className="tab-title">📦 Mod 管理</h2>
      <p className="tab-desc">管理和更新你的模组，一键安装云云服务器专属 Mod 包</p>
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
        <button className="pixel-btn mod-install-btn">📥 一键安装 Mod 包</button>
      </div>
    </div>
  )
}

function ProfileTab() {
  return (
    <div className="profile-tab">
      <h2 className="tab-title">👤 我的</h2>
      <div className="profile-card">
        <div className="avatar-placeholder">☁️</div>
        <h3 className="player-name pixel-font">Steve</h3>
        <p className="player-id">UUID: {generateFakeUUID()}</p>
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
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

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
function TitleBar({ onMinimize, onMaximize, onClose }: {
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
        <button className="titlebar-btn minimize" onClick={onMinimize} title="最小化">─</button>
        <button className="titlebar-btn maximize" onClick={onMaximize} title="最大化">□</button>
        <button className="titlebar-btn close" onClick={onClose} title="关闭">✕</button>
      </div>
    </div>
  )
}

// ====== 底栏导航 ======
function BottomBar({ activeTab, onTabChange }: {
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
          {activeTab === tab.key && <span className="bottombar-indicator" />}
        </button>
      ))}
    </nav>
  )
}

// ====== 浮动云朵装饰 ======
function FloatingClouds() {
  const clouds = [
    { emoji: '☁️', top: '8%', left: '5%', size: '2.5rem', duration: '14s', delay: '0s' },
    { emoji: '☁️', top: '15%', left: '60%', size: '2rem', duration: '16s', delay: '3s' },
    { emoji: '☁️', top: '45%', left: '80%', size: '1.8rem', duration: '18s', delay: '6s' },
    { emoji: '☁️', top: '70%', left: '10%', size: '2.2rem', duration: '15s', delay: '2s' },
    { emoji: '⛅', top: '30%', left: '35%', size: '1.6rem', duration: '20s', delay: '8s' },
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

  // 监听窗口最大化状态变化
  useEffect(() => {
    const api = window.yunyunLauncher
    if (!api) return

    // 通过 invoke 轮询窗口状态（简化方案）
    const handleResize = () => {
      // 简单判断：如果窗口宽度接近屏幕宽度，认为最大化了
      setIsMaximized(window.innerWidth >= screen.width - 10)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const renderTab = () => {
    switch (activeTab) {
      case 'home': return <HomeTab />
      case 'shop': return <ShopTab />
      case 'mod': return <ModTab />
      case 'profile': return <ProfileTab />
      case 'settings': return <SettingsTab />
      default: return <HomeTab />
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
          <span key={i} className="grass-blade" style={{ animationDelay: `${i * 0.15}s`, height: `${6 + Math.random() * 14}px` }}>
            🌱
          </span>
        ))}
      </div>

      {/* 主内容区 */}
      <main className="app-content">
        {renderTab()}
      </main>

      {/* 草地装饰 - 底部 */}
      <div className="grass-decor-bottom">
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} className="grass-blade" style={{ animationDelay: `${i * 0.12}s`, height: `${8 + Math.random() * 16}px` }}>
            🌿
          </span>
        ))}
      </div>

      <BottomBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
