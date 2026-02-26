export interface UseDragAndDropOptionsBase {
  /** 接受的文件扩展名，如 ['.jpg', '.png'] */
  acceptExtensions?: string[]
  /** 自定义错误提示函数，默认使用 alert */
  onError?: (message: string) => void
}

export interface UseDragAndDropOptionsSingle extends UseDragAndDropOptionsBase {
  /** 文件拖放后的处理函数（单文件模式） */
  onDropFile: (file: File) => void | Promise<void>
  /** 是否支持多文件拖放 */
  multiple?: false
  onDropMultiple?: never
}

export interface UseDragAndDropOptionsMultiple extends UseDragAndDropOptionsBase {
  /** 是否支持多文件拖放 */
  multiple: true
  /** 多文件处理函数（多文件模式） */
  onDropMultiple: (files: File[]) => void | Promise<void>
  onDropFile?: never
}

export type UseDragAndDropOptions = UseDragAndDropOptionsSingle | UseDragAndDropOptionsMultiple

/**
 * 拖拽文件上传 Composable
 * 处理文件的拖拽、验证和回调
 *
 * @example
 * // 单文件 - Markdown 导入
 * const { isDragging, onDrop } = useDragAndDrop({
 *   onDropFile: async (file) => {
 *     const content = await file.text()
 *     editor.setValue(content)
 *   },
 *   acceptExtensions: ['.md', '.txt']
 * })
 *
 * @example
 * // 多文件 - 图片批量上传
 * const { isDragging, onDrop } = useDragAndDrop({
 *   multiple: true,
 *   onDropMultiple: async (files) => {
 *     await uploadMultipleImages(files)
 *   },
 *   acceptExtensions: ['.jpg', '.png']
 * })
 */
export function useDragAndDrop(options: UseDragAndDropOptions) {
  const acceptExtensions = options.acceptExtensions ?? []
  const onError = options.onError ?? ((msg) => alert(msg))

  const isDragging = ref(false)

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    isDragging.value = true
  }

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault()
    // 只有离开容器时才隐藏提示
    if (e.relatedTarget !== e.currentTarget) isDragging.value = false
  }

  const onDrop = async (e: DragEvent) => {
    isDragging.value = false

    const files = Array.from(e.dataTransfer?.files || [])
    if (files.length === 0) return

    // 验证文件扩展名
    if (acceptExtensions.length > 0) {
      const invalidFiles = files.filter((file) => {
        const fileName = file.name.toLowerCase()
        return !acceptExtensions.some((ext) => fileName.endsWith(ext))
      })

      if (invalidFiles.length > 0) {
        onError(`不支持的文件类型：${invalidFiles.map((f) => f.name).join(', ')}。请选择 ${acceptExtensions.join(', ')} 文件`)
        return
      }
    }

    // 根据类型调用对应的处理函数
    if (options.multiple && 'onDropMultiple' in options) {
      await options.onDropMultiple(files)
    } else if ('onDropFile' in options) {
      // 单文件模式，只处理第一个文件
      const file = files[0]
      if (file) {
        await options.onDropFile(file)
      }
    }
  }

  return {
    isDragging,
    onDragOver,
    onDragLeave,
    onDrop,
  }
}
