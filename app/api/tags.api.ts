/**
 * 标签相关 API
 */

// ==================== 类型定义 ====================

export interface Tag {
  id: number
  name: string
  slug: string
  desc?: string
  count: number
  created_at: string
  updated_at: string
}

export interface CreateTagDto {
  name: string
  desc?: string
}

export interface UpdateTagDto {
  name?: string
  desc?: string
}

export interface TagListParams {
  page?: number
  pageSize?: number
  sort?: 'count' | 'name' | 'created_at'
  order?: 'asc' | 'desc'
}

export interface TagListResponse {
  data: Tag[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ==================== API 方法 ====================

/**
 * 获取标签列表
 */
export const getList = (params?: TagListParams) => {
  return useRequest().request<{ data: Tag[], pagination: { page: number, pageSize: number, total: number, totalPages: number } }>('/api/tags', { params })
}

/**
 * 根据 ID 获取标签
 */
export const getById = (id: number) => {
  return useRequest().request<Tag>(`/api/tags/${id}`)
}

/**
 * 创建标签（带成功提示）
 * 返回值：{ id: number }
 */
export const create = (data: CreateTagDto) => {
  return useRequest().request<{ id: number }>('/api/tags', {
    method: 'POST',
    body: data,
    showToast: true,
  })
}

/**
 * 更新标签（带成功提示）
 */
export const update = (id: number, data: UpdateTagDto) => {
  return useRequest().request<Tag>(`/api/tags/${id}`, {
    method: 'PUT',
    body: data,
    showToast: true,
  })
}

/**
 * 删除标签（带成功提示）
 */
export const remove = (id: number) => {
  return useRequest().request<void>(`/api/tags/${id}`, {
    method: 'DELETE',
    showToast: true,
  })
}

/**
 * 搜索标签
 */
export const search = (keyword: string, limit: number = 10) => {
  return useRequest().request<Tag[]>('/api/tags/search', {
    params: { q: keyword, limit },
  })
}

/**
 * 获取热门标签
 */
export const getPopular = (limit: number = 10) => {
  return useRequest().request<Tag[]>('/api/tags/popular', {
    params: { limit },
  })
}
