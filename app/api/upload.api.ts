/**
 * 上传相关 API 封装
 */

export interface UploadResponse {
  url: string
}

export const uploadApi = {
  /**
   * 上传图片
   * @param file 图片文件
   * @returns 返回图片 URL
   */
  async uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || '上传失败')
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || '上传失败')
    }

    return result.data
  },
}
