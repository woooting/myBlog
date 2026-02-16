/**
 * 文章相关 API
 * 演示如何使用封装的 request 函数
 */

// ==================== 类型定义 ====================

export interface Post {
  id: number
  title: string
  content: string
  summary?: string
  status: 'draft' | 'published'
  category?: string
  tags?: string[]
  cover_image?: string
  view_count?: number
  created_at: string
  updated_at: string
  published_at?: string
}

export interface CreatePostDto {
  title: string
  content: string
  summary?: string
  status?: 'draft' | 'published'
  category?: string
  tags?: string[]
  cover_image?: string
}

export interface UpdatePostDto extends Partial<CreatePostDto> {}

export interface GetListParams {
  status?: 'draft' | 'published'
  category?: string
  page?: number
  limit?: number
}

// 分页查询参数
export interface PaginatedParams {
  page?: number
  pageSize?: number
  status?: 'draft' | 'published'
  category?: string
}

// 分页响应数据
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ==================== API 方法 ====================

/**
 * 获取文章列表
 */
export const getList = (params?: GetListParams) => {
  return useRequest().request<Post[]>('/api/posts', { params })
}

/**
 * 获取文章列表(带成功提示)
 */
export const getListWithToast = (params?: GetListParams) => {
  return useRequest().request<Post[]>('/api/posts', { params, showToast: true })
}

/**
 * 分页获取文章列表
 */
export const getPaginatedList = (params?: PaginatedParams) => {
  return useRequest().request<PaginatedResponse<Post>>('/api/posts/paginated', { params })
}

/**
 * 获取单篇文章
 */
export const getById = (id: number) => {
  return useRequest().request<Post>(`/api/posts/${id}`)
}

/**
 * 创建文章(带成功提示)
 */
export const create = (data: CreatePostDto) => {
  return useRequest().request<Post>('/api/posts', {
    method: 'POST',
    body: data,
    showToast: true,
  })
}

/**
 * 创建文章(不带提示)
 */
export const createSilent = (data: CreatePostDto) => {
  return useRequest().request<Post>('/api/posts', {
    method: 'POST',
    body: data,
  })
}

/**
 * 更新文章(带成功提示)
 */
export const update = (id: number, data: UpdatePostDto) => {
  return useRequest().request<Post>(`/api/posts/${id}`, {
    method: 'PUT',
    body: data,
    showToast: true,
  })
}

/**
 * 删除文章(带成功提示)
 */
export const deletePost = (id: number) => {
  return useRequest().request<void>(`/api/posts/${id}`, {
    method: 'DELETE',
    showToast: true,
  })
}

/**
 * 批量删除文章(带成功提示)
 */
export const batchDeletePosts = (ids: number[]) => {
  return useRequest().request<{ count: number }>('/api/posts/batch-delete', {
    method: 'POST',
    body: { ids },
    showToast: true,
  })
}

/**
 * 发布文章
 */
export const publish = (id: number) => {
  return useRequest().request<Post>(`/api/posts/${id}/publish`, {
    method: 'POST',
    body: { action: 'publish' },
    showToast: true,
  })
}

/**
 * 撤回文章
 */
export const unpublish = (id: number) => {
  return useRequest().request<Post>(`/api/posts/${id}/publish`, {
    method: 'POST',
    body: { action: 'unpublish' },
    showToast: true,
  })
}