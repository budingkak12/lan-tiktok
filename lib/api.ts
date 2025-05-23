// API client for interacting with the backend
import type { MediaItem, Tag, Folder, SortingMode } from "./types"
import { mockMediaItems, mockTags, mockFolders, getSortedMediaItems, filterMediaItemsByTags } from "./mock-data"
import { getConfig, isDemoMode } from "./config"

// Helper function for API requests
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // 如果是演示模式，直接使用模拟数据
  if (isDemoMode()) {
    return getMockData<T>(endpoint)
  }

  // 确保 endpoint 不是一个绝对路径
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`

  // 从配置获取 API URL
  const config = getConfig()
  let baseUrl = config.apiBaseUrl
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = `http://${baseUrl}`
  }

  const url = `${baseUrl}${cleanEndpoint}`

  try {
    if (config.debug) {
      console.log(`Fetching from: ${url}`)
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    // Check if the response is JSON
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      // 尝试获取响应文本以提供更好的错误信息
      const text = await response.text()
      console.error(
        `Expected JSON response but got ${contentType || "unknown content type"}. Response text:`,
        text.substring(0, 500) + (text.length > 500 ? "..." : ""),
      )

      throw new Error(`API 返回了非 JSON 格式的响应 (${contentType || "未知类型"})`)
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `服务器返回 ${response.status}: ${response.statusText}`,
      }))
      throw new Error(error.message || "获取数据时发生错误")
    }

    return response.json()
  } catch (error) {
    console.error(`API request failed for ${url}:`, error)
    throw error
  }
}

// 根据 endpoint 获取模拟数据
function getMockData<T>(endpoint: string): T {
  if (getConfig().debug) {
    console.log(`Getting mock data for: ${endpoint}`)
  }

  // 媒体列表
  if (endpoint.startsWith("/api/media") && !endpoint.includes("/tags/")) {
    const sortBy = endpoint.includes("sort_by=") ? endpoint.split("sort_by=")[1].split("&")[0] : SortingMode.RECENT
    return getSortedMediaItems(sortBy as SortingMode) as unknown as T
  }

  // 标签列表
  if (endpoint === "/api/tags") {
    return mockTags as unknown as T
  }

  // 根文件夹
  if (endpoint === "/api/folders") {
    return mockFolders.filter((f) => f.parentId === null) as unknown as T
  }

  // 标签搜索
  if (endpoint.startsWith("/api/search/tags")) {
    const tagIds = endpoint.includes("tag_ids=")
      ? endpoint
          .split("tag_ids=")[1]
          .split("&")
          .map((id) => decodeURIComponent(id))
      : []
    return filterMediaItemsByTags(tagIds) as unknown as T
  }

  // 默认返回空数组
  return [] as unknown as T
}

/**
 * 编码路径参数，确保中文和特殊字符正确处理
 * 保留路径分隔符，但编码其他特殊字符
 */
function encodePathParam(param: string): string {
  // 先完全编码
  const encoded = encodeURIComponent(param)
  // 然后将路径分隔符恢复
  return encoded.replace(/%2F/g, "/")
}

/**
 * 获取媒体文件的完整 URL
 */
export function getMediaUrl(path: string): string {
  if (!path) return "/placeholder.svg"

  // 如果是演示模式，使用模拟路径
  if (isDemoMode()) {
    return path
  }

  // 如果是绝对 URL，直接返回
  if (path.startsWith("http")) return path

  // 确保路径以斜杠开头
  const cleanPath = path.startsWith("/") ? path : `/${path}`

  // 从配置获取媒体 URL
  const config = getConfig()
  let baseUrl = config.mediaBaseUrl
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    baseUrl = `http://${baseUrl}`
  }

  return `${baseUrl}${cleanPath}`
}

// Media API functions
export async function getMediaItems(sortBy: SortingMode): Promise<MediaItem[]> {
  try {
    return await apiRequest<MediaItem[]>(`/api/media?sort_by=${sortBy}`)
  } catch (error) {
    console.error("Failed to get media items:", error)
    // 如果是演示模式，返回模拟数据；否则抛出错误
    if (isDemoMode()) {
      return getSortedMediaItems(sortBy)
    }
    throw error
  }
}

export async function searchMediaByTags(tagIds: string[]): Promise<MediaItem[]> {
  try {
    const tagIdsEncoded = tagIds.map(encodePathParam).join("&tag_ids=")
    return await apiRequest<MediaItem[]>(`/api/search/tags?tag_ids=${tagIdsEncoded}`)
  } catch (error) {
    console.error("Failed to search media by tags:", error)
    // 如果是演示模式，返回模拟数据；否则抛出错误
    if (isDemoMode()) {
      return filterMediaItemsByTags(tagIds)
    }
    throw error
  }
}

export async function toggleMediaLike(mediaId: string, liked: boolean): Promise<MediaItem> {
  try {
    const formData = new FormData()
    formData.append("liked", String(liked))
    return await apiRequest<MediaItem>(`/api/media/${encodePathParam(mediaId)}/like`, {
      method: "POST",
      body: formData,
    })
  } catch (error) {
    console.error("Failed to toggle like:", error)
    // 如果是演示模式，更新模拟数据；否则抛出错误
    if (isDemoMode()) {
      const media = mockMediaItems.find((m) => m.id === mediaId)
      if (media) {
        media.liked = liked
        if (liked) media.likeCount++
        else if (media.likeCount > 0) media.likeCount--
      }
      return media || mockMediaItems[0]
    }
    throw error
  }
}

export async function toggleMediaFavorite(mediaId: string, favorited: boolean): Promise<MediaItem> {
  try {
    const formData = new FormData()
    formData.append("favorited", String(favorited))
    return await apiRequest<MediaItem>(`/api/media/${encodePathParam(mediaId)}/favorite`, {
      method: "POST",
      body: formData,
    })
  } catch (error) {
    console.error("Failed to toggle favorite:", error)
    // 如果是演示模式，更新模拟数据；否则抛出错误
    if (isDemoMode()) {
      const media = mockMediaItems.find((m) => m.id === mediaId)
      if (media) {
        media.favorited = favorited
      }
      return media || mockMediaItems[0]
    }
    throw error
  }
}

export async function deleteMediaItem(mediaId: string): Promise<void> {
  try {
    await apiRequest<void>(`/api/media/${encodePathParam(mediaId)}`, {
      method: "DELETE",
    })
  } catch (error) {
    console.error("Failed to delete media:", error)
    // 如果是演示模式，更新模拟数据；否则抛出错误
    if (isDemoMode()) {
      const index = mockMediaItems.findIndex((m) => m.id === mediaId)
      if (index !== -1) {
        mockMediaItems.splice(index, 1)
      }
      return
    }
    throw error
  }
}

export async function addTagToMedia(mediaId: string, tagId: string): Promise<{ message: string }> {
  try {
    return await apiRequest<{ message: string }>(
      `/api/media/${encodePathParam(mediaId)}/tags/${encodePathParam(tagId)}`,
      {
        method: "POST",
      },
    )
  } catch (error) {
    console.error("Failed to add tag to media:", error)
    // 如果是演示模式，更新模拟数据；否则抛出错误
    if (isDemoMode()) {
      const media = mockMediaItems.find((m) => m.id === mediaId)
      const tag = mockTags.find((t) => t.id === tagId)
      if (media && tag && !media.tags.some((t) => t.id === tagId)) {
        media.tags.push(tag)
      }
      return { message: "Tag added to media" }
    }
    throw error
  }
}

export async function removeTagFromMedia(mediaId: string, tagId: string): Promise<{ message: string }> {
  try {
    return await apiRequest<{ message: string }>(
      `/api/media/${encodePathParam(mediaId)}/tags/${encodePathParam(tagId)}`,
      {
        method: "DELETE",
      },
    )
  } catch (error) {
    console.error("Failed to remove tag from media:", error)
    // 如果是演示模式，更新模拟数据；否则抛出错误
    if (isDemoMode()) {
      const media = mockMediaItems.find((m) => m.id === mediaId)
      if (media) {
        media.tags = media.tags.filter((t) => t.id !== tagId)
      }
      return { message: "Tag removed from media" }
    }
    throw error
  }
}

// Tag API functions
export async function getTags(): Promise<Tag[]> {
  try {
    return await apiRequest<Tag[]>("/api/tags")
  } catch (error) {
    console.error("Failed to get tags:", error)
    // 如果是演示模式，返回模拟数据；否则抛出错误
    if (isDemoMode()) {
      return mockTags
    }
    throw error
  }
}

export async function createTag(name: string): Promise<Tag> {
  try {
    return await apiRequest<Tag>("/api/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
  } catch (error) {
    console.error("Failed to create tag:", error)
    // 如果是演示模式，更新模拟数据；否则抛出错误
    if (isDemoMode()) {
      const newTag = {
        id: `tag${mockTags.length + 1}`,
        name,
      }
      mockTags.push(newTag)
      return newTag
    }
    throw error
  }
}

// Folder API functions
export async function getRootFolders(): Promise<Folder[]> {
  try {
    return await apiRequest<Folder[]>("/api/folders")
  } catch (error) {
    console.error("Failed to get root folders:", error)
    // 如果是演示模式，返回模拟数据；否则抛出错误
    if (isDemoMode()) {
      return mockFolders.filter((f) => f.parentId === null)
    }
    throw error
  }
}

export async function getSubfolders(folderId: string): Promise<Folder[]> {
  try {
    return await apiRequest<Folder[]>(`/api/folders/${encodePathParam(folderId)}/subfolders`)
  } catch (error) {
    console.error("Failed to get subfolders:", error)
    // 如果是演示模式，返回模拟数据；否则抛出错误
    if (isDemoMode()) {
      return mockFolders.filter((f) => f.parentId === folderId)
    }
    throw error
  }
}

export async function getFolderMedia(folderId: string): Promise<MediaItem[]> {
  try {
    return await apiRequest<MediaItem[]>(`/api/folders/${encodePathParam(folderId)}/media`)
  } catch (error) {
    console.error("Failed to get folder media:", error)
    // 如果是演示模式，返回模拟数据；否则抛出错误
    if (isDemoMode()) {
      const folder = mockFolders.find((f) => f.id === folderId)
      if (!folder) return []
      return folder.mediaItems.map((id) => mockMediaItems.find((m) => m.id === id)).filter(Boolean) as MediaItem[]
    }
    throw error
  }
}

export async function getFolderBreadcrumb(folderId: string): Promise<Folder[]> {
  try {
    return await apiRequest<Folder[]>(`/api/folders/${encodePathParam(folderId)}/breadcrumb`)
  } catch (error) {
    console.error("Failed to get folder breadcrumb:", error)
    // 如果是演示模式，返回模拟数据；否则抛出错误
    if (isDemoMode()) {
      // 模拟面包屑
      const breadcrumb: Folder[] = []
      let currentFolder = mockFolders.find((f) => f.id === folderId)

      while (currentFolder) {
        breadcrumb.unshift(currentFolder)
        currentFolder = currentFolder.parentId ? mockFolders.find((f) => f.id === currentFolder?.parentId) : null
      }

      return breadcrumb
    }
    throw error
  }
}

// Media scanning API function
export async function scanMediaDirectory(
  path: string,
): Promise<{ message: string; media_count?: number; folder_count?: number }> {
  try {
    const formData = new FormData()
    formData.append("path", path)
    return await apiRequest<{ message: string; media_count: number; folder_count: number }>("/api/scan", {
      method: "POST",
      body: formData,
    })
  } catch (error) {
    console.error("Failed to scan media directory:", error)
    // 如果是演示模式，返回模拟数据；否则抛出错误
    if (isDemoMode()) {
      return {
        message: "模拟模式：已扫描 10 个媒体文件和 5 个文件夹",
        media_count: 10,
        folder_count: 5,
      }
    }
    throw error
  }
}

// 检查 API 是否可用
export async function checkApiAvailability(): Promise<boolean> {
  // 如果是演示模式，直接返回 false
  if (isDemoMode()) {
    return false
  }

  try {
    const config = getConfig()
    let baseUrl = config.apiBaseUrl
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `http://${baseUrl}`
    }

    // 使用 AbortController 设置超时
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3秒超时

    try {
      const response = await fetch(`${baseUrl}/`, {
        method: "HEAD", // 使用 HEAD 请求减少数据传输
        signal: controller.signal,
        // 添加 no-cors 模式，允许请求发送但无法读取响应内容
        // 这在开发环境中可以避免某些 CORS 错误
        mode: "no-cors",
      })

      clearTimeout(timeoutId)
      return true
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.warn("API server check failed:", fetchError)
      return false
    }
  } catch (error) {
    console.error("API availability check error:", error)
    return false
  }
}
