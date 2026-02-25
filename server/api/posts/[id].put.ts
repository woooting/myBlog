import { validateParams, validateBody } from '@server/utils/validation'
import { postParamsSchema, updatePostSchema } from '@server/schemas/post.schema'
import { successResponse } from '@server/utils/response'
import { tagsService } from '@server/services/tags.service'

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
 * - tagIds: 可选，标签 ID 数组（最多 3 个）
 * - cover_image: 可选，URL 格式
 */
export default defineEventHandler(async (event) => {
  // 验证路径参数
  const { id } = await validateParams(event, postParamsSchema)

  // 验证请求体（所有字段可选）
  const body = await validateBody(event, updatePostSchema)

  const { postsService } = await import('@server/services/posts.service')

  // 处理 tags 数组转 JSON 字符串（保留兼容性）
  const updateData = {
    ...body,
    tags: body.tags ? JSON.stringify(body.tags) : undefined,
  }

  // 移除 tagIds 从更新数据中（它不直接存在 posts 表中）
  const { tagIds, ...postUpdateData } = updateData as any

  postsService.update(id, postUpdateData)

  // 如果有 tagIds，更新文章-标签关联
  if (tagIds !== undefined) {
    tagsService.linkPostToTags(id, tagIds)
  }

  return successResponse(null, '文章更新成功')
})
