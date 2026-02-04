export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface ApiResponse<T = any> {
  success: boolean
  code: number
  message: string
  data?: T
  path?: string
  stack?: string
}

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface ApiRequestConfig {
  method?: HttpMethod
  headers?: Record<string, string>
  params?: Record<string, any>
  body?: any
  timeout?: number
  signal?: AbortSignal
}
