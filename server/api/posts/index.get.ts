import { validateQuery } from '@server/utils/validation'
import { getListQuerySchema } from '@server/schemas/post.schema'
import { successResponse } from '@server/utils/response'

/**
 * 获取文章列表
 *
 * Query 参数：
 * - status: 可选，筛选状态（draft/published）
 * - category: 可选，筛选分类
 * - page: 可选，页码
 * - limit: 可选，每页数量（最大 100）
 */
export default defineEventHandler(async (event) => {
  // 验证查询参数
  const query = await validateQuery(event, getListQuerySchema)

  const { postsService } = await import('@server/services/posts.service')
  const posts = postsService.getList({
    status: query.status,
    category: query.category,
  })

  return successResponse(posts)
})
