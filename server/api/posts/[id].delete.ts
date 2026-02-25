import { validateParams } from '@server/utils/validation'
import { postParamsSchema } from '@server/schemas/post.schema'
import { successResponse } from '@server/utils/response'
import { tagsService } from '@server/services/tags.service'

/**
 * 删除文章
 *
 * 路径参数：
 * - id: 必填，文章 ID（正整数）
 */
export default defineEventHandler(async (event) => {
  // 验证路径参数
  const { id } = await validateParams(event, postParamsSchema)

  // 获取文章的标签，以便更新统计
  const postTags = tagsService.getTagsByPostId(id)

  const { postsService } = await import('@server/services/posts.service')
  postsService.delete(id)

  // 更新标签统计（级联删除会自动清理 post_tags，但需要手动更新 count）
  for (const tag of postTags as Array<{ id: number }>) {
    tagsService.updateCount(tag.id, -1)
  }

  return successResponse(null, '文章删除成功')
})
