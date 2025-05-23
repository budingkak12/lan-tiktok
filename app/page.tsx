"use client"

import { useState, useEffect } from "react"
import MediaViewer from "@/components/media-viewer"
import SetupForm from "@/components/setup-form"
import { useMediaStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { checkApiAvailability, getBackendConfiguredMediaPath } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import ConfigManager from "@/components/config-manager"
import { initConfig, isDevMode, isDemoMode, updateConfig, AppMode } from "@/lib/config"

export default function HomePage() {
  const [isBackendConfigured, setIsBackendConfigured] = useState<boolean | null>(null);
  const [isCheckingBackendConfig, setIsCheckingBackendConfig] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null)
  const [isCheckingApi, setIsCheckingApi] = useState(false)
  const { mediaItems, fetchMediaItems, isFetching, error, clearError } = useMediaStore()

  // 初始化配置
  useEffect(() => {
    initConfig()
  }, [])

  // Check backend media path configuration (only in dev mode)
  useEffect(() => {
    const checkBackendConfig = async () => {
      if (isDemoMode() || !isDevMode()) {
        setIsBackendConfigured(true); // Assume configured in demo or non-dev mode
        return;
      }
      setIsCheckingBackendConfig(true);
      try {
        const config = await getBackendConfiguredMediaPath();
        if (config.media_path) {
          setIsBackendConfigured(true);
        } else {
          setIsBackendConfigured(false);
          toast({
            title: "媒体路径未配置",
            description: "请在设置中配置您的媒体目录路径。",
            variant: "info",
          });
        }
      } catch (e) {
        setIsBackendConfigured(false); // Treat error as not configured
        toast({
          title: "检查配置失败",
          description: "无法获取后端媒体路径配置。",
          variant: "destructive",
        });
      } finally {
        setIsCheckingBackendConfig(false);
      }
    };

    checkBackendConfig();
  }, []);


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
    // Fetch media if API is available (or demo mode) AND backend is configured
    if ((isApiAvailable !== null || isDemoMode()) && isBackendConfigured) {
      fetchMediaItems()
    }
  }, [fetchMediaItems, isApiAvailable, isBackendConfigured])


  const handleSetupComplete = async () => {
    // After setup, assume backend is now configured
    setIsBackendConfigured(true);
    // Re-check API availability and fetch media
    await checkApi(); // Check API again as it might be the first time
    fetchMediaItems();
  }

  const handleRetry = async () => {
    clearError()
    // Re-check backend config first
    if (isDevMode() && !isDemoMode()) {
      setIsCheckingBackendConfig(true);
      try {
        const config = await getBackendConfiguredMediaPath();
        setIsBackendConfigured(!!config.media_path);
        if (!config.media_path) {
           toast({
            title: "媒体路径未配置",
            description: "请在设置中配置您的媒体目录路径。",
            variant: "info",
          });
        }
      } catch (e) {
        setIsBackendConfigured(false);
      } finally {
        setIsCheckingBackendConfig(false);
      }
    }
    await checkApi();
    // fetchMediaItems will be called by the useEffect if conditions are met
  }

  // Initial Loading States
  if (isDevMode() && (isCheckingBackendConfig || (isBackendConfigured === null && !isDemoMode()))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="w-full max-w-md p-6 bg-background rounded-lg shadow-lg text-center">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
          <h1 className="text-2xl font-bold mb-2">正在检查后端配置</h1>
          <p className="text-muted-foreground">请稍候...</p>
        </div>
      </div>
    );
  }

  if (isDevMode() && isBackendConfigured && isApiAvailable === null && isCheckingApi) {
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

  // If in Dev mode and backend is not configured, show SetupForm
  if (isDevMode() && !isDemoMode() && !isBackendConfigured) {
    return <SetupForm onComplete={handleSetupComplete} />;
  }

  // Display API/backend error (only in dev mode, if backend was configured or config check passed)
  if (error && !isApiAvailable && isDevMode() && (isBackendConfigured || isDemoMode())) {
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

            <Button variant="outline" onClick={() => setIsBackendConfigured(false)} className="w-full">
              返回设置
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // If fetching media for the first time after setup/config checks, show loading.
  // This avoids showing an empty MediaViewer briefly.
  if (isFetching && mediaItems.length === 0 && (isBackendConfigured || isDemoMode())) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="w-full max-w-md p-6 bg-background rounded-lg shadow-lg text-center">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
          <h1 className="text-2xl font-bold mb-2">正在加载媒体</h1>
          <p className="text-muted-foreground">请稍候...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <MediaViewer />
      <ConfigManager />
    </>
  )
}
