import { tagsService } from '@server/services/tags.service'

/**
 * 获取热门标签
 * GET /api/tags/popular
 *
 * 查询参数：
 * - limit: 返回数量（默认 10）
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Number(query.limit) || 10

  const result = tagsService.getPopularTags(limit)

  return {
    success: true,
    code: 200,
    message: '获取热门标签成功',
    data: result,
  }
})
