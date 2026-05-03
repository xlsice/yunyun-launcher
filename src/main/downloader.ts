import fetch from 'node-fetch'
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

// ============================================================
//  BMCLAPI 镜像基础 URL
// ============================================================
const MOJANG_MANIFEST =
  'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
const BMCLAPI_BASE = 'https://bmclapi2.bangbang93.com'

// ============================================================
//  接口定义
// ============================================================
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

// ============================================================
//  获取版本 Manifest
// ============================================================
export async function fetchVersionManifest(): Promise<VersionInfo[]> {
  const res = await fetch(MOJANG_MANIFEST)
  if (!res.ok) {
    throw new Error(`获取版本清单失败 (${res.status})`)
  }
  const data = (await res.json()) as any

  return data.versions.map((v: any) => ({
    id: v.id,
    type: v.type,
    url: v.url,
    releaseTime: v.releaseTime,
  }))
}

// ============================================================
//  下载版本文件（json + libraries + assets + client.jar）
// ============================================================
export async function downloadVersion(
  versionId: string,
  gameDir: string,
  onProgress: (p: DownloadProgress) => void
): Promise<void> {
  // 确保目录存在
  const versionsDir = join(gameDir, 'versions', versionId)
  const librariesDir = join(gameDir, 'libraries')
  const assetsDir = join(gameDir, 'assets')
  mkdirSync(versionsDir, { recursive: true })
  mkdirSync(librariesDir, { recursive: true })
  mkdirSync(assetsDir, { recursive: true })

  // 1. 获取 Version Manifest → 找到对应版本的 URL
  const manifest = await fetchVersionManifest()
  const versionEntry = manifest.find((v) => v.id === versionId)
  if (!versionEntry) {
    throw new Error(`未找到版本: ${versionId}`)
  }

  // 2. 下载版本 JSON
  onProgress({
    downloaded: 0,
    total: 100,
    percentage: 0,
    currentFile: 'version.json',
    speed: '...',
  })

  const versionJsonRes = await fetch(versionEntry.url)
  if (!versionJsonRes.ok) {
    throw new Error(`下载版本 JSON 失败 (${versionJsonRes.status})`)
  }
  const versionJson = (await versionJsonRes.json()) as any

  // 保存版本 JSON
  const versionJsonPath = join(versionsDir, `${versionId}.json`)
  writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2))

  // 3. 收集下载任务
  interface DownloadTask {
    url: string
    path: string
    name: string
    size?: number
    sha1?: string
  }

  const tasks: DownloadTask[] = []

  // 3a. Libraries
  for (const lib of versionJson.libraries || []) {
    // 检查平台兼容性
    if (lib.rules && !checkRules(lib.rules)) continue

    const artifact = lib.downloads?.artifact
    if (artifact) {
      const libPath = join(librariesDir, artifact.path)
      const libDir = dirname(libPath)
      mkdirSync(libDir, { recursive: true })

      if (!existsSync(libPath)) {
        tasks.push({
          url: artifact.url,
          path: libPath,
          name: artifact.path,
          size: artifact.size,
          sha1: artifact.sha1,
        })
      }
    }

    // Natives（平台相关的 native 库）
    if (lib.natives) {
      const osName = getOsName()
      const nativeKey = lib.natives[osName]
      if (nativeKey) {
        const classifier = lib.downloads?.classifiers?.[nativeKey]
        if (classifier) {
          const nativePath = join(librariesDir, classifier.path)
          const nativeDir = dirname(nativePath)
          mkdirSync(nativeDir, { recursive: true })

          if (!existsSync(nativePath)) {
            tasks.push({
              url: classifier.url,
              path: nativePath,
              name: classifier.path,
              size: classifier.size,
              sha1: classifier.sha1,
            })
          }
        }
      }
    }
  }

  // 3b. Assets（使用 BMCLAPI 镜像）
  const assetIndex = versionJson.assetIndex
  if (assetIndex) {
    onProgress({
      downloaded: 0,
      total: 100,
      percentage: 5,
      currentFile: 'asset index',
      speed: '...',
    })

    // 下载 asset index JSON
    const assetsIndexDir = join(assetsDir, 'indexes')
    mkdirSync(assetsIndexDir, { recursive: true })
    const assetIndexPath = join(assetsIndexDir, `${assetIndex.id}.json`)

    // 使用 BMCLAPI 镜像
    const assetIndexUrl = convertToMirror(assetIndex.url)

    const assetIndexRes = await fetch(assetIndexUrl)
    if (!assetIndexRes.ok) {
      throw new Error(`下载 Asset Index 失败 (${assetIndexRes.status})`)
    }
    const assetIndexData = (await assetIndexRes.json()) as any

    writeFileSync(assetIndexPath, JSON.stringify(assetIndexData, null, 2))

    // 解析 asset objects
    const objectsDir = join(assetsDir, 'objects')
    mkdirSync(objectsDir, { recursive: true })

    for (const [key, obj] of Object.entries(assetIndexData.objects || {})) {
      const assetObj = obj as any
      const hash = assetObj.hash
      const subDir = hash.substring(0, 2)
      const assetPath = join(objectsDir, subDir, hash)
      const assetFileDir = dirname(assetPath)
      mkdirSync(assetFileDir, { recursive: true })

      if (!existsSync(assetPath)) {
        tasks.push({
          url: `https://bmclapi2.bangbang93.com/assets/${subDir}/${hash}`,
          path: assetPath,
          name: `asset:${key}`,
          size: assetObj.size,
          sha1: hash,
        })
      }
    }
  }

  // 3c. Client JAR
  const clientInfo = versionJson.downloads?.client
  if (clientInfo) {
    const clientPath = join(versionsDir, `${versionId}.jar`)
    if (!existsSync(clientPath)) {
      tasks.push({
        url: convertToMirror(clientInfo.url),
        path: clientPath,
        name: `${versionId}.jar`,
        size: clientInfo.size,
        sha1: clientInfo.sha1,
      })
    }
  }

  // 4. 下载所有任务（最多 8 个并发）
  const totalTasks = tasks.length
  if (totalTasks === 0) {
    onProgress({
      downloaded: 100,
      total: 100,
      percentage: 100,
      currentFile: '完成',
      speed: '0 B/s',
    })
    return
  }

  let completed = 0
  let totalBytes = 0
  const startTime = Date.now()

  // 并发控制
  const concurrency = 8
  const queue = [...tasks]

  const downloadTask = async (task: DownloadTask): Promise<void> => {
    try {
      const res = await fetch(task.url)
      if (!res.ok) {
        throw new Error(`下载失败 ${task.name}: ${res.status}`)
      }

      const fileStream = createWriteStream(task.path)
      await streamPipeline(res.body!, fileStream)

      completed++
      totalBytes += task.size || 0
      const elapsed = (Date.now() - startTime) / 1000
      const speed =
        elapsed > 0 ? formatBytes(totalBytes / elapsed) + '/s' : '...'

      onProgress({
        downloaded: completed,
        total: totalTasks,
        percentage: Math.round((completed / totalTasks) * 100),
        currentFile: task.name.split('/').pop() || task.name,
        speed,
      })
    } catch (err: any) {
      // 尝试镜像 URL（如果是 Mojang 原始 URL）
      if (!task.url.includes('bmclapi2.bangbang93.com')) {
        const mirrorUrl = convertToMirror(task.url)
        const mirrorRes = await fetch(mirrorUrl)
        if (mirrorRes.ok) {
          const fileStream = createWriteStream(task.path)
          await streamPipeline(mirrorRes.body!, fileStream)

          completed++
          totalBytes += task.size || 0
          const elapsed = (Date.now() - startTime) / 1000
          const speed =
            elapsed > 0 ? formatBytes(totalBytes / elapsed) + '/s' : '...'

          onProgress({
            downloaded: completed,
            total: totalTasks,
            percentage: Math.round((completed / totalTasks) * 100),
            currentFile: task.name.split('/').pop() || task.name,
            speed,
          })
          return
        }
      }

      throw new Error(`下载失败 ${task.name}: ${err.message}`)
    }
  }

  // 并发执行
  const workers: Promise<void>[] = []
  for (let i = 0; i < concurrency && queue.length > 0; i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const task = queue.shift()
          if (task) await downloadTask(task)
        }
      })()
    )
  }

  await Promise.all(workers)
}

// ============================================================
//  检查 rules 规则（用于 libraries 的 platform 过滤）
// ============================================================
function checkRules(rules: any[]): boolean {
  let allowed = true

  for (const rule of rules) {
    const action = rule.action // "allow" | "disallow"
    const os = rule.os

    if (!os) {
      if (action === 'allow') allowed = true
      if (action === 'disallow') allowed = false
      continue
    }

    const osMatches = matchOs(os)
    if (osMatches) {
      if (action === 'allow') allowed = true
      if (action === 'disallow') allowed = false
    }
  }

  return allowed
}

function matchOs(osRule: { name?: string; version?: string }): boolean {
  const currentOs = getOsName()
  if (osRule.name && osRule.name !== currentOs) return false
  // 简单的版本匹配（如果需要的话）
  if (osRule.version) {
    const osVersion = process.getSystemVersion?.() || ''
    if (!osVersion.match(new RegExp(osRule.version))) return false
  }
  return true
}

// ============================================================
//  获取当前操作系统名称（Mojang 风格的名称）
// ============================================================
function getOsName(): string {
  const p = process.platform
  if (p === 'win32') return 'windows'
  if (p === 'darwin') return 'osx'
  return 'linux'
}

// ============================================================
//  将 Mojang URL 转换为 BMCLAPI 镜像 URL
// ============================================================
function convertToMirror(url: string): string {
  return url
    .replace('https://launcher.mojang.com', BMCLAPI_BASE)
    .replace('https://launchermeta.mojang.com', BMCLAPI_BASE)
    .replace('https://piston-meta.mojang.com', BMCLAPI_BASE)
    .replace('https://resources.download.minecraft.net', BMCLAPI_BASE)
    .replace('https://libraries.minecraft.net', `${BMCLAPI_BASE}/libraries`)
    .replace(
      'https://maven.minecraftforge.net',
      `${BMCLAPI_BASE}/maven`
    )
}

// ============================================================
//  格式化字节
// ============================================================
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(1)} ${units[i]}`
}
