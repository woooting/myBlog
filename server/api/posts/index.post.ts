import { validateBody } from '@server/utils/validation'
import { createPostSchema } from '@server/schemas/post.schema'
import { successResponse } from '@server/utils/response'
import { tagsService } from '@server/services/tags.service'

/**
 * 创建文章
 *
 * Body 参数：
 * - title: 必填，1-200 字符
 * - content: 必填
 * - summary: 可选
 * - status: 可选，默认 draft
 * - category: 可选
 * - tagIds: 可选，标签 ID 数组（最多 3 个）
 * - cover_image: 可选，URL 格式
 */
export default defineEventHandler(async (event) => {
  // 验证请求体
  const body = await validateBody(event, createPostSchema)

  const { postsService } = await import('@server/services/posts.service')
  const result = postsService.create({
    title: body.title,
    content: body.content,
    summary: body.summary,
    status: body.status,
    category: body.category,
    // 保留 tags 字段的兼容性
    tags: body.tags ? JSON.stringify(body.tags) : undefined,
    cover_image: body.cover_image,
  })

  const postId = result.lastInsertRowid as number

  // 如果有 tagIds，建立文章-标签关联
  if (body.tagIds && Array.isArray(body.tagIds) && body.tagIds.length > 0) {
    tagsService.linkPostToTags(postId, body.tagIds)
  }

  return successResponse({
    id: postId,
    ...body,
  }, '文章创建成功')
})
