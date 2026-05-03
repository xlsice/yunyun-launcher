import { execSync } from 'child_process'
import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { platform, homedir } from 'os'

// === 接口定义 ===
export interface JavaRuntime {
  path: string
  version: string
  majorVersion: number
  is64bit: boolean
}

// ============================================================
//  主入口：查找所有可用的 Java 运行时
// ============================================================
export function findJavaRuntimes(): JavaRuntime[] {
  const found: Map<string, JavaRuntime> = new Map()
  const currentOS = platform()

  // 1. 检查 PATH 中的 java
  checkPathJava(found, currentOS)

  // 2. 操作系统特定的扫描路径
  if (currentOS === 'win32') {
    scanWindowsPaths(found)
  } else {
    scanUnixPaths(found)
  }

  // 3. 转换为数组并排序
  const results = Array.from(found.values())
  return sortRuntimes(results)
}

// ============================================================
//  检查 PATH 环境变量中的 java
// ============================================================
function checkPathJava(found: Map<string, JavaRuntime>, currentOS: string): void {
  const javaNames = currentOS === 'win32' ? ['java.exe', 'javaw.exe'] : ['java']
  const pathDirs = (process.env.PATH || '').split(currentOS === 'win32' ? ';' : ':')

  for (const dir of pathDirs) {
    for (const javaName of javaNames) {
      const javaPath = join(dir, javaName)
      if (existsSync(javaPath) && !found.has(javaPath)) {
        const rt = probeJavaRuntime(javaPath)
        if (rt) {
          found.set(javaPath, rt)
        }
      }
    }
  }
}

// ============================================================
//  Windows 路径扫描
// ============================================================
function scanWindowsPaths(found: Map<string, JavaRuntime>): void {
  const scanDirs = [
    'C:\\Program Files\\Java',
    'C:\\Program Files (x86)\\Java',
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Eclipse Foundation',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\Zulu',
    'C:\\Program Files\\BellSoft',
    'C:\\Program Files\\Amazon Corretto',
    'C:\\Program Files\\GraalVM',
    'C:\\Program Files\\ojdkbuild',
    join(homedir(), '.jdks'),
    join(homedir(), '.sdkman', 'candidates', 'java'),
  ]

  for (const dir of scanDirs) {
    if (!existsSync(dir)) continue
    scanJavaDir(dir, found)
  }

  // 尝试通过 where 命令查找
  try {
    const whereOutput = execSync('where java 2>nul', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    const lines = whereOutput.split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && existsSync(trimmed) && !found.has(trimmed)) {
        const rt = probeJavaRuntime(trimmed)
        if (rt) found.set(trimmed, rt)
      }
    }
  } catch {
    // where 命令可能失败，忽略
  }
}

// ============================================================
//  Linux/macOS 路径扫描
// ============================================================
function scanUnixPaths(found: Map<string, JavaRuntime>): void {
  const scanDirs = [
    '/usr/lib/jvm',
    '/usr/local/lib/jvm',
    '/usr/local/java',
    '/opt/java',
    '/opt/jdk',
    '/Library/Java/JavaVirtualMachines',
    join(homedir(), '.jdks'),
    join(homedir(), '.sdkman', 'candidates', 'java'),
  ]

  for (const dir of scanDirs) {
    if (!existsSync(dir)) continue
    scanJavaDir(dir, found)
  }

  // macOS: 通过 java_home 命令查找
  if (platform() === 'darwin') {
    try {
      const output = execSync('/usr/libexec/java_home -V 2>&1', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      const matches = output.matchAll(/\n\s*(\/[^\s]+)/g)
      for (const m of matches) {
        const jdkDir = m[1].trim()
        const javaBin = join(jdkDir, 'bin', 'java')
        if (existsSync(javaBin) && !found.has(javaBin)) {
          const rt = probeJavaRuntime(javaBin)
          if (rt) found.set(javaBin, rt)
        }
      }
    } catch {
      // 忽略
    }
  }
}

// ============================================================
//  递归扫描目录寻找 JDK 根目录
// ============================================================
function scanJavaDir(
  dir: string,
  found: Map<string, JavaRuntime>,
  depth: number = 0
): void {
  if (depth > 3) return

  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    try {
      const stat = statSync(fullPath)
      if (!stat.isDirectory()) continue
    } catch {
      continue
    }

    // 检查是否有 bin 子目录（JDK/JRE 根目录特征）
    const binDir = join(fullPath, 'bin')
    const javaExe =
      platform() === 'win32'
        ? join(binDir, 'java.exe')
        : join(binDir, 'java')

    if (existsSync(javaExe) && !found.has(javaExe)) {
      const rt = probeJavaRuntime(javaExe)
      if (rt) found.set(javaExe, rt)
    }

    // Windows 也检查 javaw.exe
    if (platform() === 'win32') {
      const javaWExe = join(binDir, 'javaw.exe')
      if (existsSync(javaWExe) && !found.has(javaWExe)) {
        const rt = probeJavaRuntime(javaWExe)
        if (rt) found.set(javaWExe, rt)
      }
    }

    // 继续递归子目录
    scanJavaDir(fullPath, found, depth + 1)
  }
}

// ============================================================
//  执行 java -version 并解析输出
//  Java 将版本信息写入 stderr，使用 2>&1 重定向
// ============================================================
function probeJavaRuntime(javaPath: string): JavaRuntime | null {
  try {
    const output = execSync(`"${javaPath}" -version 2>&1`, {
      encoding: 'utf-8',
      timeout: 15000,
    })

    return parseJavaVersion(javaPath, output)
  } catch {
    return null
  }
}

// ============================================================
//  解析 java -version 输出
//  示例 (Java 9+):
//    openjdk version "21.0.1" 2023-10-17
//    OpenJDK Runtime Environment (build 21.0.1+12)
//    OpenJDK 64-Bit Server VM (build 21.0.1+12, mixed mode, sharing)
//  示例 (Java 8):
//    java version "1.8.0_202"
//    Java(TM) SE Runtime Environment (build 1.8.0_202-b08)
//    Java HotSpot(TM) 64-Bit Server VM (build 25.202-b08, mixed mode)
// ============================================================
function parseJavaVersion(
  javaPath: string,
  output: string
): JavaRuntime | null {
  // 提取版本号字符串
  const versionMatch = output.match(/version\s+"([^"]+)"/)
  if (!versionMatch) return null

  const versionStr = versionMatch[1]

  // 解析主版本号
  let majorVersion = 0

  if (versionStr.startsWith('1.')) {
    // Java 8 及以下: "1.8.0_202" → 8
    const parts = versionStr.split('.')
    if (parts.length >= 2) {
      majorVersion = parseInt(parts[1], 10)
    }
  } else {
    // Java 9+: "21.0.1" → 21
    const firstNum = versionStr.match(/^(\d+)/)
    if (firstNum) {
      majorVersion = parseInt(firstNum[1], 10)
    }
  }

  if (majorVersion === 0 || isNaN(majorVersion)) return null

  // 检查 64 位
  const is64bit =
    output.includes('64-Bit') ||
    output.includes('64-bit') ||
    output.includes('x86_64') ||
    output.includes('amd64')

  return {
    path: javaPath,
    version: versionStr,
    majorVersion,
    is64bit,
  }
}

// ============================================================
//  排序：按版本从高到低，优先 64 位
// ============================================================
function sortRuntimes(runtimes: JavaRuntime[]): JavaRuntime[] {
  return runtimes.sort((a, b) => {
    // 优先 64 位
    if (a.is64bit && !b.is64bit) return -1
    if (!a.is64bit && b.is64bit) return 1
    // 版本从高到低
    return b.majorVersion - a.majorVersion
  })
}
