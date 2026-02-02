import type { EventHandlerRequest, H3Event } from 'h3'
import { z } from 'zod'
import { errors } from '@server/utils/response'

/**
 * Zod 验证错误的详细信息
 */
interface ValidationError {
  path: string[]
  message: string
  code: string
}

/**
 * 格式化 Zod 错误为可读的消息
 */
function formatZodError(error: z.ZodError): string {
  const formattedErrors: ValidationError[] = error.errors.map((issue) => ({
    path: issue.path,
    message: issue.message,
    code: issue.code,
  }))

  // 简洁格式：只返回第一个错误的消息
  // 如果需要详细错误，可以返回 formattedErrors
  return formattedErrors
    .map((e) => e.path.length > 0 ? `${e.path.join('.')}: ${e.message}` : e.message)
    .join('; ')
}

/**
 * 验证请求体（使用 safeParse）
 *
 * @param event - H3 事件对象
 * @param schema - Zod schema
 * @returns 验证通过后的数据
 * @throws 400 错误当验证失败时
 */
export async function validateBody<T>(
  event: H3Event<EventHandlerRequest>,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const result = await readValidatedBody(event, schema.safeParse)

  if (!result.success) {
    throw errors.badRequest(formatZodError(result.error))
  }

  return result.data
}

/**
 * 验证查询参数（使用 safeParse）
 *
 * @param event - H3 事件对象
 * @param schema - Zod schema
 * @returns 验证通过后的数据
 * @throws 400 错误当验证失败时
 */
export async function validateQuery<T>(
  event: H3Event<EventHandlerRequest>,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const result = await getValidatedQuery(event, schema.safeParse)

  if (!result.success) {
    throw errors.badRequest(formatZodError(result.error))
  }

  return result.data
}

/**
 * 验证路由参数（使用 safeParse）
 *
 * @param event - H3 事件对象
 * @param schema - Zod schema
 * @returns 验证通过后的数据
 * @throws 400 错误当验证失败时
 */
export async function validateParams<T>(
  event: H3Event<EventHandlerRequest>,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const result = await getValidatedRouterParams(event, schema.safeParse)

  if (!result.success) {
    throw errors.badRequest(formatZodError(result.error))
  }

  return result.data
}

/**
 * 验证请求体（使用 parse，直接抛出异常）
 *
 * @param event - H3 事件对象
 * @param schema - Zod schema
 * @returns 验证通过后的数据
 */
export async function validateBodyOrThrow<T>(
  event: H3Event<EventHandlerRequest>,
  schema: z.ZodSchema<T>,
): Promise<T> {
  return await readValidatedBody(event, schema.parse)
}

/**
 * 验证查询参数（使用 parse，直接抛出异常）
 *
 * @param event - H3 事件对象
 * @param schema - Zod schema
 * @returns 验证通过后的数据
 */
export async function validateQueryOrThrow<T>(
  event: H3Event<EventHandlerRequest>,
  schema: z.ZodSchema<T>,
): Promise<T> {
  return await getValidatedQuery(event, schema.parse)
}

/**
 * 验证路由参数（使用 parse，直接抛出异常）
 *
 * @param event - H3 事件对象
 * @param schema - Zod schema
 * @returns 验证通过后的数据
 */
export async function validateParamsOrThrow<T>(
  event: H3Event<EventHandlerRequest>,
  schema: z.ZodSchema<T>,
): Promise<T> {
  return await getValidatedRouterParams(event, schema.parse)
}
