"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { MediaItem } from "@/lib/types"
import { Swiper, SwiperSlide } from "swiper/react"
import { Keyboard, Mousewheel } from "swiper/modules"
import MediaItemComponent from "./media-item"
import MediaControls from "./media-controls"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMediaStore } from "@/lib/store"

import "swiper/css"

interface MediaViewerModalProps {
  media: MediaItem
  allMedia: MediaItem[]
  onClose: () => void
}

export default function MediaViewerModal({ media, allMedia, onClose }: MediaViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDoubleTapLike, setIsDoubleTapLike] = useState(false)
  const doubleTapTimer = useRef<NodeJS.Timeout | null>(null)

  // Find the index of the initial media in the allMedia array
  useEffect(() => {
    const index = allMedia.findIndex((item) => item.id === media.id)
    if (index !== -1) {
      setCurrentIndex(index)
    }
  }, [media, allMedia])

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

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      <Swiper
        modules={[Keyboard, Mousewheel]}
        direction="vertical"
        spaceBetween={0}
        slidesPerView={1}
        initialSlide={currentIndex}
        onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
        keyboard={{ enabled: true }}
        mousewheel={{ sensitivity: 1 }}
        className="h-full w-full"
      >
        {allMedia.map((item, index) => (
          <SwiperSlide key={item.id}>
            <div
              className="relative w-full h-full flex items-center justify-center"
              onDoubleClick={() => handleDoubleTap(item.id)}
            >
              <MediaItemComponent
                media={item}
                isActive={index === currentIndex}
                isDoubleTapLike={isDoubleTapLike && index === currentIndex}
              />
              <MediaControls media={item} />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}
