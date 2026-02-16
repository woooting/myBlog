import { z } from 'zod'

/**
 * 文章状态枚举
 */
export const postStatusEnum = z.enum(['draft', 'published'], {
  message: '状态必须是 draft 或 published',
})

/**
 * 创建文章的请求体验证
 */
export const createPostSchema = z.object({
  title: z.string()
    .min(1, { message: '标题不能为空' })
    .max(200, { message: '标题不能超过 200 字符' })
    .trim(),

  content: z.string()
    .min(1, { message: '内容不能为空' })
    .trim(),

  summary: z.string().trim().optional(),
  status: postStatusEnum.default('draft'),
  category: z.string().trim().optional(),
  tags: z.array(z.string()).optional(),

  // 可选的 URL 验证
  cover_image: z.string().url('封面图必须是有效的 URL').optional().or(z.literal('')),
})

/**
 * 推导类型：创建文章的输入
 */
export type CreatePostInput = z.infer<typeof createPostSchema>

/**
 * 更新文章的请求体验证（所有字段可选）
 */
export const updatePostSchema = createPostSchema.partial()

/**
 * 推导类型：更新文章的输入
 */
export type UpdatePostInput = z.infer<typeof updatePostSchema>

/**
 * 获取文章列表的查询参数验证
 */
export const getListQuerySchema = z.object({
  // 可选的状态筛选
  status: postStatusEnum.optional(),

  // 可选的分类筛选
  category: z.string().trim().optional(),

  // 可选的分页参数（预留）
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

/**
 * 推导类型：获取文章列表的查询参数
 */
export type GetListQuery = z.infer<typeof getListQuerySchema>

/**
 * 分页查询参数验证
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  status: postStatusEnum.optional(),
  category: z.string().trim().optional(),
})

/**
 * 推导类型：分页查询参数
 */
export type PaginationQuery = z.infer<typeof paginationQuerySchema>

/**
 * 路径参数验证：文章 ID
 */
export const postParamsSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, 'ID 必须是数字')
    .transform((val) => Number(val))
    .refine((val) => val > 0, 'ID 必须大于 0'),
})

/**
 * 推导类型：文章路径参数
 */
export type PostParams = z.infer<typeof postParamsSchema>

/**
 * 发布/撤回文章的请求体验证
 */
export const publishActionSchema = z.object({
  action: z.enum(['publish', 'unpublish'], {
    message: 'action 必须是 publish 或 unpublish',
  }),
})

/**
 * 推导类型：发布操作的输入
 */
export type PublishActionInput = z.infer<typeof publishActionSchema>

/**
 * 批量删除文章的请求体验证
 */
export const batchDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, { message: '至少选择一篇文章' }),
})

/**
 * 推导类型：批量删除的输入
 */
export type BatchDeleteInput = z.infer<typeof batchDeleteSchema>
