import { validateParams, validateBody } from '@server/utils/validation'
import { postParamsSchema, updatePostSchema } from '@server/schemas/post.schema'

/**
 * 更新文章
 *
 * 路径参数：
 * - id: 必填，文章 ID（正整数）
 *
 * Body 参数：
 * - title: 可选，1-200 字符
 * - content: 可选
 * - summary: 可选
 * - status: 可选，draft/published
 * - category: 可选
 * - tags: 可选，字符串数组
 * - cover_image: 可选，URL 格式
 */
export default defineEventHandler(async (event) => {
  // 验证路径参数
  const { id } = await validateParams(event, postParamsSchema)

  // 验证请求体（所有字段可选）
  const body = await validateBody(event, updatePostSchema)

  const { postsService } = await import('@server/services/posts.service')

  // 处理 tags 数组转 JSON 字符串
  const updateData = {
    ...body,
    tags: body.tags ? JSON.stringify(body.tags) : undefined,
  }

  postsService.update(id, updateData)

  return {
    success: true,
  }
})
