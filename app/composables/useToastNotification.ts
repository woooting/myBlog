/**
 * Vue Toastification 封装
 * 使用方法：
 * const toast = useToastNotification()
 * toast.success('成功消息')
 * toast.error('错误消息')
 */
import { useToast as useToastification } from 'vue-toastification'

export const useToastNotification = () => {
  const toast = useToastification()

  return {
    success: (message: string, options?: any) => toast.success(message, options),
    error: (message: string, options?: any) => toast.error(message, options),
    info: (message: string, options?: any) => toast.info(message, options),
    warning: (message: string, options?: any) => toast.warning(message, options),
    clear: () => toast.clear(),
  }
}

