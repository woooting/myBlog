import * as tagsApi from '@app/api/tags.api'
import type { Tag } from '@app/api/tags.api'

/**
 * 标签管理 Composable
 */
export function useTags() {
  const tags = ref<Tag[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 获取标签列表
   */
  async function fetchList(params?: {
    page?: number
    pageSize?: number
    sort?: 'count' | 'name' | 'created_at'
    order?: 'asc' | 'desc'
  }) {
    loading.value = true
    error.value = null

    try {
      const response = await tagsApi.getList(params)
      tags.value = response.data
      return response
    } catch (err: any) {
      error.value = err.message || '获取标签列表失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取热门标签
   */
  async function fetchPopular(limit: number = 10) {
    loading.value = true
    error.value = null

    try {
      const result = await tagsApi.getPopular(limit)
      return result
    } catch (err: any) {
      error.value = err.message || '获取热门标签失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建标签
   */
  async function createTag(data: { name: string; desc?: string }) {
    loading.value = true
    error.value = null

    try {
      const result = await tagsApi.create(data)
      return result.id
    } catch (err: any) {
      error.value = err.message || '创建标签失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 搜索标签（模糊匹配）
   */
  async function searchTags(keyword: string, limit: number = 10) {
    try {
      const result = await tagsApi.search(keyword, limit)
      return result
    } catch (err: any) {
      error.value = err.message || '搜索标签失败'
      throw err
    }
  }

  /**
   * 删除标签
   */
  async function deleteTag(id: number) {
    loading.value = true
    error.value = null

    try {
      await tagsApi.remove(id)
      // 从本地列表中移除
      tags.value = tags.value.filter((t) => t.id !== id)
    } catch (err: any) {
      error.value = err.message || '删除标签失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 根据名称查找标签（本地）
   */
  function findByName(name: string) {
    return tags.value.find((t) => t.name.toLowerCase() === name.toLowerCase())
  }

  /**
   * 根据ID查找标签（本地）
   */
  function findById(id: number) {
    return tags.value.find((t) => t.id === id)
  }

  return {
    tags: readonly(tags),
    loading: readonly(loading),
    error: readonly(error),
    fetchList,
    fetchPopular,
    createTag,
    searchTags,
    deleteTag,
    findByName,
    findById,
  }
}
