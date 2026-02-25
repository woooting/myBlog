import { tagsService } from '@server/services/tags.service'
import { validateQuery } from '@server/utils/validation'
import { getTagListQuerySchema } from '@server/schemas/tag.schema'

/**
 * 获取标签列表
 * GET /api/tags
 *
 * 查询参数：
 * - page: 页码（默认 1）
 * - pageSize: 每页数量（默认 20，最大 50）
 * - sort: 排序字段（count/name/created_at，默认 count）
 * - order: 排序方向（asc/desc，默认 desc）
 */
export default defineEventHandler((event) => {
  const query = validateQuery(event, getTagListQuerySchema)

  const result = tagsService.getList(query)

  return {
    success: true,
    code: 200,
    message: '获取标签列表成功',
    data: result.data,
    pagination: result.pagination,
  }
})
