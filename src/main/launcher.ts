import { ChildProcess, spawn } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

// === 接口定义 ===
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

// ============================================================
//  启动 Minecraft
// ============================================================
export function launchMinecraft(
  config: LaunchConfig,
  onLog: (line: string) => void,
  onExit: (code: number | null) => void
): ChildProcess {
  // 1. 读取版本 JSON
  const versionJsonPath = join(
    config.gameDir,
    'versions',
    config.versionId,
    `${config.versionId}.json`
  )

  if (!existsSync(versionJsonPath)) {
    throw new Error(`版本 JSON 不存在: ${versionJsonPath}`)
  }

  const versionJson = JSON.parse(readFileSync(versionJsonPath, 'utf-8'))

  // 2. 构建 classpath
  const classpath = buildClasspath(versionJson, config.gameDir)
  const separator = process.platform === 'win32' ? ';' : ':'

  // 3. 构建 JVM 参数
  const jvmArgs = buildJvmArgs(
    config,
    versionJson,
    classpath.join(separator),
    separator
  )

  // 4. 构建 Minecraft Game 参数
  const gameArgs = buildGameArgs(config, versionJson)

  // 5. 合并参数
  // 对于新版本 (1.13+)，versionJson.arguments 包含 jvm 和 game 参数模板
  // 对于旧版本，使用 minecraftArguments 字符串
  const mainClass = versionJson.mainClass || 'net.minecraft.client.main.Main'

  const args: string[] = [...jvmArgs, mainClass, ...gameArgs]

  // 6. 启动进程
  const mcProcess = spawn(config.javaPath, args, {
    cwd: config.gameDir,
    stdio: 'pipe',
    env: {
      ...process.env,
      // 设置 natives 路径（如果需要的话，已在 classpath 中处理）
    },
  })

  // 7. 处理 stdout/stderr
  mcProcess.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().split(/\r?\n/)
    for (const line of lines) {
      if (line.trim()) onLog(line.trim())
    }
  })

  mcProcess.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().split(/\r?\n/)
    for (const line of lines) {
      if (line.trim()) onLog(`[stderr] ${line.trim()}`)
    }
  })

  // 8. 处理进程退出
  mcProcess.on('exit', (code: number | null) => {
    onExit(code)
  })

  mcProcess.on('error', (err: Error) => {
    onLog(`[错误] 无法启动 Minecraft: ${err.message}`)
    onExit(-1)
  })

  return mcProcess
}

// ============================================================
//  终止 Minecraft 进程
// ============================================================
export function killMinecraft(process: ChildProcess): void {
  if (!process.killed) {
    // 先尝试优雅关闭 (SIGTERM)
    process.kill('SIGTERM')

    // 2 秒后强制关闭
    setTimeout(() => {
      if (!process.killed) {
        try {
          process.kill('SIGKILL')
        } catch {
          // 进程可能已经退出
        }
      }
    }, 2000)
  }
}

// ============================================================
//  构建 classpath
// ============================================================
function buildClasspath(versionJson: any, gameDir: string): string[] {
  const librariesDir = join(gameDir, 'libraries')
  const versionsDir = join(gameDir, 'versions', versionJson.id)
  const classpath: string[] = []

  // 添加客户端 JAR
  const clientJar = join(versionsDir, `${versionJson.id}.jar`)
  if (existsSync(clientJar)) {
    classpath.push(clientJar)
  }

  // 添加 libraries
  for (const lib of versionJson.libraries || []) {
    // 检查 rules
    if (lib.rules && !checkLibraryRules(lib.rules)) continue

    const artifact = lib.downloads?.artifact
    if (artifact) {
      const libPath = join(librariesDir, artifact.path)
      if (existsSync(libPath)) {
        classpath.push(libPath)
      }
    }

    // Natives（提取到单独的目录后在 JVM 参数中用 -Djava.library.path 引用）
    // 这里不把 natives 加入 classpath，它们通过 natives 目录加载
  }

  return classpath
}

// ============================================================
//  构建 JVM 参数
// ============================================================
function buildJvmArgs(
  config: LaunchConfig,
  versionJson: any,
  classpath: string,
  separator: string
): string[] {
  const args: string[] = []

  // 解析用户传入的 Java 参数（如 -Xmx4G -Xms2G）
  const userArgs = parseArgs(config.javaArgs)

  // 使用版本 JSON 中的 jvm 参数模板（如果有的话）
  const jvmArgTemplate = versionJson.arguments?.jvm

  if (jvmArgTemplate && Array.isArray(jvmArgTemplate)) {
    for (const arg of jvmArgTemplate) {
      if (typeof arg === 'string') {
        // 跳过 library 目录参数，稍后统一添加
        if (arg.includes('${library_directory}')) continue

        // 替换变量
        let resolved = replaceVariables(arg, config, versionJson, classpath, separator)
        args.push(resolved)
      } else if (arg.rules) {
        if (checkLibraryRules(arg.rules)) {
          const value = arg.value
          if (typeof value === 'string') {
            let resolved = replaceVariables(value, config, versionJson, classpath, separator)
            args.push(resolved)
          } else if (Array.isArray(value)) {
            for (const v of value) {
              if (typeof v === 'string') {
                args.push(replaceVariables(v, config, versionJson, classpath, separator))
              }
            }
          }
        }
      }
    }
  } else {
    // 旧版本：使用默认 JVM 参数
    const osName = getOsName()
    const vMinecraft = `-Dminecraft.launcher.brand=yunyun-launcher`
    const vVersion = `-Dminecraft.launcher.version=0.1.0`
    const vClientId = `-Dminecraft.client.jar=${join(versionJson.id)}`

    args.push(
      vMinecraft,
      vVersion,
      vClientId,
      `-Djava.library.path=${join(config.gameDir, 'versions', config.versionId, 'natives')}`,
      '-cp',
      classpath
    )
  }

  // 添加用户的内存参数（覆盖模板中的内存设置）
  for (const userArg of userArgs) {
    if (
      userArg.startsWith('-Xmx') ||
      userArg.startsWith('-Xms') ||
      userArg.startsWith('-Xmn')
    ) {
      // 移除已有的内存参数
      const idx = args.findIndex(
        (a) =>
          a.startsWith('-Xmx') ||
          a.startsWith('-Xms') ||
          a.startsWith('-Xmn')
      )
      if (idx >= 0) {
        args.splice(idx, 1)
      }
      args.unshift(userArg)
    }
  }

  return args
}

// ============================================================
//  替换变量
// ============================================================
function replaceVariables(
  arg: string,
  config: LaunchConfig,
  versionJson: any,
  classpath: string,
  separator: string
): string {
  const versionsDir = join(config.gameDir, 'versions')
  const assetsDir = join(config.gameDir, 'assets')
  const librariesDir = join(config.gameDir, 'libraries')
  const nativesDir = join(versionsDir, config.versionId, 'natives')

  const replacements: Record<string, string> = {
    '${auth_player_name}': config.username,
    '${version_name}': config.versionId,
    '${game_directory}': config.gameDir,
    '${assets_root}': assetsDir,
    '${game_assets}': assetsDir,
    '${assets_index_name}': versionJson.assetIndex?.id || config.versionId,
    '${auth_uuid}': config.uuid,
    '${auth_access_token}': config.accessToken,
    '${user_type}': 'msa',
    '${version_type}': versionJson.type || 'release',
    '${user_properties}': '{}',
    '${resolution_width}': String(config.width),
    '${resolution_height}': String(config.height),
    '${library_directory}': librariesDir,
    '${classpath_separator}': separator,
    '${natives_directory}': nativesDir,
    '${launcher_name}': 'yunyun-launcher',
    '${launcher_version}': '0.1.0',
    '${classpath}': classpath,
    '${clientid}': 'yunyun-launcher',
    '${auth_xuid}': '',
  }

  let result = arg
  for (const [key, value] of Object.entries(replacements)) {
    while (result.includes(key)) {
      result = result.replace(key, value)
    }
  }

  return result
}

// ============================================================
//  构建 Game 参数
// ============================================================
function buildGameArgs(config: LaunchConfig, versionJson: any): string[] {
  const args: string[] = []

  const gameArgTemplate = versionJson.arguments?.game

  if (gameArgTemplate && Array.isArray(gameArgTemplate)) {
    for (const arg of gameArgTemplate) {
      if (typeof arg === 'string') {
        args.push(
          replaceVariables(arg, config, versionJson, '', ':')
        )
      } else if (arg.rules) {
        if (checkLibraryRules(arg.rules)) {
          const value = arg.value
          if (typeof value === 'string') {
            args.push(
              replaceVariables(value, config, versionJson, '', ':')
            )
          } else if (Array.isArray(value)) {
            for (const v of value) {
              if (typeof v === 'string') {
                args.push(
                  replaceVariables(v, config, versionJson, '', ':')
                )
              }
            }
          }
        }
      }
    }
  } else {
    // 旧版本 (1.12.2 及以下)，使用 minecraftArguments 字符串
    const mcArgs =
      versionJson.minecraftArguments ||
      '--username ${auth_player_name} --session ${auth_session} --version ${version_name} --gameDir ${game_directory} --assetsDir ${assets_root}'

    const tokens = parseArgs(mcArgs)
    for (const token of tokens) {
      args.push(
        replaceVariables(token, config, versionJson, '', ':')
      )
    }
  }

  // 确保关键参数被添加（防止模板中没有）
  ensureArg(args, '--username', config.username)
  ensureArg(args, '--version', config.versionId)
  ensureArg(args, '--gameDir', config.gameDir)
  ensureArg(args, '--assetsDir', join(config.gameDir, 'assets'))
  ensureArg(args, '--assetIndex', versionJson.assetIndex?.id || config.versionId)
  ensureArg(args, '--uuid', config.uuid)
  ensureArg(args, '--accessToken', config.accessToken)
  ensureArg(args, '--userType', 'msa')
  ensureArg(args, '--versionType', versionJson.type || 'release')
  ensureArg(args, '--width', String(config.width))
  ensureArg(args, '--height', String(config.height))

  return args
}

// ============================================================
//  确保参数出现
// ============================================================
function ensureArg(args: string[], flag: string, value: string): void {
  const idx = args.findIndex((a) => a === flag)
  if (idx >= 0 && idx + 1 < args.length) {
    args[idx + 1] = value
    return
  }
  args.push(flag, value)
}

// ============================================================
//  解析参数字符串
// ============================================================
function parseArgs(argString: string): string[] {
  const args: string[] = []
  const regex = /"[^"]*"|'[^']*'|[^\s]+/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(argString)) !== null) {
    let arg = match[0]
    // 去除引号
    if (
      (arg.startsWith('"') && arg.endsWith('"')) ||
      (arg.startsWith("'") && arg.endsWith("'"))
    ) {
      arg = arg.slice(1, -1)
    }
    args.push(arg)
  }
  return args
}

// ============================================================
//  检查 library rules
// ============================================================
function checkLibraryRules(rules: any[]): boolean {
  let allowed = true

  for (const rule of rules) {
    const action = rule.action
    const os = rule.os
    const features = rule.features

    let matches = false

    if (os) {
      const osName = getOsName()
      if (os.name) {
        matches = os.name === osName
      } else if (os.arch) {
        matches = os.arch === process.arch
      }
    } else if (features) {
      // 特性规则（如 has_custom_resolution, is_demo_user 等）
      // 默认不匹配
      matches = false
    } else {
      matches = true
    }

    if (matches) {
      if (action === 'allow') allowed = true
      if (action === 'disallow') allowed = false
    }
  }

  return allowed
}

// ============================================================
//  获取操作系统名称
// ============================================================
function getOsName(): string {
  const p = process.platform
  if (p === 'win32') return 'windows'
  if (p === 'darwin') return 'osx'
  return 'linux'
}
