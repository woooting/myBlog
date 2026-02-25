import { tagsService } from '@server/services/tags.service'
import { validateBody, validateParams } from '@server/utils/validation'
import { updateTagSchema, tagParamsSchema } from '@server/schemas/tag.schema'

/**
 * 更新标签
 * PUT /api/tags/:id
 *
 * 路径参数：
 * - id: 标签 ID
 *
 * 请求体：
 * - name: 标签名称（可选）
 * - desc: 标签描述（可选）
 */
export default defineEventHandler((event) => {
  const { id } = validateParams(event, tagParamsSchema)
  const body = validateBody(event, updateTagSchema)

  const updateData: Record<string, any> = {}
  if (body.name !== undefined) {
    updateData.name = body.name
    updateData.slug = body.name.toLowerCase().replace(/\s+/g, '-')
  }
  if (body.desc !== undefined) {
    updateData.desc = body.desc
  }

  const result = tagsService.update(id, updateData)

  return {
    success: true,
    code: 200,
    message: '更新标签成功',
    data: {
      changes: result.changes,
    },
  }
})
