import { validateBody } from '@server/utils/validation'
import { createMessageSchema } from '@server/schemas/message.schema'
import { successResponse } from '@server/utils/response'

/**
 * 创建留言
 *
 * Body 参数：
 * - content: 必填，1-150 字符
 * - image_url: 可选，URL 格式
 *
 * 认证：
 * - 已登录用户：使用 user_id
 * - 未登录访客：使用 visitor_id（Cookie）
 */
export default defineEventHandler(async (event) => {
  // 验证请求体
  const body = await validateBody(event, createMessageSchema)

  // 获取用户 session（使用 #auth 模块的 getServerSession）
  const { getServerSession } = await import('#auth')
  const session = await getServerSession(event)

  let userId: number | undefined
  let visitorId: string | undefined

  if ((session as any)?.user) {
    // 已登录用户：从数据库获取 user_id
    const { usersService } = await import('@server/services/users.service')
    const sessionUser = (session as any).user
    const provider = sessionUser.provider as 'github' | 'google'
    const providerAccountId = sessionUser.id as string

    userId = usersService.findUserIdByProvider(provider, providerAccountId)
  } else {
    // 未登录访客：使用 visitor_id
    visitorId = getCookie(event, 'visitor_id')

    // 如果没有 visitor_id，生成新的并设置到 cookie
    if (!visitorId) {
      visitorId = crypto.randomUUID()
      setCookie(event, 'visitor_id', visitorId, {
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365 * 2, // 2 年
      })
    }
  }

  // 创建留言
  const { messagesService } = await import('@server/services/messages.service')
  const result = messagesService.create({
    user_id: userId,
    visitor_id: visitorId,
    content: body.content,
    image_url: body.image_url,
  })

  return successResponse({
    id: result.lastInsertRowid as number,
    user_id: userId,
    visitor_id: visitorId,
    content: body.content,
    image_url: body.image_url,
  }, '留言成功')
})
