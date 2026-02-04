/**
 * 文章相关 API
 * 演示如何使用封装的 request 函数
 */
import { request } from '../composables/useApi'

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

// ==================== API 方法 ====================

export const postsApi = {
  /**
   * 获取文章列表
   */
  getList: (params?: GetListParams) =>
    request<Post[]>('/api/posts', { params }),

  /**
   * 获取文章列表（带成功提示）
   */
  getListWithToast: (params?: GetListParams) =>
    request<Post[]>('/api/posts', { params, showToast: true }),

  /**
   * 获取单篇文章
   */
  getById: (id: number) =>
    request<Post>(`/api/posts/${id}`),

  /**
   * 创建文章（带成功提示）
   */
  create: (data: CreatePostDto) =>
    request<Post>('/api/posts', {
      method: 'POST',
      body: data,
      showToast: true,
    }),

  /**
   * 创建文章（不带提示）
   */
  createSilent: (data: CreatePostDto) =>
    request<Post>('/api/posts', {
      method: 'POST',
      body: data,
    }),

  /**
   * 更新文章（带成功提示）
   */
  update: (id: number, data: UpdatePostDto) =>
    request<Post>(`/api/posts/${id}`, {
      method: 'PUT',
      body: data,
      showToast: true,
    }),

  /**
   * 删除文章（带成功提示）
   */
  delete: (id: number) =>
    request<void>(`/api/posts/${id}`, {
      method: 'DELETE',
      showToast: true,
    }),

  /**
   * 发布文章
   */
  publish: (id: number) =>
    request<Post>(`/api/posts/${id}/publish`, {
      method: 'POST',
      body: { action: 'publish' },
      showToast: true,
    }),

  /**
   * 撤回文章
   */
  unpublish: (id: number) =>
    request<Post>(`/api/posts/${id}/publish`, {
      method: 'POST',
      body: { action: 'unpublish' },
      showToast: true,
    }),
}

// ==================== 使用示例 ====================

/*
// 在 Vue 组件中使用

<script setup lang="ts">
import { postsApi } from '~/api/posts.api'

const posts = ref<Post[]>([])

// 获取列表（不显示提示）
async function fetchPosts() {
  try {
    posts.value = await postsApi.getList({ status: 'published' })
  } catch (error) {
    console.error('获取失败', error)
  }
}

// 创建文章（会显示成功/失败提示）
async function createPost() {
  try {
    const newPost = await postsApi.create({
      title: '新文章',
      content: '文章内容',
      status: 'draft',
    })
    console.log('创建成功', newPost)
  } catch (error) {
    console.error('创建失败', error)
    // toast 已经自动显示了，这里只需要处理其他逻辑
  }
}
</script>
*/
