<template>
  <div class="detail-container">
    <!-- Loading 状态 -->
    <div v-if="isLoading" class="loading-wrapper">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-wrapper">
      <Icon name="lucide:alert-circle" :size="48" />
      <p>{{ error }}</p>
      <button @click="fetchPost" class="retry-btn">重试</button>
    </div>

    <!-- 文章内容 -->
    <article v-else-if="post" class="article-content">
      <!-- 顶部信息区 -->
      <header class="article-header">
        <h1 class="article-title">{{ post.title }}</h1>

        <div class="article-meta">
          <span class="meta-date">
            <Icon name="lucide:calendar" :size="16" />
            {{ formatFullDate(post.created_at) }}
          </span>
          <span v-if="post.view_count" class="meta-views">
            <Icon name="lucide:eye" :size="16" />
            {{ post.view_count }}
          </span>
          <span v-if="post.category" class="meta-category">
            <Icon name="lucide:folder" :size="16" />
            {{ post.category }}
          </span>
        </div>

        <!-- 标签列表 -->
        <div v-if="post.tags && post.tags.length > 0" class="article-tags">
          <span v-for="tag in post.tags" :key="tag" class="tag-item">
            {{ getTagName(tag) }}
          </span>
        </div>
      </header>

      <!-- 文章内容 -->
      <div class="article-body" v-html="post.content"></div>
    </article>

    <!-- 未找到 -->
    <div v-else class="not-found-wrapper">
      <Icon name="lucide:file-question" :size="48" />
      <p>文章不存在</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as postApi from '@app/api/posts.api'
import type { Post } from '@app/api/posts.api'

// 获取路由参数
const route = useRoute()
const postId = computed(() => Number(route.query.id))

// 状态管理
const post = ref<Post | null>(null)
const isLoading = ref(true)
const error = ref('')

const DRAFT_TAGS = [
  { id: 'learning', name: '学习经验' },
  { id: 'inspiration', name: '灵感' },
  { id: 'abstract', name: '抽象思想' },
  { id: 'work', name: '工作' },
  { id: 'life', name: '有感而发' },
] as const

// TODO(human): 请在此处实现获取标签名称的函数 getTagName
// 可以参考首页 index.vue 中的 DRAFT_TAGS 配置
// 提示：你需要决定标签的展示方式，是否需要全局标签配置
const getTagName = (tagId: string): string => {
  // 请实现此函数，返回标签的显示名称
  
  return tagId
}

// 获取文章详情
const fetchPost = async () => {
  if (!postId.value) {
    error.value = '文章 ID 无效'
    isLoading.value = false
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const data = await postApi.getById(postId.value)
    // 处理 tags 字段（后端返回的是 JSON 字符串）
    if (data.tags && typeof data.tags === 'string') {
      data.tags = JSON.parse(data.tags)
    }
    post.value = data
  } catch (err) {
    console.error('获取文章详情失败:', err)
    error.value = '加载失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

// 格式化完整日期
const formatFullDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 监听路由参数变化
watch(() => route.query.id, () => {
  fetchPost()
})

// 页面加载时获取文章
onMounted(() => {
  fetchPost()
})
</script>

<style lang="scss" scoped>
.detail-container {
  width: 100%;
  min-width: 0;
  padding: 1rem;
}

// Loading 状态
.loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
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
  padding: 3rem 1rem;
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

// 未找到状态
.not-found-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  gap: 1rem;
  color: var(--text-secondary, #999);
}

.article-content {
  background: var(--bg-primary);
  border-radius: 12px;
  overflow: hidden;
}

.article-header {
  padding: 2rem;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.article-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1rem;
  line-height: 1.4;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 14px;
  color: var(--text-secondary);

  > span {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-item {
  padding: 0.25rem 0.75rem;
  font-size: 13px;
  color: var(--accent-color, #007aff);
  background: rgba(0, 122, 255, 0.1);
  border-radius: 6px;
}

.article-body {
  padding: 2rem;
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-primary);

  // HTML 内容样式重置
  :deep(h2) {
    font-size: 24px;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 1rem;
  }

  :deep(p) {
    margin-bottom: 1rem;
  }

  :deep(img) {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1rem auto;
  }

  :deep(pre) {
    background: var(--bg-secondary);
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
  }

  :deep(code) {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.9em;
  }

  :deep(blockquote) {
    border-left: 4px solid var(--accent-color, #007aff);
    padding-left: 1rem;
    margin: 1rem 0;
    color: var(--text-secondary);
    font-style: italic;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 1.5rem;
    margin-bottom: 1rem;
  }

  :deep(li) {
    margin-bottom: 0.5rem;
  }

  :deep(a) {
    color: var(--accent-color, #007aff);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

// 响应式
@media (max-width: 768px) {
  .article-header {
    padding: 1.5rem;
  }

  .article-title {
    font-size: 22px;
  }

  .article-body {
    padding: 1.5rem;
    font-size: 15px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
