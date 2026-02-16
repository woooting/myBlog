import { validateQuery } from '@server/utils/validation'
import { paginationQuerySchema } from '@server/schemas/post.schema'
import { successResponse } from '@server/utils/response'

/**
 * 分页获取文章列表
 *
 * 查询参数：
 * - page: 页码（默认 1）
 * - pageSize: 每页条数（默认 10，最大 100）
 * - status: 可选的状态筛选
 * - category: 可选的分类筛选
 */
export default defineEventHandler(async (event) => {
  const query = await validateQuery(event, paginationQuerySchema)

  const { postsService } = await import('@server/services/posts.service')
  const result = postsService.getPaginated(query)

  return successResponse(result)
})
