/**
 * 搜索 API
 */

/**
 * 搜索结果中的文章项
 */
export interface SearchPostItem {
  id: number
  title: string
  summary?: string
  cover_image?: string
  status: string
  tagIds: number[]
  tagNames: string[]
}

/**
 * 搜索响应
 */
export interface SearchResponse {
  data: SearchPostItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ==================== API 方法 ====================

/**
 * 搜索文章
 */
export const searchPosts = (params: {
  q: string
  page?: number
  pageSize?: number
}) => {
  return useRequest().request<SearchResponse>('/api/search/posts', {
    params: {
      q: params.q,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 10,
    },
  })
}
