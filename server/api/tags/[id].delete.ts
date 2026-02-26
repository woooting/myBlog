import { tagsService } from '@server/services/tags.service'
import { validateParams } from '@server/utils/validation'
import { tagParamsSchema } from '@server/schemas/tag.schema'

/**
 * 删除标签
 * DELETE /api/tags/:id
 *
 * 路径参数：
 * - id: 标签 ID
 *
 * 注意：删除标签会自动级联删除 post_tags 中的关联记录
 */
export default defineEventHandler(async (event) => {
  const { id } = await validateParams(event, tagParamsSchema)

  const result = tagsService.delete(id)

  return {
    success: true,
    code: 200,
    message: '删除标签成功',
    data: {
      changes: result.changes,
    },
  }
})
