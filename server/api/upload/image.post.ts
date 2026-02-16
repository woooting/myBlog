/**
 * 图片上传 API
 * 接收 multipart/form-data 格式的图片文件
 */
import { errors } from '@server/utils/response'
import { successResponse } from '@server/utils/response'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

// 允许的图片类型
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

// 最大文件大小（5MB）
const MAX_SIZE = 5 * 1024 * 1024

export default defineEventHandler(async (event) => {
  try {
    const formData = await readFormData(event)
    const file = formData.get('file') as File

    // 验证文件是否存在
    if (!file) {
      throw errors.badRequest('未选择文件')
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw errors.badRequest(`不支持的文件类型，仅支持：jpg, png, gif, webp`)
    }

    // 验证文件大小
    if (file.size > MAX_SIZE) {
      throw errors.badRequest(`文件大小不能超过 5MB`)
    }

    // 生成唯一文件名：timestamp-random.ext
    const ext = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const filename = `${timestamp}-${randomStr}.${ext}`

    // 确保目录存在
    const uploadDir = join(process.cwd(), 'public', 'image', 'message')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // 保存文件
    const filePath = join(uploadDir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const imageUrl = `/image/message/${filename}`
    return successResponse({ url: imageUrl }, '上传成功')
  } catch (error) {
    // 如果是我们抛出的错误，直接重新抛出
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    console.error('图片上传失败:', error)
    throw errors.internal('图片上传失败')
  }
})
