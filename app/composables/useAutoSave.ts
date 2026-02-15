import { draftDB } from '@app/utils/draftDB'

interface UseAutoSaveOptions<T> {
  /**
   * 获取当前内容的函数
   */
  getValue: () => T
  /**
   * 设置内容的函数
   */
  setValue: (value: T) => void
  /**
   * 存储的 key（用于 IndexedDB）
   */
  storageKey: string
  /**
   * 防抖延迟（毫秒），默认 1000ms
   */
  delay?: number
  /**
   * 是否启用自动保存，默认 true
   */
  enabled?: Ref<boolean> | boolean
  /**
   * 检查内容是否为空的函数（用于避免保存空内容）
   */
  isEmpty?: (value: T) => boolean
}

/**
 * 自动保存 Composable
 * 将编辑内容自动保存到 IndexedDB，防止意外丢失
 *
 * @example
 * ```ts
 * const autoSave = useAutoSave<any>({
 *   storageKey: 'markdown-editor-draft',
 *   getValue: () => editor.value?.getJSON() || {},
 *   setValue: (value) => editor.value?.commands.setContent(value, false),
 *   delay: 1000,
 *   isEmpty: (json) => json.type === 'doc' && !json.content?.length,
 * })
 * ```
 */
export function useAutoSave<T>(options: UseAutoSaveOptions<T>) {
  const { getValue, setValue, storageKey, delay = 1000, enabled = true, isEmpty } = options

  // ===== 响应式缓存 =====
  // 维护草稿内容的响应式缓存，确保外部 API 保持同步
  const cachedDraft = ref<T | null>(null)
  const isDbReady = ref(false)

  // ===== 异步初始化：加载草稿 =====
  onMounted(async () => {
    try {
      const draft = await draftDB.get(storageKey)
      if (draft !== null) {
        // 如果有 isEmpty 检查，验证草稿内容是否为空
        if (isEmpty && isEmpty(draft)) {
          cachedDraft.value = null
        } else {
          cachedDraft.value = draft
        }
      }
    } catch (error) {
      console.error('加载草稿失败:', error)
    } finally {
      isDbReady.value = true
    }
  })

  // 延迟设置初始化标志，防止初始化时误删已有草稿
  let isInitialized = false
  setTimeout(() => {
    isInitialized = true
  }, delay + 300)

  // ===== hasDraft：从缓存读取 =====
  const hasDraft = computed(() => {
    if (unref(enabled) === false) return false
    if (!isDbReady.value) return false
    return cachedDraft.value !== null
  })

  // ===== getDraft：从缓存读取（保持同步 API）=====
  const getDraft = (): T | null => {
    if (unref(enabled) === false) return null
    return cachedDraft.value
  }

  // ===== clearDraft：异步删除 =====
  const clearDraft = async () => {
    cachedDraft.value = null
    try {
      await draftDB.delete(storageKey)
    } catch (error) {
      console.error('清除草稿失败:', error)
    }
  }

  // ===== restoreDraft：恢复草稿 =====
  const restoreDraft = (): boolean => {
    const draft = getDraft()
    if (draft !== null) {
      setValue(draft)
      return true
    }
    return false
  }

  // ===== watchDebounced：异步保存到 IndexedDB =====
  const { stop } = watchDebounced(
    () => {
      if (unref(enabled) === false) return null
      return getValue()
    },
    async (newValue) => {
      if (newValue === null || unref(enabled) === false) return

      // 更新缓存
      cachedDraft.value = newValue

      // 如果有 isEmpty 检查且内容为空，删除草稿
      if (isEmpty && isEmpty(newValue)) {
        if (isInitialized) {
          try {
            await draftDB.delete(storageKey)
          } catch (error) {
            console.error('清除草稿失败:', error)
          }
        }
        return
      }

      // 保存到 IndexedDB
      try {
        await draftDB.set(storageKey, newValue)
      } catch (error) {
        console.error('保存草稿失败:', error)
      }
    },
    {
      deep: true,
      debounce: delay,
    }
  )

  // ===== onBeforeUnmount：异步保存最后内容 =====
  onBeforeUnmount(async () => {
    if (unref(enabled) === false) return
    stop()
    const value = getValue()

    if (isEmpty && isEmpty(value)) return

    try {
      await draftDB.set(storageKey, value)
    } catch (error) {
      console.error('保存草稿失败:', error)
    }
  })

  return {
    hasDraft,
    getDraft,
    clearDraft,
    restoreDraft,
    isDbReady,  // 暴露数据库准备状态，供组件监听
  }
}
