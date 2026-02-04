import { ApiError } from '../utils/api.types'
import type { ApiResponse, ApiRequestConfig } from '../utils/api.types'

function createTimeoutSignal(timeout?: number) : AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeout)
  return controller.signal
}

function buildUrl(url: string, params?: Record<string, any>) {
  if (!params) return url
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  const queryString = searchParams.toString()
  return queryString ? `${url}?${queryString}` : url
}

// Toast 接口定义（与 Nuxt UI useToast 兼容）
interface ToastInstance {
  add: (options: { title: string; description?: string; color: 'success' | 'error' | 'info' }) => void
}

export async function request<T>(url: string, config: ApiRequestConfig = {}): Promise<T> {
  // 获取 toast 实例（仅在客户端且在 Nuxt 上下文中）
  let toast: ToastInstance | null = null
  try {
    // 尝试获取 Nuxt 上下文中的 toast（服务端或非 Nuxt 上下文会失败）
    if (typeof window !== 'undefined') {
      toast = useToast()
    }
  } catch {
    // 在非 Nuxt 上下文中无法使用 composable，忽略
    toast = null
  }

  try {
    let actualSignal: AbortSignal | undefined = config.signal
    if (typeof config.timeout === 'number' && !config.signal) {
      actualSignal = createTimeoutSignal(config.timeout)
    }
    const options = {
      method: config.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      signal: actualSignal,
      body: config.method !== 'GET' && config.body ? JSON.stringify(config.body) : undefined,
    }

    const response = await fetch(buildUrl(url, config.params), options)
    if (response.ok) {
      const res: ApiResponse<T> = await response.json()
      if (res.success) {
        // 成功时显示 toast（如果配置了）
        if (config.showToast && toast) {
          toast.add({ title: res.message || '操作成功', color: 'success' })
        }
        return res.data!
      } else {
        // 业务失败时显示 toast（如果配置了）
        if (config.showToast && toast) {
          toast.add({ title: res.message || '操作失败', color: 'error' })
        }
        throw new ApiError(res.code, res.message, res.data)
      }
    } else {
      const res: ApiResponse<T> = await response.json()
      if (config.showToast && toast) {
        toast.add({ title: res.message || '请求失败', color: 'error' })
      }
      throw new ApiError(res.code, res.message, res.data)
    }
  } catch (error) {
    // 错误时显示 toast（如果配置了）
    if (config.showToast && toast) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.add({ title: '请求已取消', color: 'info' })
      } else if (error instanceof ApiError) {
        toast.add({ title: error.message || '请求失败', color: 'error' })
      } else {
        toast.add({ title: '网络请求失败，请检查网络连接', color: 'error' })
      }
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, '请求已取消')
    }
    throw new ApiError(0, '网络请求失败，请检查网络连接')
  }
}
