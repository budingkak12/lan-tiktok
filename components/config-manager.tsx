"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Settings } from "lucide-react"
import { AppMode, getConfig, updateConfig, resetConfig, initConfig } from "@/lib/config"
import { toast } from "@/components/ui/use-toast"

export default function ConfigManager() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState(getConfig())

  // 初始化配置
  useEffect(() => {
    initConfig()
    setConfig(getConfig())
  }, [])

  // 切换模式
  const toggleMode = () => {
    const newMode = config.mode === AppMode.DEMO ? AppMode.DEV : AppMode.DEMO
    const newConfig = updateConfig({ mode: newMode })
    setConfig(newConfig)

    if (newMode === AppMode.DEV) {
      toast({
        title: "已切换到开发模式",
        description: "正在尝试连接后端服务器...",
      })

      // 在切换到开发模式时，自动检查 API 可用性
      setTimeout(() => {
        checkApiAvailability().then((available) => {
          if (!available) {
            toast({
              title: "警告",
              description: "无法连接到后端服务器，但仍将保持开发模式。",
              variant: "warning",
            })
          } else {
            toast({
              title: "连接成功",
              description: "已成功连接到后端服务器。",
              variant: "default",
            })
          }
        })
      }, 500)
    } else {
      toast({
        title: "已切换到演示模式",
        description: "使用模拟数据，无需后端服务器。",
      })
    }
  }

  // 更新 API URL
  const updateApiUrl = (url: string) => {
    const newConfig = updateConfig({ apiBaseUrl: url })
    setConfig(newConfig)
  }

  // 更新媒体 URL
  const updateMediaUrl = (url: string) => {
    const newConfig = updateConfig({ mediaBaseUrl: url })
    setConfig(newConfig)
  }

  // 重置配置
  const handleReset = () => {
    const newConfig = resetConfig()
    setConfig(newConfig)

    toast({
      title: "配置已重置",
      description: "所有设置已恢复为默认值",
    })
  }

  // 应用配置并刷新页面
  const applyChanges = () => {
    setIsOpen(false)

    toast({
      title: "配置已更新",
      description: "正在刷新页面以应用新设置...",
    })

    // 给提示显示的时间
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  }

  // 模拟检查 API 可用性的函数
  const checkApiAvailability = async (): Promise<boolean> => {
    // 这里应该替换为真实的 API 检查逻辑
    // 例如，尝试发送一个简单的 GET 请求到 API 根路径
    // 并根据响应状态判断 API 是否可用
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟 API 可用性，实际应用中需要替换为真实的检查逻辑
        const isAvailable = Math.random() > 0.2 // 80% 的概率认为 API 可用
        resolve(isAvailable)
      }, 300)
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full p-2 bg-black/30 backdrop-blur-md border-white/20 hover:bg-black/50 transition-all text-white absolute bottom-4 right-4 z-50"
          onClick={() => setIsOpen(true)}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>应用设置</SheetTitle>
        </SheetHeader>

        <div className="py-2 px-1">
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${config.mode === AppMode.DEMO ? "bg-yellow-500" : "bg-green-500"}`}
            ></div>
            <span>当前模式: {config.mode === AppMode.DEMO ? "演示模式" : "开发模式"}</span>
          </div>
        </div>

        <div className="py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mode-toggle">应用模式</Label>
              <p className="text-sm text-muted-foreground">
                {config.mode === AppMode.DEMO ? "演示模式（使用模拟数据）" : "开发模式（连接真实后端）"}
              </p>
            </div>
            <Switch id="mode-toggle" checked={config.mode === AppMode.DEV} onCheckedChange={toggleMode} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-url">API 基础 URL</Label>
            <Input
              id="api-url"
              value={config.apiBaseUrl}
              onChange={(e) => updateApiUrl(e.target.value)}
              placeholder="http://localhost:8000"
            />
            <p className="text-xs text-muted-foreground">后端 API 服务器的基础 URL</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="media-url">媒体文件基础 URL</Label>
            <Input
              id="media-url"
              value={config.mediaBaseUrl}
              onChange={(e) => updateMediaUrl(e.target.value)}
              placeholder="http://localhost:8000"
            />
            <p className="text-xs text-muted-foreground">媒体文件服务器的基础 URL（通常与 API URL 相同）</p>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleReset}>
              重置设置
            </Button>
            <Button onClick={applyChanges}>应用并刷新</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
