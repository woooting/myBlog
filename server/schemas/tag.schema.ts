import { z } from 'zod'

/**
 * 创建标签的请求体验证
 */
export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, '标签名称不能为空')
    .max(20, '标签名称不能超过 20 字符')
    .trim()
    .refine((val) => !/[\s,，]/.test(val), '标签名称不能包含空格或逗号'),
  desc: z.string().max(100).optional(),
})

/**
 * 推导类型：创建标签的输入
 */
export type CreateTagInput = z.infer<typeof createTagSchema>

/**
 * 更新标签的请求体验证（所有字段可选）
 */
export const updateTagSchema = createTagSchema.partial()

/**
 * 推导类型：更新标签的输入
 */
export type UpdateTagInput = z.infer<typeof updateTagSchema>

/**
 * 更新文章标签的请求体验证
 */
export const updatePostTagsSchema = z.object({
  tagIds: z
    .array(z.number().int().positive())
    .min(1, '至少选择一个标签')
    .max(3, '最多选择 3 个标签')
    .refine((ids) => new Set(ids).size === ids.length, '标签不能重复'),
})

/**
 * 推导类型：更新文章标签的输入
 */
export type UpdatePostTagsInput = z.infer<typeof updatePostTagsSchema>

/**
 * 标签搜索查询参数验证
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1, '搜索关键词不能为空'),
  limit: z.coerce.number().int().positive().max(50).default(10),
})

/**
 * 推导类型：标签搜索查询参数
 */
export type SearchQuery = z.infer<typeof searchQuerySchema>

/**
 * 文章搜索查询参数验证
 */
export const postSearchQuerySchema = z.object({
  q: z.string().min(1, '搜索关键词不能为空'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
})

/**
 * 推导类型：文章搜索查询参数
 */
export type PostSearchQuery = z.infer<typeof postSearchQuerySchema>

/**
 * 标签列表查询参数验证
 */
export const getTagListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
  sort: z.enum(['count', 'name', 'created_at']).default('count'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * 推导类型：标签列表查询参数
 */
export type GetTagListQuery = z.infer<typeof getTagListQuerySchema>

/**
 * 路径参数验证：标签 ID
 */
export const tagParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'ID 必须是数字')
    .transform((val) => Number(val))
    .refine((val) => val > 0, 'ID 必须大于 0'),
})

/**
 * 推导类型：标签路径参数
 */
export type TagParams = z.infer<typeof tagParamsSchema>
