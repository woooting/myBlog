<template>
  <div class="messages-page">
    <div class="page-header">
      <h1 class="page-title">消息管理</h1>
      <div class="header-info">
        <span class="total-count">共 {{ total }} 条留言</span>
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
      <button @click="fetchMessages" class="retry-btn">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="messages.length === 0" class="empty-wrapper">
      <Icon name="lucide:message-square" :size="48" />
      <p>暂无留言</p>
    </div>

    <!-- 留言列表 -->
    <div v-else class="messages-table-wrapper">
      <table class="messages-table">
        <thead>
          <tr>
            <th class="col-content">内容</th>
            <th class="col-user">发布用户</th>
            <th class="col-time">发布时间</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="message in messages" :key="message.id" class="message-row">
            <!-- 内容（超过15字省略） -->
            <td class="col-content">
              <div class="content-text">{{ truncateContent(message.content) }}</div>
            </td>

            <!-- 发布用户（头像+用户名） -->
            <td class="col-user">
              <div class="user-info">
                <img :src="message.user_avatar || defaultAvatar" class="user-avatar" />
                <span>{{ message.is_guest ? '访客' : message.username || '未知' }}</span>
              </div>
            </td>

            <!-- 发布时间 -->
            <td class="col-time">{{ formatAbsoluteTime(message.created_at) }}</td>

            <!-- 删除按钮 -->
            <td class="col-actions">
              <button @click="confirmDelete(message)" class="action-btn btn-delete" title="删除留言">
                <Icon name="lucide:trash-2" :size="16" />
              </button>
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
    <div v-if="!isLoading && !error && messages.length > 0" class="total-info">
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
            <p>确定要删除这条留言吗？</p>
            <p class="confirm-warning">留言内容：{{ deletingMessage?.content }}</p>
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
import * as messagesApi from '@app/api/messages.api'
import type { Message } from '@app/api/messages.api'
import { formatAbsoluteTime } from '@app/utils/dateUtils'

const router = useRouter()

// 状态管理
const messages = ref<Message[]>([])
const isLoading = ref(true)
const error = ref('')

// 分页状态
const page = ref(1)
const pageSize = ref(15)
const total = ref(0)
const totalPages = ref(0)

// 删除确认状态
const showDeleteConfirm = ref(false)
const deletingMessage = ref<Message | null>(null)

// 默认头像
const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'

// 获取留言列表
const fetchMessages = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const result = await messagesApi.getList({
      page: page.value,
      pageSize: pageSize.value,
    })
    messages.value = result.data
    total.value = result.pagination.total
    totalPages.value = result.pagination.totalPages
  } catch (err) {
    console.error('获取留言列表失败:', err)
    error.value = '加载失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

// 页码变化
const onPageChange = (newPage: number) => {
  page.value = newPage
  fetchMessages()
}

// 截断内容（超过15字）
const truncateContent = (content: string): string => {
  if (!content) return '-'
  return content.length > 15 ? content.slice(0, 15) + '...' : content
}

// 确认删除
const confirmDelete = (message: Message) => {
  deletingMessage.value = message
  showDeleteConfirm.value = true
}

// 取消删除
const cancelDelete = () => {
  showDeleteConfirm.value = false
  deletingMessage.value = null
}

// 执行删除
const executeDelete = async () => {
  if (!deletingMessage.value) return

  try {
    await messagesApi.remove(deletingMessage.value.id)

    // 边界情况：删除最后一页的最后一条
    const isLastPage = page.value === totalPages.value
    const hasOnlyOneItem = messages.value.length === 1

    if (isLastPage && hasOnlyOneItem && page.value > 1) {
      page.value--
    }

    await fetchMessages()
  } catch (err) {
    console.error('删除留言失败:', err)
    // Toast 由 API 自动显示
  } finally {
    showDeleteConfirm.value = false
    deletingMessage.value = null
  }
}

// 页面加载时获取留言
onMounted(() => {
  fetchMessages()
})

// 设置页面布局
definePageMeta({
  layout: 'admin',
})
</script>

<style lang="scss" scoped>
.messages-page {
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

// 留言表格
.messages-table-wrapper {
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  border: 1px solid var(--border-color, #e8e8e8);
  overflow: hidden;
}

.messages-table {
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
    .message-row {
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

.col-content {
  width: 300px;
  max-width: 300px;

  .content-text {
    font-size: 14px;
    color: var(--text-primary, #333);
    word-break: break-all;
  }
}

.col-user {
  width: 200px;

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--bg-tertiary, #f0f0f0);
  }

  span {
    font-size: 14px;
    color: var(--text-primary, #333);
  }
}

.col-time {
  width: 160px;
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.col-actions {
  width: 80px;

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
      color: #666;
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--bg-secondary, #f5f5f5);
      border-radius: 6px;
      word-break: break-all;
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
  .messages-page {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .messages-table-wrapper {
    overflow-x: auto;
  }

  .messages-table {
    min-width: 600px;
  }
}
</style>
