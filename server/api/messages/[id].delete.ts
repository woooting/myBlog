import { validateParams } from '@server/utils/validation'
import { messageParamsSchema } from '@server/schemas/message.schema'
import { successResponse } from '@server/utils/response'

/**
 * 删除留言
 *
 * Path 参数：
 * - id: 留言 ID（正整数）
 */
export default defineEventHandler(async (event) => {
  // 1️⃣ 验证路径参数
  const { id } = await validateParams(event, messageParamsSchema)

  // 2️⃣ 调用 Service
  const { messagesService } = await import('@server/services/messages.service')
  messagesService.delete(id)

  // 3️⃣ 统一响应
  return successResponse(null, '删除成功')
})
