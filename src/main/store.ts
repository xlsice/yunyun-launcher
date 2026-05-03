// ============================================================
// 云云启动器 - 持久化存储（electron-store）
// ============================================================
import Store from 'electron-store'

// 云云登录状态存储
export const authStore = new Store({ name: 'yunyun-auth' })

// 启动器设置存储
export const settingsStore = new Store({ name: 'yunyun-settings' })
