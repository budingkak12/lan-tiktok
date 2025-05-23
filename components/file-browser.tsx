"use client"

import { useEffect, useState } from "react"
import { useFileBrowserStore } from "@/lib/store"
import type { Folder, MediaItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, ChevronRight, FolderIcon, ImageIcon, Video, ArrowUp } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { format } from "date-fns"
import MediaViewerModal from "./media-viewer-modal"
import { getMediaUrl } from "@/lib/api"

export default function FileBrowser() {
  const router = useRouter()
  const { currentFolderId, folderContents, breadcrumb, isLoading, navigateToFolder, navigateUp } = useFileBrowserStore()
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)

  // Initialize by loading root folders
  useEffect(() => {
    navigateToFolder(null)
  }, [navigateToFolder])

  const handleFolderClick = (folderId: string) => {
    navigateToFolder(folderId)
  }

  const handleMediaClick = (media: MediaItem) => {
    setSelectedMedia(media)
  }

  const handleCloseViewer = () => {
    setSelectedMedia(null)
  }

  const navigateToHome = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={navigateToHome}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">文件浏览器</h1>
          </div>

          {currentFolderId !== null && (
            <Button variant="ghost" size="sm" onClick={navigateUp}>
              <ArrowUp className="h-4 w-4 mr-2" />
              向上
            </Button>
          )}
        </div>

        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <div className="container mx-auto px-4 py-2 flex items-center text-sm text-muted-foreground overflow-x-auto">
            <Button
              variant="link"
              className="p-0 h-auto font-normal text-muted-foreground"
              onClick={() => navigateToFolder(null)}
            >
              首页
            </Button>

            {breadcrumb.map((folder, index) => (
              <div key={folder.id} className="flex items-center">
                <ChevronRight className="h-4 w-4 mx-1" />
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal text-muted-foreground"
                  onClick={() => navigateToFolder(folder.id)}
                  disabled={index === breadcrumb.length - 1}
                >
                  {folder.name}
                </Button>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array(12)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-md" />
              ))}
          </div>
        ) : (
          <>
            {/* Folders */}
            {folderContents.folders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-medium mb-4">文件夹</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {folderContents.folders.map((folder) => (
                    <FolderItem key={folder.id} folder={folder} onClick={() => handleFolderClick(folder.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Media */}
            {folderContents.media.length > 0 && (
              <div>
                <h2 className="text-lg font-medium mb-4">媒体</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {folderContents.media.map((media) => (
                    <FileBrowserMediaItem key={media.id} media={media} onClick={() => handleMediaClick(media)} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {folderContents.folders.length === 0 && folderContents.media.length === 0 && (
              <div className="text-center py-12">
                <FolderIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">此文件夹为空</h3>
                <p className="text-muted-foreground mt-2">此位置没有文件夹或媒体项</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Media viewer modal */}
      {selectedMedia && (
        <MediaViewerModal media={selectedMedia} allMedia={folderContents.media} onClose={handleCloseViewer} />
      )}
    </div>
  )
}

// Folder item component
function FolderItem({ folder, onClick }: { folder: Folder; onClick: () => void }) {
  return (
    <div
      className="border rounded-md overflow-hidden cursor-pointer hover:border-primary transition-colors"
      onClick={onClick}
    >
      <div className="bg-muted p-4 flex items-center justify-center">
        <FolderIcon className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="p-3">
        <h3 className="font-medium truncate">{folder.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">{format(new Date(folder.createdAt), "yyyy-MM-dd")}</p>
      </div>
    </div>
  )
}

// Media item component
function FileBrowserMediaItem({ media, onClick }: { media: MediaItem; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false)

  // 使用统一的媒体 URL 获取函数
  const mediaUrl = getMediaUrl(media.path)

  return (
    <div
      className="border rounded-md overflow-hidden cursor-pointer hover:border-primary transition-colors"
      onClick={onClick}
    >
      <div className="aspect-square relative bg-muted">
        <Image
          src={mediaUrl || "/placeholder.svg"}
          alt={media.title || "Media"}
          fill
          className={`object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
        />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            {media.type === "image" ? (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Video className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium truncate">{media.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{format(new Date(media.createdAt), "yyyy-MM-dd")}</p>
      </div>
    </div>
  )
}
