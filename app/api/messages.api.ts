import { useRequest } from '@app/composables/useApi'

/**
 * 留言数据模型
 */
export interface Message {
  id: number
  user_id?: number
  visitor_id?: string
  content: string
  image_url?: string
  created_at: string
  // 用户信息（从 JOIN 查询获取）
  username?: string
  user_avatar?: string
  is_guest?: boolean // 0 = 登录用户, 1 = 访客
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
 * 创建留言
 */
export const create = async (data: { content: string; image_url?: string }) => {
  const { request } = useRequest()
  return request<Message>('/api/messages', {
    method: 'POST',
    body: data,
    showToast: true,
  })
}

/**
 * 获取留言列表（分页）
 */
export const getList = async (params: { page: number; pageSize?: number }) => {
  const { request } = useRequest()
  return request<PaginatedMessages>('/api/messages', {
    params,
  })
}

/**
 * 删除留言（带成功提示）
 */
export const remove = (id: number) => {
  const { request } = useRequest()
  return request(`/api/messages/${id}`, {
    method: 'DELETE',
    showToast: true,
  })
}