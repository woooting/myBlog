<template>
  <div class="search-page">
    <div class="search-header">
      <h1 class="page-title">搜索结果</h1>
      <div class="search-query-info">
        关键词 "<span class="highlight">{{ searchQuery }}</span>" 共找到
        <span class="highlight">{{ totalResults }}</span> 篇文章
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>搜索中...</p>
    </div>

    <!-- 无结果 -->
    <div v-else-if="!loading && results.length === 0" class="empty-state">
      <Icon name="lucide:search-x" :size="48" />
      <p>未找到相关文章</p>
      <p class="hint">试试其他关键词吧</p>
    </div>

    <!-- 搜索结果列表 -->
    <div v-else class="search-results">
      <article
        v-for="post in results"
        :key="post.id"
        class="result-item"
        @click="navigateToPost(post.id)"
      >
        <div v-if="post.cover_image" class="result-cover">
          <img :src="post.cover_image" :alt="post.title" />
        </div>
        <div class="result-content">
          <h2 class="result-title">{{ highlightMatch(post.title, searchQuery) }}</h2>
          <p v-if="post.summary" class="result-summary">
            {{ post.summary }}
          </p>
          <div v-if="post.tagNames && post.tagNames.length" class="result-tags">
            <el-tag v-for="tag in post.tagNames" :key="tag" size="small" type="info">
              {{ tag }}
            </el-tag>
          </div>
        </div>
      </article>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="totalResults"
        layout="prev, pager, next"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import * as searchApi from '@app/api/search.api'
import type { SearchPostItem } from '@app/api/search.api'

const route = useRoute()
const router = useRouter()

// 搜索状态
const searchQuery = ref('')
const results = ref<SearchPostItem[]>([])
const loading = ref(false)
const totalResults = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const totalPages = ref(0)

/**
 * 执行搜索
 */
async function performSearch() {
  const query = route.query.q as string
  if (!query || !query.trim()) {
    searchQuery.value = ''
    results.value = []
    totalResults.value = 0
    return
  }

  searchQuery.value = query.trim()
  loading.value = true

  try {
    const result = await searchApi.searchPosts({
      q: searchQuery.value,
      page: currentPage.value,
      pageSize: pageSize.value,
    })

    results.value = result.data
    totalResults.value = result.pagination.total
    totalPages.value = result.pagination.totalPages
  } catch (err) {
    console.error('搜索失败:', err)
    results.value = []
    totalResults.value = 0
  } finally {
    loading.value = false
  }
}

/**
 * 高亮匹配关键词
 */
function highlightMatch(text: string, keyword: string) {
  if (!keyword) return text

  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, '<span class="highlight-mark">$1</span>')
}

/**
 * 跳转到文章详情
 */
function navigateToPost(id: number) {
  router.push(`/category/detail?id=${id}`)
}

/**
 * 分页变化
 */
function handlePageChange(page: number) {
  currentPage.value = page
  performSearch()
  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 监听路由查询参数变化
watch(
  () => route.query.q,
  () => {
    currentPage.value = 1
    performSearch()
  },
  { immediate: true }
)

// 页面元数据
useHead({
  title: computed(() => searchQuery.value ? `搜索: ${searchQuery.value}` : '搜索'),
})
</script>

<style lang="scss" scoped>
.search-page {
  max-width: 900px;
  margin: 80px auto 40px;
  padding: 0 2rem;
}

.search-header {
  margin-bottom: 2rem;
  text-align: center;

  .page-title {
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.75rem 0;
  }

  .search-query-info {
    font-size: 0.875rem;
    color: var(--text-secondary);

    .highlight {
      color: var(--accent-color, #007aff);
      font-weight: 500;
    }
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 1rem;

  .loading-spinner {
    width: 36px;
    height: 36px;
    border: 2.5px solid var(--border-color);
    border-top-color: var(--accent-color, #007aff);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 0.75rem;
  color: var(--text-secondary);

  .hint {
    font-size: 13px;
    color: var(--text-tertiary);
  }
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.result-item {
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent-color, #007aff);
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.1);
    transform: translateY(-2px);
  }

  .result-cover {
    flex-shrink: 0;
    width: 200px;
    height: 120px;
    border-radius: 8px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .result-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow: hidden;

    .result-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      line-height: 1.4;

      :deep(.highlight-mark) {
        background: rgba(0, 122, 255, 0.15);
        color: var(--accent-color, #007aff);
        padding: 0 2px;
        border-radius: 2px;
      }
    }

    .result-summary {
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.5;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .result-tags {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  }
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  padding: 1rem 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 响应式
@media (max-width: 768px) {
  .search-page {
    margin-top: 60px;
    padding: 0 1rem;
  }

  .result-item {
    flex-direction: column;

    .result-cover {
      width: 100%;
      height: 180px;
    }
  }
}
</style>
