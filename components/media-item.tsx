"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import type { MediaItem } from "@/lib/types"
import { Heart } from "lucide-react"
import { getMediaUrl } from "@/lib/api"

interface MediaItemProps {
  media: MediaItem
  isActive: boolean
  isDoubleTapLike: boolean
}

export default function MediaItem({ media, isActive, isDoubleTapLike }: MediaItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (isActive && media.type === "video" && videoRef.current) {
      // Auto-play video when active, muted by default
      videoRef.current.currentTime = 0
      videoRef.current.muted = true
      videoRef.current.play().catch((err) => console.error("Video playback error:", err))
    } else if (!isActive && media.type === "video" && videoRef.current) {
      videoRef.current.pause()
    }
  }, [isActive, media.type])

  const isSmallVideo = media.type === "video" && media.size < 5 * 1024 * 1024
  const isLargeVideo = media.type === "video" && media.size >= 5 * 1024 * 1024

  // 使用统一的媒体 URL 获取函数
  const mediaUrl = getMediaUrl(media.path)

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Image */}
      {media.type === "image" && (
        <Image
          src={mediaUrl || "/placeholder.svg"}
          alt={media.title || "Image"}
          fill
          className={`object-contain transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setIsLoaded(true)}
          priority={isActive}
        />
      )}

      {/* Small Video (< 5MB) */}
      {isSmallVideo && (
        <video
          ref={videoRef}
          src={mediaUrl}
          className="max-h-full max-w-full object-contain"
          loop
          playsInline
          controls={false}
          onLoadedData={() => setIsLoaded(true)}
        />
      )}

      {/* Large Video (> 5MB) with streaming */}
      {isLargeVideo && (
        <video
          ref={videoRef}
          className="max-h-full max-w-full object-contain"
          loop
          playsInline
          controls={false}
          onLoadedData={() => setIsLoaded(true)}
        >
          <source src={mediaUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}

      {/* Double tap like animation */}
      {isDoubleTapLike && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Heart className="text-white w-24 h-24 animate-ping opacity-75 fill-white" />
        </div>
      )}
    </div>
  )
}
