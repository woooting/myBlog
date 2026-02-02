/**
 * 统一 API 响应格式工具
 */

/**
 * 统一响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  code: number
  message: string
  data?: T
}

/**
 * 成功响应
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    code: 200,
    message: message || '操作成功',
    data,
  }
}

/**
 * 错误响应（抛出错误）
 * @internal 使用 errors 对象中的方法来创建错误响应
 */
function errorResponse(code: number, message: string): never {
  throw createError({
    statusCode: code,
    message: message,
    data: {
      success: false,
      code,
      message,
    },
  })
}

/**
 * 常见错误快捷方法
 */
export const errors = {
  // 400 - 请求参数错误
  badRequest(message: string = '请求参数错误'): never {
    return errorResponse(400, message)
  },

  // 404 - 资源不存在
  notFound(message: string = '资源不存在'): never {
    return errorResponse(404, message)
  },

  // 401 - 未授权
  unauthorized(message: string = '未授权访问'): never {
    return errorResponse(401, message)
  },

  // 403 - 禁止访问
  forbidden(message: string = '禁止访问'): never {
    return errorResponse(403, message)
  },

  // 500 - 服务器错误
  internal(message: string = '服务器内部错误'): never {
    return errorResponse(500, message)
  },
}
