<template>
  <div class="articles-page">
    <div class="page-header">
      <h1 class="page-title">文章管理</h1>
      <div class="header-actions">
        <button
          v-if="selectedIds.length > 0"
          @click="confirmBatchDelete"
          class="btn-batch-delete"
        >
          <Icon name="lucide:trash-2" :size="16" />
          <span>删除所选 ({{ selectedIds.length }})</span>
        </button>
        <button @click="goToEditor" class="btn-create">
          <Icon name="lucide:plus" :size="16" />
          <span>新建文章</span>
        </button>
      </div>
    </div>

    <!-- Loading 状态 -->
    <div v-if="isLoading" class="loading-wrapper">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-wrapper">
      <Icon name="lucide:alert-circle" :size="48" />
      <p>{{ error }}</p>
      <button @click="fetchArticles" class="retry-btn">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="articles.length === 0" class="empty-wrapper">
      <Icon name="lucide:file-text" :size="48" />
      <p>暂无文章</p>
      <button @click="goToEditor" class="btn-create-empty">
        <Icon name="lucide:plus" :size="16" />
        <span>创建第一篇文章</span>
      </button>
    </div>

    <!-- 文章列表 -->
    <div v-else class="articles-table-wrapper">
      <table class="articles-table">
        <thead>
          <tr>
            <th class="col-checkbox">
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @change="toggleSelectAll"
              />
            </th>
            <th class="col-cover">封面</th>
            <th class="col-title">标题</th>
            <th class="col-status">状态</th>
            <th class="col-date">创建时间</th>
            <th class="col-views">浏览</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="article in articles" :key="article.id" class="article-row" :class="{ 'row-selected': isSelected(article.id) }">
            <!-- 复选框 -->
            <td class="col-checkbox">
              <input
                type="checkbox"
                :checked="isSelected(article.id)"
                @change="toggleSelect(article.id)"
              />
            </td>

            <!-- 封面图 -->
            <td class="col-cover">
              <img
                :src="article.cover_image || defaultCover"
                :alt="article.title"
                class="cover-thumb"
              />
            </td>

            <!-- 标题 -->
            <td class="col-title">
              <div class="title-cell">
                <span class="title-text">{{ article.title }}</span>
                <span v-if="article.summary" class="summary-text">{{ article.summary }}</span>
              </div>
            </td>

            <!-- 状态 -->
            <td class="col-status">
              <span :class="['status-badge', `status-${article.status}`]">
                {{ getStatusText(article.status) }}
              </span>
            </td>

            <!-- 创建时间 -->
            <td class="col-date">
              {{ formatAbsoluteTime(article.created_at) }}
            </td>

            <!-- 浏览量 -->
            <td class="col-views">
              <span class="views-count">
                <Icon name="lucide:eye" :size="14" />
                {{ article.view_count || 0 }}
              </span>
            </td>

            <!-- 操作 -->
            <td class="col-actions">
              <div class="actions-wrapper">
                <button
                  @click="viewArticle(article.id)"
                  class="action-btn btn-view"
                  title="查看文章"
                >
                  <Icon name="lucide:eye" :size="16" />
                </button>
                <button
                  @click="confirmDelete(article)"
                  class="action-btn btn-delete"
                  title="删除文章"
                >
                  <Icon name="lucide:trash-2" :size="16" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 分页组件 -->
      <div v-if="totalPages > 1" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next, jumper"
          @current-change="onPageChange"
        />
      </div>
    </div>

    <!-- 总数信息 -->
    <div v-if="!isLoading && !error && articles.length > 0" class="total-info">
      共 {{ total }} 篇文章，第 {{ page }} / {{ totalPages }} 页
    </div>

    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="confirm-overlay" @click.self="cancelDelete">
        <div class="confirm-dialog">
          <div class="confirm-header">
            <h3>确认删除</h3>
          </div>
          <div class="confirm-body">
            <p v-if="isBatchDelete">确定要删除选中的 {{ selectedIds.length }} 篇文章吗？</p>
            <p v-else>确定要删除文章《{{ deletingArticle?.title }}》吗？</p>
            <p class="confirm-warning">此操作不可恢复！</p>
          </div>
          <div class="confirm-actions">
            <button @click="cancelDelete" class="btn-cancel">取消</button>
            <button @click="executeDelete" class="btn-confirm">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import * as postApi from '@app/api/posts.api'
import type { Post } from '@app/api/posts.api'
import { useToast } from 'vue-toastification'
import { formatAbsoluteTime } from '@app/utils/dateUtils'

const toast = useToast()
const router = useRouter()

// 状态管理
const articles = ref<Post[]>([])
const isLoading = ref(true)
const error = ref('')

// 分页状态
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const totalPages = ref(0)

// 删除确认状态
const showDeleteConfirm = ref(false)
const deletingArticle = ref<Post | null>(null)
const isBatchDelete = ref(false)

// 多选状态
const selectedIds = ref<number[]>([])

// 默认封面图
const defaultCover = 'https://picsum.photos/100/100?random='

// 获取文章列表（分页）
const fetchArticles = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const result = await postApi.getPaginatedList({
      page: page.value,
      pageSize: pageSize.value,
    })
    articles.value = result.data
    total.value = result.pagination.total
    totalPages.value = result.pagination.totalPages
  } catch (err) {
    console.error('获取文章列表失败:', err)
    error.value = '加载失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

// 页码变化
const onPageChange = (newPage: number) => {
  page.value = newPage
  clearSelection()
  fetchArticles()
}

// 获取状态文本
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    published: '已发布',
    draft: '草稿',
  }
  return statusMap[status] || status
}

// 多选相关计算属性
const isAllSelected = computed(() => {
  return articles.value.length > 0 && selectedIds.value.length === articles.value.length
})

const isIndeterminate = computed(() => {
  return selectedIds.value.length > 0 && selectedIds.value.length < articles.value.length
})

// 判断是否选中
const isSelected = (id: number) => {
  return selectedIds.value.includes(id)
}

// 切换单个选中
const toggleSelect = (id: number) => {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

// 切换全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = articles.value.map(a => a.id)
  }
}

// 清空选中
const clearSelection = () => {
  selectedIds.value = []
}

// 查看文章
const viewArticle = (id: number) => {
  window.open(`/category/detail?id=${id}`, '_blank')
}

// 确认删除
const confirmDelete = (article: Post) => {
  deletingArticle.value = article
  isBatchDelete.value = false
  showDeleteConfirm.value = true
}

// 确认批量删除
const confirmBatchDelete = () => {
  if (selectedIds.value.length === 0) return
  isBatchDelete.value = true
  showDeleteConfirm.value = true
}

// 取消删除
const cancelDelete = () => {
  showDeleteConfirm.value = false
  deletingArticle.value = null
  isBatchDelete.value = false
}

// 执行删除
const executeDelete = async () => {
  try {
    if (isBatchDelete.value) {
      // 批量删除 - 使用后端批量删除 API
      await postApi.batchDeletePosts(selectedIds.value)
      const deletedCount = selectedIds.value.length
      clearSelection()

      // 检查边界情况：如果删除后当前页可能没有数据
      const remainingCount = total.value - deletedCount
      const lastPageStart = Math.floor((remainingCount - 1) / pageSize.value) + 1

      if (page.value > lastPageStart && page.value > 1) {
        // 当前页超出范围，回到上一页
        page.value = lastPageStart
      }

      await fetchArticles()
    } else {
      // 单个删除
      if (!deletingArticle.value) return
      await postApi.deletePost(deletingArticle.value.id)

      // 检查边界情况：当前页是否是最后一页且只有一条数据
      const isLastPage = page.value === totalPages.value
      const hasOnlyOneItem = articles.value.length === 1

      if (isLastPage && hasOnlyOneItem && page.value > 1) {
        // 回到上一页
        page.value--
      }

      await fetchArticles()
    }
  } catch (err) {
    console.error('删除失败:', err)
    toast.error(isBatchDelete.value ? '批量删除失败，请重试' : '删除失败，请重试')
  } finally {
    cancelDelete()
  }
}

// 跳转到编辑器
const goToEditor = () => {
  router.push('/admin/system/editor')
}

// 页面加载时获取文章
onMounted(() => {
  fetchArticles()
})

// 设置页面布局
definePageMeta({
  layout: 'admin',
})
</script>

<style lang="scss" scoped>
.articles-page {
  min-height: 100vh;
  padding: 2rem;
  background: var(--bg-primary, #ffffff);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary, #333);
  margin: 0;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: var(--accent-color, #007aff);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #0066d6;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-batch-delete {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: #ff4757;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #e04050;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 71, 87, 0.2);
  }
}

// Loading 状态
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;

  .loading-spinner {
    width: 36px;
    height: 36px;
    border: 2.5px solid var(--border-color, #e8e8e8);
    border-top-color: var(--accent-color, #007aff);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  p {
    font-size: 14px;
    color: var(--text-secondary, #999);
    margin: 0;
  }
}

// 错误状态
.error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
  color: var(--text-secondary, #999);

  .retry-btn {
    padding: 0.5rem 1.5rem;
    font-size: 14px;
    font-weight: 500;
    color: var(--accent-color, #007aff);
    background: transparent;
    border: 1px solid var(--accent-color, #007aff);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--accent-color, #007aff);
      color: white;
    }
  }
}

// 空状态
.empty-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1.5rem;
  color: var(--text-secondary, #999);

  p {
    font-size: 16px;
    margin: 0;
  }

  .btn-create-empty {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.5rem;
    font-size: 14px;
    font-weight: 500;
    color: var(--accent-color, #007aff);
    background: transparent;
    border: 1px solid var(--accent-color, #007aff);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--accent-color, #007aff);
      color: white;
    }
  }
}

// 文章表格
.articles-table-wrapper {
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  border: 1px solid var(--border-color, #e8e8e8);
  overflow: hidden;
}

.articles-table {
  width: 100%;
  border-collapse: collapse;

  thead {
    background: var(--bg-secondary, #f9f9f9);

    th {
      padding: 1rem;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary, #666);
      border-bottom: 1px solid var(--border-color, #e8e8e8);
      white-space: nowrap;
    }
  }

  tbody {
    .article-row {
      border-bottom: 1px solid var(--border-color, #f0f0f0);
      transition: background 0.2s ease;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: var(--bg-secondary, #fafafa);
      }

      &.row-selected {
        background: rgba(0, 122, 255, 0.04);
      }

      td {
        padding: 1rem;
        vertical-align: middle;
      }
    }
  }
}

// 复选框列
.col-checkbox {
  width: 50px;
  text-align: center;

  input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--accent-color, #007aff);
  }
}

.col-cover {
  width: 80px;

  .cover-thumb {
    width: 60px;
    height: 45px;
    object-fit: cover;
    border-radius: 6px;
    background: var(--bg-tertiary, #f0f0f0);
  }
}

.col-title {
  .title-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-width: 300px;
  }

  .title-text {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #333);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .summary-text {
    font-size: 12px;
    color: var(--text-secondary, #999);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.col-status {
  width: 100px;

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    font-size: 12px;
    font-weight: 500;
    border-radius: 12px;

    &.status-published {
      background: rgba(82, 196, 26, 0.1);
      color: #52c41a;
    }

    &.status-draft {
      background: rgba(158, 158, 158, 0.1);
      color: #9e9e9e;
    }
  }
}

.col-date {
  width: 160px;
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.col-views {
  width: 80px;

  .views-count {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 13px;
    color: var(--text-secondary, #666);
  }
}

.col-actions {
  width: 100px;

  .actions-wrapper {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;

    &.btn-view {
      color: var(--accent-color, #007aff);
      background: rgba(0, 122, 255, 0.1);

      &:hover {
        background: rgba(0, 122, 255, 0.2);
      }
    }

    &.btn-delete {
      color: #ff4757;
      background: rgba(255, 71, 87, 0.1);

      &:hover {
        background: rgba(255, 71, 87, 0.2);
      }
    }
  }
}

// 分页器
.pagination-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 0;
}

.total-info {
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary, #666);
  padding: 1rem 0;
}

// 删除确认弹窗
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.confirm-dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.2s ease;
}

.confirm-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color, #f0f0f0);

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #333);
  }
}

.confirm-body {
  padding: 1.5rem;

  p {
    margin: 0 0 0.5rem 0;
    font-size: 14px;
    color: var(--text-primary, #333);

    &.confirm-warning {
      font-size: 13px;
      color: #ff4757;
      margin-top: 1rem;
    }
  }
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color, #f0f0f0);

  button {
    flex: 1;
    padding: 0.625rem;
    font-size: 14px;
    font-weight: 500;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-cancel {
    color: var(--text-secondary, #666);
    background: var(--bg-secondary, #f5f5f5);

    &:hover {
      background: #e8e8e8;
    }
  }

  .btn-confirm {
    color: white;
    background: #ff4757;

    &:hover {
      background: #e04050;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 响应式
@media (max-width: 768px) {
  .articles-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .articles-table-wrapper {
    overflow-x: auto;
  }

  .articles-table {
    min-width: 600px;
  }
}
</style>
