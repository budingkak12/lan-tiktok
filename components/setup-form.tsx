"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { FolderOpen } from "lucide-react"
import { scanMediaDirectory } from "@/lib/api"

export default function SetupForm({ onComplete }: { onComplete: () => void }) {
  const [mediaPath, setMediaPath] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!mediaPath.trim()) {
      toast({
        title: "错误",
        description: "请输入有效的媒体目录路径",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Normalize path by removing trailing slashes and normalizing separators
      const normalizedPath = mediaPath.trim().replace(/[/\\]+$/, "")

      const result = await scanMediaDirectory(normalizedPath)

      toast({
        title: "设置完成",
        description: result.message,
      })

      onComplete()
    } catch (error) {
      console.error("Setup error:", error)
      toast({
        title: "设置失败",
        description: error instanceof Error ? error.message : "发生未知错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <div className="w-full max-w-md p-6 bg-background rounded-lg shadow-lg">
        <div className="mb-6 text-center">
          <FolderOpen className="h-12 w-12 mx-auto mb-2 text-primary" />
          <h1 className="text-2xl font-bold">LAN TikTok 相册设置</h1>
          <p className="text-muted-foreground mt-2">输入媒体目录路径以开始使用</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mediaPath">媒体目录路径</Label>
              <Input
                id="mediaPath"
                placeholder="/path/to/your/media 或 C:\path\to\your\media"
                value={mediaPath}
                onChange={(e) => setMediaPath(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">输入包含图片和视频的目录的完整路径</p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "扫描中..." : "扫描媒体"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
