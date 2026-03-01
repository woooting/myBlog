<template>
  <div class="message-page">
    <!-- 留言编辑区域 (用户输入发送) -->
    <div class="message-editor">
      <div class="editor-header">
        <span class="editor-title">发表留言</span>
        <span class="char-count">{{ content.length }}/150</span>
      </div>

      <el-input
        v-model="content"
        type="textarea"
        :rows="4"
        placeholder="说点什么吧... (支持emoji 🎉)"
        maxlength="150"
        show-word-limit
        :disabled="isSubmitting"
      />

      <div class="editor-actions">
        <input
          ref="imageInputRef"
          type="file"
          accept="image/*"
          style="display: none"
          @change="onImageSelect"
        />
        <button
          class="btn-icon"
          :class="{ active: hasImage }"
          @click="selectImage"
          :disabled="isSubmitting"
        >
          <Icon name="lucide:image" :size="20" />
        </button>
        <button class="btn-emoji" @click="insertEmoji" :disabled="isSubmitting">
          <Icon name="lucide:smile" :size="20" />
        </button>
        <button class="btn-submit" :disabled="!canSubmit || isSubmitting" @click="submitMessage">
          {{ isSubmitting ? '发送中...' : '发送' }}
        </button>
      </div>

      <!-- 图片预览 -->
      <div v-if="imageUrl" class="image-preview">
        <img :src="imageUrl" alt="预览" />
        <button class="btn-remove" @click="removeImage">
          <Icon name="lucide:x" :size="16" />
        </button>
      </div>
    </div>

    <!-- 留言展示区域 (显示留言列表) -->
    <div class="message-container">
      <!-- Loading (仅初始加载) -->
      <div v-if="isLoading && messages.length === 0" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- Empty -->
      <div v-else-if="messages.length === 0" class="empty-state">
        <Icon name="lucide:message-circle" :size="48" />
        <p>还没有留言，快来抢沙发吧~</p>
      </div>

      <!-- Message List -->
      <div v-else class="message-list">
        <!-- 消息气泡 -->
        <div v-for="message in messages" :key="message.id" class="message-bubble">
          <div class="message-content">
            {{ message.content }}
          </div>
          <div v-if="message.image_url" class="message-image">
            <img :src="message.image_url" alt="留言图片" />
          </div>
          <div class="message-meta">
            <div class="author-info">
              <img
                v-if="formatAuthor(message).avatar"
                :src="formatAuthor(message).avatar"
                :alt="formatAuthor(message).name"
                class="author-avatar"
              />
              <span class="author-name">{{ formatAuthor(message).name }}</span>
            </div>
            <span class="message-time">{{ formatTime(message.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Load More -->
      <div
        v-if="hasMore && !isLoading && !isLoadingMore && messages.length > 0"
        class="load-more"
        @click="loadMore"
      >
        <button class="btn-load-more">加载更多 ({{ remaining }})</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Message } from '@app/api/messages.api'
import * as messagesApi from '@app/api/messages.api'
import { uploadApi } from '@app/api/upload.api'
import { formatRelativeTime } from '@app/utils/dateUtils'

// 使用 useAuth 获取当前用户信息（自动导入）
const { data: session, status } = useAuth()

// 当前登录用户信息（响应式）
const currentUser = computed(() => {
  if (status.value === 'authenticated' && session.value?.user) {
    return {
      name: session.value.user.name,
      email: session.value.user.email,
      avatar: session.value.user.image,
      id: (session.value.user as any).id,
      provider: (session.value.user as any).provider,
    }
  }
  return null
})

// 状态
const content = ref('')
const imageUrl = ref('')
const imageFile = ref<File | null>(null)
const isSubmitting = ref(false)

const messages = ref<Message[]>([])
const isLoading = ref(true)
const isLoadingMore = ref(false)
const currentPage = ref(1)
const pageSize = 15
const totalMessages = ref(0)

// Refs
const imageInputRef = ref<HTMLInputElement>()

// Computed
const canSubmit = computed(() => content.value.trim().length > 0)
const hasImage = computed(() => !!imageUrl.value)

const hasMore = computed(() => messages.value.length < totalMessages.value)
const remaining = computed(() => totalMessages.value - messages.value.length)
const isAuthenticated = computed(() => status.value === 'authenticated')

// 方法
/**
 * 格式化作者信息
 * - 已登录用户：显示用户名和头像
 * - 访客：显示访客ID
 */
const formatAuthor = (message: Message) => {
  if (!message.is_guest && message.username) {
    // 已登录用户
    return {
      name: message.username,
      avatar: message.user_avatar,
      isGuest: false,
    }
  } else {
    // 访客
    return {
      name: `访客#${message.visitor_id?.slice(0, 8)}`,
      avatar: null,
      isGuest: true,
    }
  }
}

const formatTime = (time: string) => {
  return formatRelativeTime(new Date(time))
}

const selectImage = () => {
  imageInputRef.value?.click()
}

const onImageSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 验证图片大小 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 5MB')
    return
  }

  imageFile.value = file
  imageUrl.value = URL.createObjectURL(file)
}

const removeImage = () => {
  imageUrl.value = ''
  imageFile.value = null
  if (imageInputRef.value) {
    imageInputRef.value.value = ''
  }
}

const insertEmoji = () => {
  const emojis = ['😊', '🎉', '❤️', '👍', '🔥', '✨', '🎊', '💯']
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
  content.value += randomEmoji
}

const submitMessage = async () => {
  if (!canSubmit.value || isSubmitting.value) return

  isSubmitting.value = true
  try {
    let uploadedImageUrl = ''

    // 如果有图片，先上传图片
    if (imageFile.value) {
      try {
        const result = await uploadApi.uploadImage(imageFile.value)
        uploadedImageUrl = result.url
      } catch (error) {
        console.error('图片上传失败:', error)
        ElMessage.error(error instanceof Error ? error.message : '图片上传失败')
        return // 上传失败，中断提交流程
      }
    }

    // 提交留言
    const result = await messagesApi.create({
      content: content.value,
      image_url: uploadedImageUrl || undefined,
    })

    // 直接插入新消息到数组头部，包含当前用户信息
    messages.value.unshift({
      id: result.id,
      user_id: result.user_id,
      visitor_id: result.visitor_id,
      content: result.content,
      image_url: result.image_url,
      created_at: new Date().toISOString(),
      // 如果已登录，添加用户信息（处理 null 情况）
      username: currentUser.value?.name ?? undefined,
      user_avatar: currentUser.value?.avatar ?? undefined,
      is_guest: !isAuthenticated.value,
    })

    // 更新总数
    totalMessages.value++

    // 清空表单
    content.value = ''
    imageUrl.value = ''
    imageFile.value = null
    if (imageInputRef.value) {
      imageInputRef.value.value = ''
    }

    ElMessage.success('留言成功!')
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('留言提交失败，请稍后重试')
  } finally {
    isSubmitting.value = false
  }
}

const fetchMessages = async (page: number, isLoadMore = false) => {
  if (isLoadMore) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }

  try {
    const result = await messagesApi.getList({
      page,
      pageSize,
    })

    if (page === 1) {
      messages.value = result.data
    } else {
      // 加载更多：添加到数组末尾
      messages.value = [...messages.value, ...result.data]
    }

    currentPage.value = page
    totalMessages.value = result.pagination.total
  } catch (error) {
    console.error('加载失败:', error)
    ElMessage.error('加载留言失败')
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

const loadMore = () => {
  if (hasMore.value && !isLoadingMore.value) {
    fetchMessages(currentPage.value + 1, true)
  }
}

// 初始化
onMounted(() => {
  fetchMessages(1)
})
</script>

<style lang="scss" scoped>
.message-page {
  max-width: 800px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  box-sizing: border-box;
}

/* ===== 留言编辑区域 ===== */
.message-editor {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 20px;
  flex-shrink: 0; // 不参与伸缩，保持固定高度
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.editor-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.char-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.btn-icon,
.btn-emoji {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;

  &:hover {
    background: var(--border-color);
    color: var(--text-primary);
  }

  &.active {
    border-color: var(--accent-color);
    color: var(--accent-color);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-submit {
  margin-left: auto;
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  background: var(--accent-color);
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.image-preview {
  position: relative;
  margin-top: 12px;
  width: fit-content;

  img {
    max-width: 200px;
    max-height: 200px;
    border-radius: 8px;
    object-fit: cover;
  }

  .btn-remove {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: none;
    background: var(--accent-color);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* ===== 留言展示区域 ===== */
.message-container {
  flex: 1; // 占据剩余空间
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  min-height: 0; // 允许 flex 子元素正确收缩
}

.message-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px;

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;

    &:hover {
      background: var(--text-tertiary);
    }
  }
}

.message-bubble {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  flex-shrink: 0; // 不参与伸缩，保持内容高度

  // 新消息动画
  animation: slideIn 0.3s ease-out;

  .message-content {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-primary);
    margin-bottom: 8px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .message-image {
    margin: 8px 0;

    img {
      max-width: 100%;
      max-height: 300px;
      border-radius: 8px;
      object-fit: cover;
    }
  }

  .message-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--text-secondary);

    .author-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .author-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: cover;
      }

      .author-name {
        font-weight: 500;
        color: var(--accent-color);
      }
    }
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.load-more {
  padding: 12px;
  text-align: center;
  flex-shrink: 0;
}

.btn-load-more {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: var(--accent-color);
    color: var(--accent-color);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-secondary);
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
