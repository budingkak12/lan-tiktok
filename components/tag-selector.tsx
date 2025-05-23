"use client"

import { useState, useEffect } from "react"
import { useMediaStore, useSearchStore } from "@/lib/store"
import type { Tag } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface TagSelectorProps {
  mediaId: string
  existingTags: Tag[]
  onClose: () => void
}

export default function TagSelector({ mediaId, existingTags, onClose }: TagSelectorProps) {
  const [newTagName, setNewTagName] = useState("")
  const { addTagToMedia, removeTagFromMedia } = useMediaStore()
  const { allTags, fetchTags, createTag } = useSearchStore()
  const [isLoading, setIsLoading] = useState(false)

  // Fetch all tags on component mount
  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const handleAddTag = async (tagId: string) => {
    const tag = allTags.find((t) => t.id === tagId)
    if (tag) {
      addTagToMedia(mediaId, tag)
      toast({
        title: "Tag added",
        description: `Tag "${tag.name}" has been added to the media.`,
      })
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    removeTagFromMedia(mediaId, tagId)
    toast({
      title: "Tag removed",
      description: "Tag has been removed from the media.",
    })
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    setIsLoading(true)

    try {
      const newTag = await createTag(newTagName.trim())

      if (newTag) {
        // Automatically add the new tag to the media
        addTagToMedia(mediaId, newTag)

        toast({
          title: "Tag created",
          description: `Tag "${newTagName.trim()}" has been created and added to the media.`,
        })

        setNewTagName("")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create tag. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filter out already added tags
  const unusedTags = allTags.filter((tag) => !existingTags.some((et) => et.id === tag.id))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6 mt-4">
        <Input
          placeholder="Create a new tag..."
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          disabled={isLoading}
        />
        <Button onClick={handleCreateTag} disabled={!newTagName.trim() || isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Current tags</h3>
        <div className="flex flex-wrap gap-2">
          {existingTags.length === 0 ? (
            <p className="text-sm text-gray-500">No tags added yet</p>
          ) : (
            existingTags.map((tag) => (
              <Badge key={tag.id} variant="outline" className="flex items-center gap-1">
                {tag.name}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 ml-1 text-gray-500 hover:text-gray-700"
                  onClick={() => handleRemoveTag(tag.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Available tags</h3>
        <div className="flex flex-wrap gap-2">
          {unusedTags.length === 0 ? (
            <p className="text-sm text-gray-500">No more tags available</p>
          ) : (
            unusedTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="flex items-center gap-1 cursor-pointer hover:bg-accent"
                onClick={() => handleAddTag(tag.id)}
              >
                {tag.name}
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1 text-green-500">
                  <Plus className="h-3 w-3" />
                </Button>
              </Badge>
            ))
          )}
        </div>
      </div>

      <div className="mt-auto pt-6">
        <Button onClick={onClose} className="w-full">
          Done
        </Button>
      </div>
    </div>
  )
}
