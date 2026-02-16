import { validateBody } from '@server/utils/validation'
import { batchDeleteSchema } from '@server/schemas/post.schema'
import { successResponse } from '@server/utils/response'

/**
 * 批量删除文章
 *
 * 请求体参数：
 * - ids: 数字数组，要删除的文章 ID 列表
 */
export default defineEventHandler(async (event) => {
  // 验证请求体
  const { ids } = await validateBody(event, batchDeleteSchema)

  const { postsService } = await import('@server/services/posts.service')
  const result = postsService.batchDelete(ids)

  return successResponse(result, `成功删除 ${result.count} 篇文章`)
})
