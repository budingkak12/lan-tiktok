import { type MediaItem, type Tag, SortingMode, type Folder } from "./types"

// Mock tags
export const mockTags: Tag[] = [
  { id: "tag1", name: "Nature" },
  { id: "tag2", name: "Travel" },
  { id: "tag3", name: "Family" },
  { id: "tag4", name: "Food" },
  { id: "tag5", name: "Pets" },
  { id: "tag6", name: "Vacation" },
  { id: "tag7", name: "Friends" },
  { id: "tag8", name: "Selfie" },
  { id: "tag9", name: "Landscape" },
  { id: "tag10", name: "Architecture" },
]

// Mock media items
export const mockMediaItems: MediaItem[] = [
  {
    id: "media1",
    type: "image",
    path: "/images/image1.jpg",
    title: "Beautiful sunset",
    createdAt: "2023-05-15T18:30:00Z",
    liked: true,
    favorited: false,
    likeCount: 12,
    size: 2 * 1024 * 1024, // 2MB
    tags: [mockTags[0], mockTags[8]], // Nature, Landscape
  },
  {
    id: "media2",
    type: "video",
    path: "/videos/video1.mp4",
    title: "Beach waves",
    createdAt: "2023-05-20T14:20:00Z",
    liked: false,
    favorited: true,
    likeCount: 8,
    size: 4 * 1024 * 1024, // 4MB
    tags: [mockTags[0], mockTags[1], mockTags[5]], // Nature, Travel, Vacation
  },
  {
    id: "media3",
    type: "image",
    path: "/images/image2.jpg",
    title: "Mountain view",
    createdAt: "2023-06-01T10:15:00Z",
    liked: false,
    favorited: false,
    likeCount: 5,
    size: 1.5 * 1024 * 1024, // 1.5MB
    tags: [mockTags[0], mockTags[8]], // Nature, Landscape
  },
  {
    id: "media4",
    type: "image",
    path: "/images/image3.jpg",
    title: "City skyline",
    createdAt: "2023-06-10T20:45:00Z",
    liked: true,
    favorited: true,
    likeCount: 20,
    size: 3 * 1024 * 1024, // 3MB
    tags: [mockTags[1], mockTags[9]], // Travel, Architecture
  },
  {
    id: "media5",
    type: "video",
    path: "/videos/video2.mp4",
    title: "Family gathering",
    createdAt: "2023-06-15T16:30:00Z",
    liked: false,
    favorited: false,
    likeCount: 15,
    size: 8 * 1024 * 1024, // 8MB (large video)
    tags: [mockTags[2], mockTags[6]], // Family, Friends
  },
  {
    id: "media6",
    type: "image",
    path: "/images/image4.jpg",
    title: "Delicious dinner",
    createdAt: "2023-06-20T19:00:00Z",
    liked: true,
    favorited: false,
    likeCount: 10,
    size: 2.2 * 1024 * 1024, // 2.2MB
    tags: [mockTags[3]], // Food
  },
  {
    id: "media7",
    type: "image",
    path: "/images/image5.jpg",
    title: "My cat",
    createdAt: "2023-06-25T09:10:00Z",
    liked: false,
    favorited: true,
    likeCount: 18,
    size: 1.8 * 1024 * 1024, // 1.8MB
    tags: [mockTags[4]], // Pets
  },
  {
    id: "media8",
    type: "video",
    path: "/videos/video3.mp4",
    title: "Beach vacation",
    createdAt: "2023-07-01T11:20:00Z",
    liked: true,
    favorited: true,
    likeCount: 25,
    size: 6 * 1024 * 1024, // 6MB (large video)
    tags: [mockTags[1], mockTags[5]], // Travel, Vacation
  },
  {
    id: "media9",
    type: "image",
    path: "/images/image6.jpg",
    title: "Friends reunion",
    createdAt: "2023-07-05T21:30:00Z",
    liked: false,
    favorited: false,
    likeCount: 14,
    size: 2.5 * 1024 * 1024, // 2.5MB
    tags: [mockTags[6]], // Friends
  },
  {
    id: "media10",
    type: "image",
    path: "/images/image7.jpg",
    title: "Selfie at the park",
    createdAt: "2023-07-10T15:40:00Z",
    liked: true,
    favorited: false,
    likeCount: 9,
    size: 1.2 * 1024 * 1024, // 1.2MB
    tags: [mockTags[7]], // Selfie
  },
]

// Mock folder structure
export const mockFolders: Folder[] = [
  {
    id: "folder1",
    name: "Vacations",
    path: "/Vacations",
    createdAt: "2023-01-01T00:00:00Z",
    parentId: null,
    subfolders: ["folder2", "folder3"],
    mediaItems: ["media8"],
  },
  {
    id: "folder2",
    name: "Beach Trip 2023",
    path: "/Vacations/Beach Trip 2023",
    createdAt: "2023-05-15T00:00:00Z",
    parentId: "folder1",
    subfolders: [],
    mediaItems: ["media2"],
  },
  {
    id: "folder3",
    name: "Mountain Retreat",
    path: "/Vacations/Mountain Retreat",
    createdAt: "2023-06-01T00:00:00Z",
    parentId: "folder1",
    subfolders: [],
    mediaItems: ["media3"],
  },
  {
    id: "folder4",
    name: "Family",
    path: "/Family",
    createdAt: "2023-02-01T00:00:00Z",
    parentId: null,
    subfolders: ["folder5"],
    mediaItems: ["media5"],
  },
  {
    id: "folder5",
    name: "Gatherings",
    path: "/Family/Gatherings",
    createdAt: "2023-06-15T00:00:00Z",
    parentId: "folder4",
    subfolders: [],
    mediaItems: ["media9"],
  },
  {
    id: "folder6",
    name: "Pets",
    path: "/Pets",
    createdAt: "2023-03-01T00:00:00Z",
    parentId: null,
    subfolders: [],
    mediaItems: ["media7"],
  },
  {
    id: "folder7",
    name: "Food",
    path: "/Food",
    createdAt: "2023-04-01T00:00:00Z",
    parentId: null,
    subfolders: [],
    mediaItems: ["media6"],
  },
  {
    id: "folder8",
    name: "Landscapes",
    path: "/Landscapes",
    createdAt: "2023-05-01T00:00:00Z",
    parentId: null,
    subfolders: [],
    mediaItems: ["media1", "media4"],
  },
  {
    id: "folder9",
    name: "Selfies",
    path: "/Selfies",
    createdAt: "2023-07-01T00:00:00Z",
    parentId: null,
    subfolders: [],
    mediaItems: ["media10"],
  },
]

// Get folder by ID
export function getFolderById(folderId: string | null): Folder | undefined {
  if (!folderId) return undefined
  return mockFolders.find((folder) => folder.id === folderId)
}

// Get root folders (folders with no parent)
export function getRootFolders(): Folder[] {
  return mockFolders.filter((folder) => folder.parentId === null)
}

// Get subfolders of a folder
export function getSubfolders(parentId: string): Folder[] {
  return mockFolders.filter((folder) => folder.parentId === parentId)
}

// Get media items in a folder
export function getFolderMediaItems(folderId: string): MediaItem[] {
  const folder = getFolderById(folderId)
  if (!folder) return []

  return folder.mediaItems
    .map((mediaId) => {
      const media = mockMediaItems.find((item) => item.id === mediaId)
      return media!
    })
    .filter(Boolean)
}

// Get folder breadcrumb path
export function getFolderBreadcrumb(folderId: string): Folder[] {
  const breadcrumb: Folder[] = []
  let currentFolder = getFolderById(folderId)

  while (currentFolder) {
    breadcrumb.unshift(currentFolder)
    currentFolder = getFolderById(currentFolder.parentId)
  }

  return breadcrumb
}

// Sort media items by different criteria
export function getSortedMediaItems(sortingMode: SortingMode): MediaItem[] {
  const items = [...mockMediaItems]

  switch (sortingMode) {
    case SortingMode.RECENT:
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    case SortingMode.POPULAR:
      return items.sort((a, b) => b.likeCount - a.likeCount)
    case SortingMode.RANDOM:
      // Fisher-Yates shuffle algorithm
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[items[i], items[j]] = [items[j], items[i]]
      }
      return items
    default:
      return items
  }
}

// Filter media items by tags
export function filterMediaItemsByTags(tagIds: string[]): MediaItem[] {
  if (tagIds.length === 0) return []

  return mockMediaItems.filter((item) => {
    return tagIds.every((tagId) => item.tags.some((tag) => tag.id === tagId))
  })
}
