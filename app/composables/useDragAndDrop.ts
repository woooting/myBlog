export interface UseDragAndDropOptions {
  onDropFile: (file: File) => void | Promise<void>
  acceptExtensions?: string[]
}

/**
 * 拖拽文件上传 Composable
 * 处理文件的拖拽、验证和回调
 */
export function useDragAndDrop(options: UseDragAndDropOptions) {
  const { onDropFile, acceptExtensions = [] } = options
  const isDragging = ref(false)

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    console.log('drag over')
    isDragging.value = true
  }

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault()
    console.log('drag leave')
    // 只有离开容器时才隐藏提示
    if (e.relatedTarget !== e.currentTarget) isDragging.value = false
  }

  const onDrop = async (e: DragEvent) => {
    isDragging.value = false

    const file = e.dataTransfer?.files[0]
    if (!file) return

    // 验证文件扩展名
    if (acceptExtensions.length > 0) {
      const fileName = file.name.toLowerCase()
      const isValid = acceptExtensions.some((ext) => fileName.endsWith(ext))
      if (!isValid) {
        alert(`请选择 ${acceptExtensions.join(', ')} 文件`)
        return
      }
    }

    await onDropFile(file)
  }

  return {
    isDragging,
    onDragOver,
    onDragLeave,
    onDrop,
  }
}
