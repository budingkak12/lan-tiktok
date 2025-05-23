export interface MediaItem {
  id: string
  type: "image" | "video"
  path: string
  title?: string
  createdAt: string
  liked: boolean
  favorited: boolean
  likeCount: number
  size: number
  tags: Tag[]
}

export interface Tag {
  id: string
  name: string
}

export enum SortingMode {
  RECENT = "recent",
  POPULAR = "popular",
  RANDOM = "random",
}

export interface Folder {
  id: string
  name: string
  path: string
  createdAt: string
  parentId: string | null
  subfolders: string[] // Array of folder IDs
  mediaItems: string[] // Array of media IDs
}

export interface Settings {
  mediaPath: string | null
}
