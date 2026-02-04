import { validateParams } from '@server/utils/validation'
import { postParamsSchema } from '@server/schemas/post.schema'
import { successResponse } from '@server/utils/response'

/**
 * 获取文章详情
 *
 * 路径参数：
 * - id: 必填，文章 ID（正整数）
 */
export default defineEventHandler(async (event) => {
  // 验证路径参数
  const { id } = await validateParams(event, postParamsSchema)

  const { postsService } = await import('@server/services/posts.service')
  const post = postsService.getById(id)

  return successResponse(post)
})
