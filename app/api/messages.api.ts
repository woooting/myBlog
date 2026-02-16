import { useRequest } from '@app/composables/useApi'

/**
 * 留言数据模型
 */
export interface Message {
  id: number
  visitor_id: string
  content: string
  image_url?: string
  created_at: string
}

/**
 * 分页留言列表响应
 */
export interface PaginatedMessages {
  data: Message[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/**
 * 留言 API 封装
 */
export const messagesApi = {
  /**
   * 创建留言
   */
  async create(data: { content: string; image_url?: string }) {
    const { request } = useRequest()
    return request<Message>('/api/messages', {
      method: 'POST',
      body: data,
      showToast: true,
    })
  },

  /**
   * 获取留言列表（分页）
   */
  async getList(params: { page: number; pageSize?: number }) {
    const { request } = useRequest()
    return request<PaginatedMessages>('/api/messages', {
      params,
    })
  },
}
