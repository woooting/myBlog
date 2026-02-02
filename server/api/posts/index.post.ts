import { validateBody } from '@server/utils/validation'
import { createPostSchema } from '@server/schemas/post.schema'

/**
 * 创建文章
 *
 * Body 参数：
 * - title: 必填，1-200 字符
 * - content: 必填
 * - summary: 可选
 * - status: 可选，默认 draft
 * - category: 可选
 * - tags: 可选，字符串数组
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
    tags: body.tags ? JSON.stringify(body.tags) : undefined,
    cover_image: body.cover_image,
  })

  return {
    success: true,
    data: {
      id: result.lastInsertRowid as number,
      ...body,
    },
  }
})
