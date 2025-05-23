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
import { initConfig, isDevMode, updateConfig, AppMode } from "@/lib/config" // Removed isDemoMode

export default function HomePage() {
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null)
  const [isCheckingApi, setIsCheckingApi] = useState(false)
  const { mediaItems, fetchMediaItems, isFetching, error, clearError } = useMediaStore()

  // 初始化配置
  useEffect(() => {
    initConfig()
  }, [])

  // 检查 API 可用性
  const checkApi = async () => {
    // Removed isDemoMode() check, API check will always run
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
        console.log("API server is not available.")
        // Removed updateConfig({ mode: AppMode.DEMO })
        // Removed toast message for demo mode switch
        toast({
          title: "后端连接失败",
          description: "无法连接到后端服务器。请检查配置或确保服务器正在运行。",
          variant: "destructive", // Changed to destructive
        })
      }
    } catch (error) {
      console.error("Error checking API:", error)
      setIsApiAvailable(false)
      // Removed updateConfig({ mode: AppMode.DEMO })
      toast({ // Added a generic error toast
        title: "API 检查错误",
        description: "检查后端连接时发生错误。",
        variant: "destructive",
      })
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
    if (isApiAvailable === true) { // Changed condition
      fetchMediaItems()
    }
  }, [fetchMediaItems, isApiAvailable])

  // 如果有媒体项，设置为已完成设置
  useEffect(() => {
    if (mediaItems.length > 0 && isApiAvailable === true) { // Changed condition
      setIsSetupComplete(true)
    }
    // If API is not available, setup is not complete, unless we define setup differently
    // For now, if API is not available, mediaItems will be empty, and this won't run.
    // If API becomes unavailable after setup, this doesn't reset isSetupComplete.
    // This might need further thought based on desired UX for API becoming unavailable later.
  }, [mediaItems, isApiAvailable])

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
  // isDevMode() is always true now, so can be removed from condition
  if (isApiAvailable === null && isCheckingApi) { 
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

  // 显示后端错误消息
  // isDevMode() is always true now
  // Show this if there's an error AND (API is not available OR setup is not complete, indicating a connection/config problem)
  if (error && (isApiAvailable === false || !isSetupComplete) ) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="w-full max-w-md p-6 bg-background rounded-lg shadow-lg">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>连接错误</AlertTitle>
            <AlertDescription>{error || "无法连接到后端或加载初始数据。"}</AlertDescription>
          </Alert>

          <div className="space-y-4">
            <p className="text-sm">请确保后端服务器正在运行，并且配置正确。</p>

            <Button onClick={handleRetry} className="w-full">
              重试连接
            </Button>
            
            {/* Simplified message as there's no demo mode to switch to */}
            <p className="text-sm text-muted-foreground">
              如果问题持续存在，请检查后端服务日志和网络连接。
            </p>

            <Button variant="outline" onClick={() => {
              setIsSetupComplete(false); // Go back to setup form
              setIsApiAvailable(null); // Allow API check to re-run implicitly or explicitly
              clearError();
            }} className="w-full">
              检查配置/返回设置
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 显示设置表单
  // isDevMode() is always true now
  if (!isSetupComplete && !isFetching) { 
    return <SetupForm onComplete={handleSetupComplete} />
  }

  return (
    <>
      <MediaViewer />
      <ConfigManager />
    </>
  )
}
