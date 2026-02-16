import { validateBody } from '@server/utils/validation'
import { createMessageSchema } from '@server/schemas/message.schema'
import { successResponse } from '@server/utils/response'

/**
 * 创建留言
 *
 * Body 参数：
 * - content: 必填，1-150 字符
 * - image_url: 可选，URL 格式
 */
export default defineEventHandler(async (event) => {
  // 验证请求体
  const body = await validateBody(event, createMessageSchema)

  // 生成随机访客ID
  const visitorId = crypto.randomUUID()

  const { messagesService } = await import('@server/services/messages.service')
  const result = messagesService.create({
    visitor_id: visitorId,
    content: body.content,
    image_url: body.image_url,
  })

  return successResponse({
    id: result.lastInsertRowid as number,
    visitor_id: visitorId,
    content: body.content,
    image_url: body.image_url,
  }, '留言成功')
})
