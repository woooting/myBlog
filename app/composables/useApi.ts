import { useToast } from 'vue-toastification'
import { ApiError } from '../utils/api.types'
import type { ApiResponse, ApiRequestConfig } from '../utils/api.types'

function createTimeoutSignal(timeout?: number): AbortSignal {
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

// 改为 composable
export const useRequest = () => {
  const toast = useToast() // 使用 vue-toastification

  const request = async <T>(url: string, config: ApiRequestConfig = {}): Promise<T> => {
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
          if (config.showToast) {
            toast.success(res.message || '操作成功')
          }
          return res.data!
        } else {
          if (config.showToast) {
            toast.error(res.message || '操作失败')
          }
          throw new ApiError(res.code, res.message, res.data)
        }
      } else {
        const res: ApiResponse<T> = await response.json()
        if (config.showToast) {
          toast.error(res.message || '请求失败')
        }
        throw new ApiError(res.code, res.message, res.data)
      }
    } catch (error) {
      if (config.showToast) {
        if (error instanceof Error && error.name === 'AbortError') {
          toast.info('请求已取消')
        } else if (error instanceof ApiError) {
          toast.error(error.message || '请求失败')
        } else {
          toast.error('网络请求失败,请检查网络连接')
        }
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(0, '请求已取消')
      }
      throw new ApiError(0, '网络请求失败,请检查网络连接')
    }
  }

  return { request }
}
