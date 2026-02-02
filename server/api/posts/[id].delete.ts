import { validateParams } from '@server/utils/validation'
import { postParamsSchema } from '@server/schemas/post.schema'

/**
 * 删除文章
 *
 * 路径参数：
 * - id: 必填，文章 ID（正整数）
 */
export default defineEventHandler(async (event) => {
  // 验证路径参数
  const { id } = await validateParams(event, postParamsSchema)

  const { postsService } = await import('@server/services/posts.service')
  postsService.delete(id)

  return {
    success: true,
  }
})
