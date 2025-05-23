"use client"

import { useState, useEffect } from "react"
import { useMediaStore, useSearchStore } from "@/lib/store"
import type { MediaItem, Tag } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Search, ArrowLeft } from "lucide-react"
import { useDebounceFn } from "@/hooks/use-debounce"
import TagSearchResults from "./tag-search-results"
import MediaViewerModal from "./media-viewer-modal"
import { useRouter } from "next/navigation"

export default function TagSearch() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [selectedMediaItem, setSelectedMediaItem] = useState<MediaItem | null>(null)
  const { selectedTags, addTag, removeTag, clearTags, allTags, fetchTags } = useSearchStore()
  const { searchResults, searchMediaByTags } = useMediaStore()
  const router = useRouter()

  // Fetch all tags on component mount
  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Filter tags based on search term
  const filterTags = useDebounceFn((term: string) => {
    if (!term.trim()) {
      setFilteredTags(allTags)
      return
    }

    const filtered = allTags.filter((tag) => tag.name.toLowerCase().includes(term.toLowerCase()))
    setFilteredTags(filtered)
  }, 300)

  // Update filtered tags when search term or all tags change
  useEffect(() => {
    filterTags(searchTerm)
  }, [searchTerm, allTags, filterTags])

  // Search media by selected tags
  useEffect(() => {
    if (selectedTags.length > 0) {
      searchMediaByTags(selectedTags.map((tag) => tag.id))
    }
  }, [selectedTags, searchMediaByTags])

  // Handle tag selection
  const handleTagSelect = (tag: Tag) => {
    // Only add the tag if it's not already selected
    if (!selectedTags.some((t) => t.id === tag.id)) {
      addTag(tag)
    }
  }

  // Handle media item click to open the viewer
  const handleMediaItemClick = (media: MediaItem) => {
    setSelectedMediaItem(media)
  }

  // Close the media viewer
  const handleCloseViewer = () => {
    setSelectedMediaItem(null)
  }

  // Navigate back to home
  const navigateToHome = () => {
    router.push("/")
  }

  // Get tags that are not already selected
  const unselectedTags = filteredTags.filter((tag) => !selectedTags.some((selectedTag) => selectedTag.id === tag.id))

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={navigateToHome}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Search Media by Tags</h1>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedTags.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => clearTags()} className="whitespace-nowrap">
                Clear All
              </Button>
            )}
          </div>

          {/* Selected tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
              {selectedTags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="pl-3 pr-2 py-1.5">
                  {tag.name}
                  <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 p-0" onClick={() => removeTag(tag.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          {/* Available tags */}
          <div className="flex flex-wrap gap-2">
            {unselectedTags.length > 0 ? (
              unselectedTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleTagSelect(tag)}
                >
                  {tag.name}
                </Badge>
              ))
            ) : searchTerm ? (
              <p className="text-sm text-gray-500">No matching tags found</p>
            ) : (
              <p className="text-sm text-gray-500">No more tags available</p>
            )}
          </div>
        </div>
      </div>

      {/* Search results */}
      <TagSearchResults results={searchResults} onMediaClick={handleMediaItemClick} />

      {/* Media viewer modal */}
      {selectedMediaItem && (
        <MediaViewerModal media={selectedMediaItem} allMedia={searchResults} onClose={handleCloseViewer} />
      )}
    </div>
  )
}
