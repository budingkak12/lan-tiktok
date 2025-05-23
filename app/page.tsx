"use client"

import { useState, useEffect } from "react"
import MediaViewer from "@/components/media-viewer"
import SetupForm from "@/components/setup-form"
import { useMediaStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { checkApiAvailability } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import ConfigManager from "@/components/config-manager"
import { initConfig, isDevMode, isDemoMode, updateConfig, AppMode } from "@/lib/config"

export default function HomePage() {
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null)
  const [isCheckingApi, setIsCheckingApi] = useState(false)
  const { mediaItems, fetchMediaItems, isFetching, error, clearError } = useMediaStore()

  // 初始化配置
  useEffect(() => {
    initConfig()
  }, [])

  // 检查 API 可用性（仅在开发模式下）
  const checkApi = async () => {
    if (isDemoMode()) {
      setIsApiAvailable(false)
      return
    }

    setIsCheckingApi(true)
    try {
      // 添加超时处理
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 5000) // 5秒超时
      })

      // 使用 Promise.race 确保检查不会无限等待
      const available = await Promise.race([checkApiAvailability(), timeoutPromise])

      setIsApiAvailable(available)

      if (!available) {
        console.log("API server is not available, switching to demo mode")
        // 自动切换到演示模式
        updateConfig({ mode: AppMode.DEMO })

        toast({
          title: "已切换到演示模式",
          description: "无法连接到后端服务器，已自动切换到演示模式。",
          variant: "warning",
        })
      }
    } catch (error) {
      console.error("Error checking API:", error)
      setIsApiAvailable(false)
      // 自动切换到演示模式
      updateConfig({ mode: AppMode.DEMO })
    } finally {
      setIsCheckingApi(false)
    }
  }

  // 初始检查 API 可用性
  useEffect(() => {
    checkApi()
  }, [])

  // 获取媒体数据
  useEffect(() => {
    if (isApiAvailable !== null || isDemoMode()) {
      fetchMediaItems()
    }
  }, [fetchMediaItems, isApiAvailable])

  // 如果有媒体项，设置为已完成设置
  useEffect(() => {
    if (mediaItems.length > 0 || isDemoMode()) {
      setIsSetupComplete(true)
    }
  }, [mediaItems])

  const handleSetupComplete = () => {
    setIsSetupComplete(true)
    fetchMediaItems()
  }

  const handleRetry = async () => {
    clearError()
    await checkApi()
    fetchMediaItems()
  }

  // 显示 API 检查中
  if (isApiAvailable === null && isCheckingApi && isDevMode()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="w-full max-w-md p-6 bg-background rounded-lg shadow-lg text-center">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
          <h1 className="text-2xl font-bold mb-2">正在检查后端连接</h1>
          <p className="text-muted-foreground">请稍候...</p>
        </div>
      </div>
    )
  }

  // 显示后端错误消息（仅在开发模式下）
  if (error && !isApiAvailable && isDevMode()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="w-full max-w-md p-6 bg-background rounded-lg shadow-lg">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>连接错误</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <div className="space-y-4">
            <p className="text-sm">请确保后端服务器正在运行，并且配置正确：</p>

            <Button onClick={handleRetry} className="w-full">
              重试连接
            </Button>

            <p className="text-sm text-muted-foreground">
              如果问题持续存在，请检查您是否已使用提供的启动脚本启动后端服务器，或切换到演示模式。
            </p>

            <Button variant="outline" onClick={() => setIsSetupComplete(false)} className="w-full">
              返回设置
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 在开发模式下显示设置表单
  if (!isSetupComplete && !isFetching && isDevMode()) {
    return <SetupForm onComplete={handleSetupComplete} />
  }

  return (
    <>
      <MediaViewer />
      <ConfigManager />
    </>
  )
}
