import { validateQuery } from '@server/utils/validation'
import { postSearchQuerySchema } from '@server/schemas/tag.schema'
import { successResponse } from '@server/utils/response'

/**
 * 文章搜索（标题或标签匹配）
 * GET /api/search/posts
 *
 * 查询参数：
 * - q: 搜索关键词（必填）
 * - page: 页码（默认 1）
 * - pageSize: 每页数量（默认 10，最大 50）
 *
 * 搜索范围：
 * - 文章标题（模糊匹配）
 * - 文章标签（精确匹配）
 */
export default defineEventHandler(async (event) => {
  const query = await validateQuery(event, postSearchQuerySchema)

  const { searchService } = await import('@server/services/search.service')
  const result = searchService.searchPosts(query)

  return successResponse(result)
})
