import { validateQuery } from '@server/utils/validation'
import { getMessagesQuerySchema } from '@server/schemas/message.schema'
import { successResponse } from '@server/utils/response'

/**
 * 获取留言列表（分页）
 *
 * Query 参数：
 * - page: 页码，默认 1
 * - pageSize: 每页数量，默认 15，最大 50
 */
export default defineEventHandler(async (event) => {
  // 验证查询参数
  const query = await validateQuery(event, getMessagesQuerySchema)

  const { messagesService } = await import('@server/services/messages.service')
  const result = messagesService.getPaginated({
    page: query.page,
    pageSize: query.pageSize,
  })

  return successResponse(result)
})
