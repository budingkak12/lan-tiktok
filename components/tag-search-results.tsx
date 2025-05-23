"use client"

import { useEffect, useRef, useState } from "react"
import type { MediaItem } from "@/lib/types"
import Image from "next/image"
import { useInView } from "react-intersection-observer"
import { Skeleton } from "@/components/ui/skeleton"
import { Play } from "lucide-react"
import { getMediaUrl } from "@/lib/api"

interface TagSearchResultsProps {
  results: MediaItem[]
  onMediaClick: (media: MediaItem) => void
}

export default function TagSearchResults({ results, onMediaClick }: TagSearchResultsProps) {
  const [columns, setColumns] = useState(3)
  const containerRef = useRef<HTMLDivElement>(null)

  // Determine number of columns based on container width
  useEffect(() => {
    const updateColumns = () => {
      if (!containerRef.current) return

      const width = containerRef.current.clientWidth
      if (width < 640) setColumns(2)
      else if (width < 1024) setColumns(3)
      else setColumns(4)
    }

    updateColumns()
    window.addEventListener("resize", updateColumns)
    return () => window.removeEventListener("resize", updateColumns)
  }, [])

  // Split results into columns for masonry layout
  const getColumnItems = () => {
    const columnItems: MediaItem[][] = Array(columns)
      .fill(0)
      .map(() => [])

    results.forEach((item, index) => {
      const columnIndex = index % columns
      columnItems[columnIndex].push(item)
    })

    return columnItems
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-500">没有找到结果</p>
        <p className="text-sm text-gray-400">尝试选择不同的标签</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {getColumnItems().map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-4">
            {column.map((item) => (
              <MediaThumbnail key={item.id} media={item} onClick={() => onMediaClick(item)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Media thumbnail component with lazy loading
function MediaThumbnail({ media, onClick }: { media: MediaItem; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false)
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px 0px",
  })

  // 使用统一的媒体 URL 获取函数
  const mediaUrl = getMediaUrl(media.path)
  const thumbnailUrl = media.type === "video" ? `${mediaUrl}?thumbnail=true` : mediaUrl

  return (
    <div ref={ref} className="relative rounded-lg overflow-hidden cursor-pointer group" onClick={onClick}>
      {inView ? (
        <>
          {media.type === "image" ? (
            <div className="aspect-square relative">
              <Image
                src={mediaUrl || "/placeholder.svg"}
                alt={media.title || "Image"}
                fill
                className={`object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setLoaded(true)}
              />
              {!loaded && <Skeleton className="w-full h-full absolute inset-0" />}
            </div>
          ) : (
            <div className="aspect-video relative">
              <Image
                src={thumbnailUrl || "/placeholder.svg"}
                alt={media.title || "Video thumbnail"}
                fill
                className={`object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setLoaded(true)}
              />
              {!loaded && <Skeleton className="w-full h-full absolute inset-0" />}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/50 rounded-full p-2 opacity-70 group-hover:opacity-100 transition-opacity">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <Skeleton className={`w-full ${media.type === "image" ? "aspect-square" : "aspect-video"}`} />
      )}
    </div>
  )
}
