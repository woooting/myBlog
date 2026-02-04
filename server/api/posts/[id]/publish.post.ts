import { validateParams, validateBody } from '@server/utils/validation'
import { postParamsSchema, publishActionSchema } from '@server/schemas/post.schema'
import { successResponse } from '@server/utils/response'

/**
 * 发布/撤回文章
 *
 * 路径参数：
 * - id: 必填，文章 ID（正整数）
 *
 * Body 参数：
 * - action: 必填，"publish" 或 "unpublish"
 */
export default defineEventHandler(async (event) => {
  // 验证路径参数
  const { id } = await validateParams(event, postParamsSchema)

  // 验证请求体
  const { action } = await validateBody(event, publishActionSchema)

  const { postsService } = await import('@server/services/posts.service')

  if (action === 'publish') {
    postsService.publish(id)
    return successResponse(null, '文章已发布')
  } else {
    postsService.unpublish(id)
    return successResponse(null, '文章已撤回')
  }
})
