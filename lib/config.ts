/**
 * 应用程序配置
 */

// 应用模式
export enum AppMode {
  DEMO = "demo", // 演示模式：使用模拟数据
  DEV = "dev", // 开发模式：连接真实后端
}

// 应用配置
export interface AppConfig {
  // 应用模式
  mode: AppMode
  // API 基础URL
  apiBaseUrl: string
  // 媒体文件基础URL
  mediaBaseUrl: string
  // 是否显示调试信息
  debug: boolean
}

// 默认配置
const defaultConfig: AppConfig = {
  mode: AppMode.DEMO, // 默认使用演示模式
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  mediaBaseUrl: process.env.NEXT_PUBLIC_MEDIA_URL || "http://localhost:8000",
  debug: process.env.NODE_ENV === "development",
}

// 当前配置
let currentConfig: AppConfig = { ...defaultConfig }

/**
 * 获取当前配置
 */
export function getConfig(): AppConfig {
  return { ...currentConfig }
}

/**
 * 更新配置
 * @param newConfig 新配置
 */
export function updateConfig(newConfig: Partial<AppConfig>): AppConfig {
  currentConfig = { ...currentConfig, ...newConfig }

  // 保存到本地存储，以便在页面刷新后保持设置
  if (typeof window !== "undefined") {
    localStorage.setItem("app-config", JSON.stringify(currentConfig))
  }

  return { ...currentConfig }
}

/**
 * 初始化配置
 * 从本地存储加载配置
 */
export function initConfig(): void {
  if (typeof window !== "undefined") {
    const savedConfig = localStorage.getItem("app-config")
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig)
        currentConfig = { ...defaultConfig, ...parsedConfig }
      } catch (error) {
        console.error("Failed to parse saved config:", error)
      }
    }
  }
}

/**
 * 重置配置为默认值
 */
export function resetConfig(): AppConfig {
  currentConfig = { ...defaultConfig }

  if (typeof window !== "undefined") {
    localStorage.removeItem("app-config")
  }

  return { ...currentConfig }
}

/**
 * 检查是否使用演示模式
 */
export function isDemoMode(): boolean {
  return currentConfig.mode === AppMode.DEMO
}

/**
 * 检查是否使用开发模式
 */
export function isDevMode(): boolean {
  return currentConfig.mode === AppMode.DEV
}

/**
 * 切换到演示模式
 */
export function switchToDemoMode(): AppConfig {
  return updateConfig({ mode: AppMode.DEMO })
}

/**
 * 切换到开发模式
 */
export function switchToDevMode(): AppConfig {
  return updateConfig({ mode: AppMode.DEV })
}
