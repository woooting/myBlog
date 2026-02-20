<template>
  <div class="index-container">
    <!-- 轮播图区域 -->
    <div class="carousel-wrapper">
      <CarouselSwiper :items="carouselItems" :autoplay-delay="5000" />
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
      <button @click="fetchPosts" class="retry-btn">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="posts.length === 0" class="empty-wrapper">
      <Icon name="lucide:file-question" :size="48" />
      <p>暂无文章</p>
    </div>

    <!-- 卡片列表 -->
    <div v-else class="card-area">
      <div
        class="card-item"
        v-for="post in posts"
        :key="post.id"
        @click="navigateToPost(post.id)"
      >
        <!-- 图片区域 -->
        <div class="img-area">
          <img
            :src="post.cover_image || defaultCoverImage"
            :alt="post.title"
            loading="lazy"
            @error="handleImageError"
          />
          <!-- 标签徽章 -->
          <div v-if="post.tags && post.tags.length > 0" class="tag-badge">
            {{ getTagName(post.tags[0]) }}
          </div>
        </div>
        <div class="text-area">
          <h3 class="text-ellipsis">{{ post.title }}</h3>
          <p class="text-clamp-3">{{ post.summary || extractSummary(post.content) }}</p>
          <div class="post-meta">
            <span class="post-date">{{ formatRelativeTime(post.created_at) }}</span>
            <span v-if="post.view_count" class="post-views">
              <Icon name="lucide:eye" :size="14" />
              {{ post.view_count }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as postApi from '@app/api/posts.api'
import type { Post } from '@app/api/posts.api'
import { formatRelativeTime } from '@app/utils/dateUtils'

// 轮播图数据
const carouselItems = [
  {
    image: 'https://picsum.photos/1200/400?random=1',
    title: '第一张幻灯片',
    description: '这是第一张幻灯片的描述文字',
    link: '/post/1',
  },
  {
    image: 'https://picsum.photos/1200/400?random=2',
    title: '第二张幻灯片',
    description: '这是第二张幻灯片的描述文字',
  },
  {
    image: 'https://picsum.photos/1200/400?random=3',
    title: '第三张幻灯片',
  },
]

// 标签配置
const DRAFT_TAGS = [
  { id: 'learning', name: '学习经验' },
  { id: 'inspiration', name: '灵感' },
  { id: 'abstract', name: '抽象思想' },
  { id: 'work', name: '工作' },
  { id: 'life', name: '有感而发' },
] as const

// 状态管理
const posts = ref<Post[]>([])
const isLoading = ref(true)
const error = ref('')

// 默认封面图
const defaultCoverImage = 'https://picsum.photos/400/300?random='

// 获取文章列表
const fetchPosts = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const data = await postApi.getList({ status: 'published' })
    posts.value = data
  } catch (err) {
    console.error('获取文章列表失败:', err)
    error.value = '加载失败，请稍后重试'
  } finally {
    isLoading.value = false
  }
}

// 获取标签名称
const getTagName = (tagId: string): string => {
  const tag = DRAFT_TAGS.find(t => t.id === tagId)
  return tag?.name || tagId
}

// 提取摘要（从 content 中提取纯文本）
const extractSummary = (content: string): string => {
  // 移除 HTML 标签
  const text = content.replace(/<[^>]*>/g, '')
  // 截取前 100 个字符
  return text.slice(0, 100) + (text.length > 100 ? '...' : '')
}

// 处理图片加载错误
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  // 使用随机默认图
  img.src = `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 100)}`
}

// 导航到文章详情
const navigateToPost = (id: number) => {
  navigateTo(`/category/detail?id=${id}`)
}

// 页面加载时获取文章
onMounted(() => {
  fetchPosts()
})
</script>

<style lang="scss">
.carousel-wrapper {
  width: 100%;
  margin: 0 auto;
  aspect-ratio: 16 / 5;
  border-radius: 12px;
  overflow: hidden;
}

.index-container {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
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

// 空状态
.empty-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  gap: 1rem;
  color: var(--text-secondary, #999);
}

.card-area {
  margin-top: 10px;
  width: 100%;
  // 瀑布流核心：使用 CSS 列布局
  column-count: 2; // 列数
  column-gap: 10px; // 列间距

  .card-item {
    width: 100%;
    // 最小尺寸限制
    min-width: 280px;
    min-height: 200px;
    // 防止元素跨列断裂
    break-inside: avoid;
    // 确保整个卡片在同一列
    page-break-inside: avoid;
    margin-bottom: 10px; // 卡片垂直间距
    border: 1px solid var(--border-color, #e0e0e0);
    display: inline-block; // 必须是 inline-block 或 block
    background: var(--bg-primary);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .img-area {
      position: relative;
      width: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

      img {
        width: 100%;
        height: auto; // 高度自适应，保持图片原始比例
        display: block;
        object-fit: cover;
      }

      .tag-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        padding: 0.25rem 0.75rem;
        font-size: 12px;
        font-weight: 500;
        color: white;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        border-radius: 12px;
      }
    }

    .text-area {
      padding: 12px;

      h3 {
        margin-bottom: 8px;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }

      p {
        font-size: 14px;
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: 8px;
      }

      .post-meta {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 12px;
        color: var(--text-tertiary, #999);

        .post-date {
          font-weight: 500;
        }

        .post-views {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
      }
    }
  }
}

// 响应式：不同屏幕调整列数
@media (max-width: 768px) {
  .index-container .card-area {
    column-count: 1;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
