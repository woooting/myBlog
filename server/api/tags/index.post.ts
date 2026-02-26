import { tagsService } from '@server/services/tags.service'
import { validateBody } from '@server/utils/validation'
import { createTagSchema } from '@server/schemas/tag.schema'

/**
 * 创建标签
 * POST /api/tags
 *
 * 请求体：
 * - name: 标签名称（必填，1-20字符，不能包含空格或逗号）
 * - desc: 标签描述（可选，最多100字符）
 */
export default defineEventHandler(async (event) => {
  const body =  await validateBody(event, createTagSchema)

  const result = tagsService.create({
    name: body.name,
    slug: body.name.toLowerCase().replace(/\s+/g, '-'),
    desc: body.desc,
  })

  return {
    success: true,
    code: 201,
    message: '创建标签成功',
    data: {
      id: result.lastInsertRowid,
    },
  }
})
