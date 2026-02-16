import { z } from 'zod'

/**
 * 创建留言的请求体验证
 */
export const createMessageSchema = z.object({
  content: z.string()
    .min(1, { message: '留言内容不能为空' })
    .max(150, { message: '留言内容不能超过 150 字' })
    .trim(),
  image_url: z.union([
    z.string().min(1, '图片URL不能为空'),
    z.literal('')
  ]).optional(),
})

/**
 * 推导类型：创建留言的输入
 */
export type CreateMessageInput = z.infer<typeof createMessageSchema>

/**
 * 获取留言列表的查询参数验证
 */
export const getMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(15),
})

/**
 * 推导类型：获取留言列表的查询参数
 */
export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>
