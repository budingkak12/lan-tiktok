import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Folder, MediaItem, Tag } from "./types"
import * as api from "./api"

export enum SortingMode {
  RECENT = "recent",
  OLDEST = "oldest",
  LIKES = "likes",
  ALPHABETICAL = "alphabetical",
}

interface MediaState {
  mediaItems: MediaItem[]
  currentIndex: number
  sortingMode: SortingMode
  isFetching: boolean
  error: string | null
  fetchMediaItems: () => Promise<void>
  setCurrentIndex: (index: number) => void
  setSortingMode: (mode: SortingMode) => void
  toggleLike: (mediaId: string) => void
  toggleFavorite: (mediaId: string) => void
  deleteMedia: (mediaId: string) => void
  addTagToMedia: (mediaId: string, tag: Tag) => void
  removeTagFromMedia: (mediaId: string, tagId: string) => void
  searchMediaByTags: (tagIds: string[]) => Promise<void>
  searchResults: MediaItem[]
  clearError: () => void
}

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      mediaItems: [],
      currentIndex: 0,
      sortingMode: SortingMode.RECENT,
      isFetching: false,
      error: null,
      searchResults: [],

      fetchMediaItems: async () => {
        set({ isFetching: true, error: null })
        try {
          const mediaItems = await api.getMediaItems(get().sortingMode)
          set({ mediaItems, isFetching: false })
        } catch (error: any) {
          console.error("Failed to fetch media items:", error)
          set({
            isFetching: false,
            error: error.message || "Failed to load media",
          })
        }
      },

      setCurrentIndex: (index) => {
        set({ currentIndex: index })
      },

      setSortingMode: (mode) => {
        set({ sortingMode: mode })
      },

      toggleLike: async (mediaId) => {
        const mediaItem = get().mediaItems.find((item) => item.id === mediaId)
        if (mediaItem) {
          try {
            await api.toggleMediaLike(mediaId, !mediaItem.liked)
            set((state) => ({
              mediaItems: state.mediaItems.map((item) =>
                item.id === mediaId ? { ...item, liked: !item.liked } : item,
              ),
              searchResults: state.searchResults.map((item) =>
                item.id === mediaId ? { ...item, liked: !item.liked } : item,
              ),
            }))
          } catch (error) {
            console.error("Failed to toggle like:", error)
          }
        }
      },

      toggleFavorite: async (mediaId) => {
        const mediaItem = get().mediaItems.find((item) => item.id === mediaId)
        if (mediaItem) {
          try {
            await api.toggleMediaFavorite(mediaId, !mediaItem.favorited)
            set((state) => ({
              mediaItems: state.mediaItems.map((item) =>
                item.id === mediaId ? { ...item, favorited: !item.favorited } : item,
              ),
              searchResults: state.searchResults.map((item) =>
                item.id === mediaId ? { ...item, favorited: !item.favorited } : item,
              ),
            }))
          } catch (error) {
            console.error("Failed to toggle favorite:", error)
          }
        }
      },

      deleteMedia: async (mediaId) => {
        try {
          await api.deleteMediaItem(mediaId)
          set((state) => ({
            mediaItems: state.mediaItems.filter((item) => item.id !== mediaId),
            searchResults: state.searchResults.filter((item) => item.id !== mediaId),
          }))
        } catch (error) {
          console.error("Failed to delete media:", error)
        }
      },

      addTagToMedia: async (mediaId, tag) => {
        try {
          await api.addTagToMedia(mediaId, tag.id)
          set((state) => ({
            mediaItems: state.mediaItems.map((item) =>
              item.id === mediaId ? { ...item, tags: [...item.tags, tag] } : item,
            ),
            searchResults: state.searchResults.map((item) =>
              item.id === mediaId ? { ...item, tags: [...item.tags, tag] } : item,
            ),
          }))
        } catch (error) {
          console.error("Failed to add tag to media:", error)
        }
      },

      removeTagFromMedia: async (mediaId, tagId) => {
        try {
          await api.removeTagFromMedia(mediaId, tagId)
          set((state) => ({
            mediaItems: state.mediaItems.map((item) =>
              item.id === mediaId ? { ...item, tags: item.tags.filter((tag) => tag.id !== tagId) } : item,
            ),
            searchResults: state.searchResults.map((item) =>
              item.id === mediaId ? { ...item, tags: item.tags.filter((tag) => tag.id !== tagId) } : item,
            ),
          }))
        } catch (error) {
          console.error("Failed to remove tag from media:", error)
        }
      },

      searchMediaByTags: async (tagIds) => {
        try {
          const searchResults = await api.searchMediaByTags(tagIds)
          set({ searchResults })
        } catch (error) {
          console.error("Failed to search media by tags:", error)
        }
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: "media-store",
    },
  ),
)

interface SearchState {
  allTags: Tag[]
  selectedTags: Tag[]
  isFetching: boolean
  error: string | null
  fetchTags: () => Promise<void>
  addTag: (tag: Tag) => void
  removeTag: (tagId: string) => void
  clearTags: () => void
  createTag: (name: string) => Promise<Tag | null>
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      allTags: [],
      selectedTags: [],
      isFetching: false,
      error: null,

      fetchTags: async () => {
        set({ isFetching: true, error: null })
        try {
          const tags = await api.getTags()
          set({ allTags: tags, isFetching: false })
        } catch (error) {
          console.error("Failed to fetch tags:", error)
          set({
            isFetching: false,
            error: "Failed to load tags",
          })
        }
      },

      addTag: (tag) => {
        set((state) => ({ selectedTags: [...state.selectedTags, tag] }))
      },

      removeTag: (tagId) => {
        set((state) => ({ selectedTags: state.selectedTags.filter((tag) => tag.id !== tagId) }))
      },

      clearTags: () => {
        set({ selectedTags: [] })
      },

      createTag: async (name: string) => {
        try {
          const newTag = await api.createTag(name)
          set((state) => ({ allTags: [...state.allTags, newTag] }))
          return newTag
        } catch (error) {
          console.error("Failed to create tag:", error)
          return null
        }
      },
    }),
    {
      name: "search-store",
    },
  ),
)

interface FileBrowserState {
  currentFolderId: string | null
  folderContents: {
    folders: Folder[]
    media: MediaItem[]
  }
  breadcrumb: Folder[]
  isLoading: boolean
  error: string | null
  navigateToFolder: (folderId: string | null) => Promise<void>
  navigateUp: () => void
}

export const useFileBrowserStore = create<FileBrowserState>()(
  persist(
    (set, get) => ({
      currentFolderId: null,
      folderContents: {
        folders: [],
        media: [],
      },
      breadcrumb: [],
      isLoading: false,
      error: null,

      navigateToFolder: async (folderId) => {
        set({ isLoading: true, error: null })
        try {
          const folders = folderId ? await api.getSubfolders(folderId) : await api.getRootFolders()
          const media = folderId ? await api.getFolderMedia(folderId) : []
          const breadcrumb = folderId ? await api.getFolderBreadcrumb(folderId) : []

          set({
            currentFolderId: folderId,
            folderContents: {
              folders: folders,
              media: media,
            },
            breadcrumb: breadcrumb,
            isLoading: false,
          })
        } catch (error) {
          console.error("Failed to navigate to folder:", error)
          set({
            isLoading: false,
            error: "Failed to load folder contents",
          })
        }
      },

      navigateUp: () => {
        const currentFolderId = get().currentFolderId
        if (currentFolderId) {
          const breadcrumb = get().breadcrumb
          if (breadcrumb.length > 1) {
            const parentFolderId = breadcrumb[breadcrumb.length - 2].id
            get().navigateToFolder(parentFolderId)
          } else {
            get().navigateToFolder(null) // Navigate to root
          }
        }
      },
    }),
    {
      name: "file-browser-store",
    },
  ),
)
