"use client"

import { useState } from "react"
import { Heart, Bookmark, Trash2, Tag } from "lucide-react"
import type { MediaItem } from "@/lib/types"
import { useMediaStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { toast } from "@/components/ui/use-toast"
import TagSelector from "./tag-selector"

interface MediaControlsProps {
  media: MediaItem
}

export default function MediaControls({ media }: MediaControlsProps) {
  const { toggleLike, toggleFavorite, deleteMedia, addTagToMedia } = useMediaStore()
  const [showTagSelector, setShowTagSelector] = useState(false)

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this media?")) {
      try {
        await fetch(`/api/media/${media.id}`, { method: "DELETE" })
        deleteMedia(media.id)
        toast({
          title: "Media deleted",
          description: "The media has been successfully deleted",
        })
      } catch (error) {
        console.error("Failed to delete media:", error)
        toast({
          title: "Failed to delete media",
          description: "An error occurred while deleting the media",
          variant: "destructive",
        })
      }
    }
  }

  const handleLike = async () => {
    try {
      await fetch(`/api/media/${media.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: !media.liked }),
      })
      toggleLike(media.id)
    } catch (error) {
      console.error("Failed to toggle like:", error)
    }
  }

  const handleFavorite = async () => {
    try {
      await fetch(`/api/media/${media.id}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorited: !media.favorited }),
      })
      toggleFavorite(media.id)
    } catch (error) {
      console.error("Failed to toggle favorite:", error)
    }
  }

  return (
    <div className="absolute right-4 bottom-1/3 flex flex-col gap-4">
      <Button
        variant="outline"
        size="icon"
        className={`rounded-full p-2 bg-black/30 backdrop-blur-md border-white/20 hover:bg-black/50 transition-all ${media.liked ? "text-rose-500" : "text-white"}`}
        onClick={handleLike}
      >
        <Heart className={`h-6 w-6 ${media.liked ? "fill-rose-500" : ""}`} />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className={`rounded-full p-2 bg-black/30 backdrop-blur-md border-white/20 hover:bg-black/50 transition-all ${media.favorited ? "text-amber-400" : "text-white"}`}
        onClick={handleFavorite}
      >
        <Bookmark className={`h-6 w-6 ${media.favorited ? "fill-amber-400" : ""}`} />
      </Button>

      <Sheet open={showTagSelector} onOpenChange={setShowTagSelector}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full p-2 bg-black/30 backdrop-blur-md border-white/20 hover:bg-black/50 transition-all text-white"
          >
            <Tag className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Add Tags</SheetTitle>
          </SheetHeader>
          <TagSelector mediaId={media.id} existingTags={media.tags} onClose={() => setShowTagSelector(false)} />
        </SheetContent>
      </Sheet>

      <Button
        variant="outline"
        size="icon"
        className="rounded-full p-2 bg-black/30 backdrop-blur-md border-white/20 hover:bg-black/50 transition-all text-white"
        onClick={handleDelete}
      >
        <Trash2 className="h-6 w-6" />
      </Button>
    </div>
  )
}
