// API client for interacting with the backend
import type { MediaItem, Tag, Folder, SortingMode } from "./types"
// Removed mock-data imports
import { getConfig } from "./config" // Removed isDemoMode import

// Helper function for API requests
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Removed demo mode check block

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

// Removed getMockData<T> function entirely

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

  // Removed demo mode check for path

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
    // Removed demo mode fallback
    throw error
  }
}

export async function searchMediaByTags(tagIds: string[]): Promise<MediaItem[]> {
  try {
    const tagIdsEncoded = tagIds.map(encodePathParam).join("&tag_ids=")
    return await apiRequest<MediaItem[]>(`/api/search/tags?tag_ids=${tagIdsEncoded}`)
  } catch (error) {
    console.error("Failed to search media by tags:", error)
    // Removed demo mode fallback
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
    // Removed demo mode fallback
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
    // Removed demo mode fallback
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
    // Removed demo mode fallback
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
    // Removed demo mode fallback
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
    // Removed demo mode fallback
    throw error
  }
}

// Tag API functions
export async function getTags(): Promise<Tag[]> {
  try {
    return await apiRequest<Tag[]>("/api/tags")
  } catch (error) {
    console.error("Failed to get tags:", error)
    // Removed demo mode fallback
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
    // Removed demo mode fallback
    throw error
  }
}

// Folder API functions
export async function getRootFolders(): Promise<Folder[]> {
  try {
    return await apiRequest<Folder[]>("/api/folders")
  } catch (error) {
    console.error("Failed to get root folders:", error)
    // Removed demo mode fallback
    throw error
  }
}

export async function getSubfolders(folderId: string): Promise<Folder[]> {
  try {
    return await apiRequest<Folder[]>(`/api/folders/${encodePathParam(folderId)}/subfolders`)
  } catch (error) {
    console.error("Failed to get subfolders:", error)
    // Removed demo mode fallback
    throw error
  }
}

export async function getFolderMedia(folderId: string): Promise<MediaItem[]> {
  try {
    return await apiRequest<MediaItem[]>(`/api/folders/${encodePathParam(folderId)}/media`)
  } catch (error) {
    console.error("Failed to get folder media:", error)
    // Removed demo mode fallback
    throw error
  }
}

export async function getFolderBreadcrumb(folderId: string): Promise<Folder[]> {
  try {
    return await apiRequest<Folder[]>(`/api/folders/${encodePathParam(folderId)}/breadcrumb`)
  } catch (error) {
    console.error("Failed to get folder breadcrumb:", error)
    // Removed demo mode fallback
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
      body: formData, // FormData is not JSON, Content-Type header will be set by browser
    })
  } catch (error) {
    console.error("Failed to scan media directory:", error)
    // Removed demo mode fallback
    throw error
  }
}

// 检查 API 是否可用
export async function checkApiAvailability(): Promise<boolean> {
  // Removed demo mode check

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
