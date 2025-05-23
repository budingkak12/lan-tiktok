"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Virtual, Keyboard, Mousewheel } from "swiper/modules"
import { useMediaStore } from "@/lib/store"
import MediaItem from "./media-item"
import MediaControls from "./media-controls"
import SortingControls from "./sorting-controls"
import { Skeleton } from "@/components/ui/skeleton"
import { useMobile } from "@/hooks/use-mobile"
import { Search, MoreHorizontal, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { isDemoMode } from "@/lib/config"

import "swiper/css"
import "swiper/css/virtual"

export default function MediaViewer() {
  const { mediaItems, currentIndex, setCurrentIndex, sortingMode, isFetching, fetchMediaItems } = useMediaStore()
  const isMobile = useMobile()
  const [isDoubleTapLike, setIsDoubleTapLike] = useState(false)
  const doubleTapTimer = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchMediaItems()
  }, [fetchMediaItems, sortingMode])

  const handleDoubleTap = useCallback(async (mediaId: string) => {
    if (doubleTapTimer.current) {
      clearTimeout(doubleTapTimer.current)
      doubleTapTimer.current = null
      setIsDoubleTapLike(true)

      // Like the media
      try {
        // In mock data version, we just update the store directly
        useMediaStore.getState().toggleLike(mediaId)

        // Reset like animation after a delay
        setTimeout(() => setIsDoubleTapLike(false), 1000)
      } catch (error) {
        console.error("Failed to like media:", error)
        setIsDoubleTapLike(false)
      }
    } else {
      doubleTapTimer.current = setTimeout(() => {
        doubleTapTimer.current = null
      }, 300)
    }
  }, [])

  const navigateToSearch = () => {
    router.push("/search")
  }

  const navigateToFiles = () => {
    router.push("/files")
  }

  if (isFetching) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Skeleton className="w-full max-w-3xl h-[80vh] rounded-xl" />
      </div>
    )
  }

  if (!mediaItems.length) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <p className="text-xl">没有找到媒体。请先上传一些照片或视频。</p>
      </div>
    )
  }

  return (
    <div className="h-screen w-full overflow-hidden relative bg-black">
      {isDemoMode() && (
        <Alert variant="warning" className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 w-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>演示模式 - 使用模拟数据</AlertDescription>
        </Alert>
      )}

      <Swiper
        modules={[Virtual, Keyboard, Mousewheel]}
        direction="vertical"
        spaceBetween={0}
        slidesPerView={1}
        virtual
        keyboard={{ enabled: true }}
        mousewheel={{ sensitivity: 1 }}
        onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
        initialSlide={currentIndex}
        className="h-full w-full"
      >
        {mediaItems.map((media, index) => (
          <SwiperSlide key={media.id} virtualIndex={index}>
            <div
              className="relative w-full h-full flex items-center justify-center"
              onDoubleClick={() => handleDoubleTap(media.id)}
            >
              <MediaItem
                media={media}
                isActive={index === currentIndex}
                isDoubleTapLike={isDoubleTapLike && index === currentIndex}
              />
              <MediaControls media={media} />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full p-2 bg-black/30 backdrop-blur-md border-white/20 hover:bg-black/50 transition-all text-white"
            >
              <MoreHorizontal className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={navigateToFiles}>文件浏览器</DropdownMenuItem>
            <DropdownMenuItem onClick={navigateToSearch}>标签搜索</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon"
          className="rounded-full p-2 bg-black/30 backdrop-blur-md border-white/20 hover:bg-black/50 transition-all text-white"
          onClick={navigateToSearch}
        >
          <Search className="h-6 w-6" />
        </Button>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <SortingControls />
      </div>
    </div>
  )
}
