<template>
  <div class="tags-page">
    <div class="page-header">
      <h1 class="page-title">标签管理</h1>
      <div class="header-info">
        <span class="total-count">共 {{ total }} 个标签</span>
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
      <button @click="fetchTags" class="retry-btn">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="tags.length === 0" class="empty-wrapper">
      <Icon name="lucide:tag" :size="48" />
      <p>暂无标签</p>
    </div>

    <!-- 标签列表 -->
    <div v-else class="tags-table-wrapper">
      <table class="tags-table">
        <thead>
          <tr>
            <th class="col-name">标签名称</th>
            <th class="col-desc">描述</th>
            <th class="col-count">文章数</th>
            <th class="col-date">创建时间</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tag in tags" :key="tag.id" class="tag-row">
            <!-- 标签名称（可编辑） -->
            <td class="col-name">
              <div v-if="editingTagId === tag.id" class="edit-cell">
                <input
                  v-model="editForm.name"
                  type="text"
                  class="edit-input"
                  placeholder="标签名称"
                  @keyup.enter="saveEdit"
                  @keyup.esc="cancelEdit"
                  ref="nameInput"
                />
              </div>
              <span v-else class="name-text">{{ tag.name }}</span>
            </td>

            <!-- 描述（可编辑） -->
            <td class="col-desc">
              <div v-if="editingTagId === tag.id" class="edit-cell">
                <input
                  v-model="editForm.desc"
                  type="text"
                  class="edit-input"
                  placeholder="描述（可选）"
                  @keyup.enter="saveEdit"
                  @keyup.esc="cancelEdit"
                />
              </div>
              <span v-else class="desc-text">{{ tag.desc || '-' }}</span>
            </td>

            <!-- 文章数（只读） -->
            <td class="col-count">
              <span class="count-badge">{{ tag.count }}</span>
            </td>

            <!-- 创建时间 -->
            <td class="col-date">
              {{ formatAbsoluteTime(tag.created_at) }}
            </td>

            <!-- 操作 -->
            <td class="col-actions">
              <div class="actions-wrapper">
                <!-- 编辑模式下的保存/取消按钮 -->
                <template v-if="editingTagId === tag.id">
                  <button
                    @click="saveEdit"
                    class="action-btn btn-save"
                    title="保存 (Enter)"
                  >
                    <Icon name="lucide:check" :size="16" />
                  </button>
                  <button
                    @click="cancelEdit"
                    class="action-btn btn-cancel"
                    title="取消 (Esc)"
                  >
                    <Icon name="lucide:x" :size="16" />
                  </button>
                </template>
                <!-- 正常模式下的编辑/删除按钮 -->
                <template v-else>
                  <button
                    @click="startEdit(tag)"
                    class="action-btn btn-edit"
                    title="编辑标签"
                    :disabled="editingTagId !== null"
                  >
                    <Icon name="lucide:edit" :size="16" />
                  </button>
                  <button
                    @click="confirmDelete(tag)"
                    class="action-btn btn-delete"
                    title="删除标签"
                    :disabled="editingTagId !== null"
                  >
                    <Icon name="lucide:trash-2" :size="16" />
                  </button>
                </template>
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
    <div v-if="!isLoading && !error && tags.length > 0" class="total-info">
      第 {{ page }} / {{ totalPages }} 页
    </div>

    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="confirm-overlay" @click.self="cancelDelete">
        <div class="confirm-dialog">
          <div class="confirm-header">
            <h3>确认删除</h3>
          </div>
          <div class="confirm-body">
            <p>确定要删除标签「{{ deletingTag?.name }}」吗？</p>
            <p class="confirm-warning">
              该标签关联了 {{ deletingTag?.count || 0 }} 篇文章，删除后将自动取消关联。
            </p>
            <p class="confirm-danger">此操作不可恢复！</p>
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
import * as tagsApi from '@app/api/tags.api'
import type { Tag } from '@app/api/tags.api'
import { formatAbsoluteTime } from '@app/utils/dateUtils'

const router = useRouter()

// 状态管理
const tags = ref<Tag[]>([])
const isLoading = ref(true)
const error = ref('')

// 分页状态
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const totalPages = ref(0)

// 编辑状态
const editingTagId = ref<number | null>(null)
const editForm = ref({ name: '', desc: '' })
const originalData = ref({ name: '', desc: '' })
const nameInput = ref<HTMLInputElement | null>(null)

// 删除确认状态
const showDeleteConfirm = ref(false)
const deletingTag = ref<Tag | null>(null)

// 获取标签列表
const fetchTags = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const result = await tagsApi.getList({
      page: page.value,
      pageSize: pageSize.value,
      sort: 'count',
      order: 'desc',
    })
    tags.value = result.data
    console.log('res',result)
    total.value = result.pagination.total
    totalPages.value = result.pagination.totalPages
  } catch (err) {
    console.error('获取标签列表失败:', err)
    error.value = '加载失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

// 页码变化
const onPageChange = (newPage: number) => {
  page.value = newPage
  fetchTags()
}

// 开始编辑
const startEdit = (tag: Tag) => {
  editingTagId.value = tag.id
  editForm.value = { name: tag.name, desc: tag.desc || '' }
  originalData.value = { name: tag.name, desc: tag.desc || '' }

  // 聚焦到输入框
  nextTick(() => {
    if (nameInput.value) {
      nameInput.value.focus()
      nameInput.value.select()
    }
  })
}

// 保存编辑
const saveEdit = async () => {
  if (!editingTagId.value) return

  // 验证标签名称
  if (!editForm.value.name.trim()) {
    error.value = '标签名称不能为空'
    return
  }

  // 检查是否有变化
  if (
    editForm.value.name === originalData.value.name &&
    editForm.value.desc === originalData.value.desc
  ) {
    cancelEdit()
    return
  }

  try {
    await tagsApi.update(editingTagId.value, {
      name: editForm.value.name.trim(),
      desc: editForm.value.desc.trim() || undefined,
    })
    editingTagId.value = null
    await fetchTags()
  } catch (err) {
    console.error('更新标签失败:', err)
    // Toast 由 API 自动显示
  }
}

// 取消编辑
const cancelEdit = () => {
  editingTagId.value = null
  editForm.value = { name: '', desc: '' }
  originalData.value = { name: '', desc: '' }
}

// 确认删除
const confirmDelete = (tag: Tag) => {
  deletingTag.value = tag
  showDeleteConfirm.value = true
}

// 取消删除
const cancelDelete = () => {
  showDeleteConfirm.value = false
  deletingTag.value = null
}

// 执行删除
const executeDelete = async () => {
  if (!deletingTag.value) return

  try {
    await tagsApi.remove(deletingTag.value.id)

    // 边界情况：删除最后一页的最后一条
    const isLastPage = page.value === totalPages.value
    const hasOnlyOneItem = tags.value.length === 1

    if (isLastPage && hasOnlyOneItem && page.value > 1) {
      page.value--
    }

    await fetchTags()
  } catch (err) {
    console.error('删除标签失败:', err)
    // Toast 由 API 自动显示
  } finally {
    showDeleteConfirm.value = false
    deletingTag.value = null
  }
}

// 页面加载时获取标签
onMounted(() => {
  fetchTags()
})

// 设置页面布局
definePageMeta({
  layout: 'admin',
})
</script>

<style lang="scss" scoped>
.tags-page {
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

.header-info {
  .total-count {
    font-size: 14px;
    color: var(--text-secondary, #666);
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
}

// 标签表格
.tags-table-wrapper {
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  border: 1px solid var(--border-color, #e8e8e8);
  overflow: hidden;
}

.tags-table {
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
    .tag-row {
      border-bottom: 1px solid var(--border-color, #f0f0f0);
      transition: background 0.2s ease;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: var(--bg-secondary, #fafafa);
      }

      td {
        padding: 1rem;
        vertical-align: middle;
      }
    }
  }
}

.col-name {
  width: 200px;

  .name-text {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #333);
  }

  .edit-cell {
    .edit-input {
      width: 100%;
      padding: 0.5rem;
      font-size: 14px;
      border: 1px solid var(--accent-color, #007aff);
      border-radius: 6px;
      outline: none;
      background: var(--bg-primary, #fff);
      color: var(--text-primary, #333);
      transition: border-color 0.2s ease;

      &:focus {
        border-color: var(--accent-color, #007aff);
        box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
      }

      &::placeholder {
        color: var(--text-placeholder, #ccc);
      }
    }
  }
}

.col-desc {
  width: 250px;

  .desc-text {
    font-size: 13px;
    color: var(--text-secondary, #666);
  }

  .edit-cell {
    .edit-input {
      width: 100%;
      padding: 0.5rem;
      font-size: 13px;
      border: 1px solid var(--accent-color, #007aff);
      border-radius: 6px;
      outline: none;
      background: var(--bg-primary, #fff);
      color: var(--text-primary, #333);
      transition: border-color 0.2s ease;

      &:focus {
        border-color: var(--accent-color, #007aff);
        box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
      }

      &::placeholder {
        color: var(--text-placeholder, #ccc);
      }
    }
  }
}

.col-count {
  width: 100px;

  .count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    padding: 0.25rem 0.5rem;
    font-size: 13px;
    font-weight: 500;
    color: var(--accent-color, #007aff);
    background: rgba(0, 122, 255, 0.1);
    border-radius: 12px;
  }
}

.col-date {
  width: 160px;
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.col-actions {
  width: 120px;

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

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &.btn-edit {
      color: var(--accent-color, #007aff);
      background: rgba(0, 122, 255, 0.1);

      &:hover:not(:disabled) {
        background: rgba(0, 122, 255, 0.2);
      }
    }

    &.btn-delete {
      color: #ff4757;
      background: rgba(255, 71, 87, 0.1);

      &:hover:not(:disabled) {
        background: rgba(255, 71, 87, 0.2);
      }
    }

    &.btn-save {
      color: #52c41a;
      background: rgba(82, 196, 26, 0.1);

      &:hover {
        background: rgba(82, 196, 26, 0.2);
      }
    }

    &.btn-cancel {
      color: var(--text-secondary, #666);
      background: rgba(158, 158, 158, 0.1);

      &:hover {
        background: rgba(158, 158, 158, 0.2);
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
  max-width: 420px;
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
      color: #faad14;
      margin-top: 1rem;
    }

    &.confirm-danger {
      font-size: 13px;
      color: #ff4757;
      margin-top: 0.5rem;
      font-weight: 500;
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
  .tags-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .tags-table-wrapper {
    overflow-x: auto;
  }

  .tags-table {
    min-width: 600px;
  }
}
</style>
