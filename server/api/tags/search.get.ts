import { tagsService } from '@server/services/tags.service'
import { validateQuery } from '@server/utils/validation'
import { searchQuerySchema } from '@server/schemas/tag.schema'

/**
 * 标签模糊匹配搜索
 * GET /api/tags/search
 *
 * 查询参数：
 * - q: 搜索关键词（必填）
 * - limit: 返回数量限制（默认 10，最大 50）
 *
 * 搜索规则：
 * - 不区分大小写
 * - 精确匹配优先
 * - 按使用频率降序
 * - 按名称字母排序
 */
export default defineEventHandler(async (event) => {
  const query = await validateQuery(event, searchQuerySchema)

  const results = tagsService.searchByName(query.q, query.limit)

  return {
    success: true,
    code: 200,
    message: '搜索成功',
    data: results,
  }
})
