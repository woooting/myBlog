<template>
  <div class="floating-bar">
    <!-- 左侧：Logo -->
    <div class="bar-left">
      <span class="logo">MyBlog</span>
    </div>

    <!-- 右侧：图标 -->
    <div class="bar-right">
      <button class="icon-btn" @click="openSearchDialog">
        <Icon name="lucide:search" />
      </button>
      <button class="icon-btn theme-btn" @click="toggleTheme">
        <Icon :name="isDark ? 'lucide:moon' : 'lucide:sun'" />
      </button>
      <button class="icon-btn">
        <Icon name="lucide:bell" />
      </button>
      <button class="icon-btn">
        <Icon name="lucide:user" />
      </button>
    </div>

    <!-- 搜索对话框 -->
    <el-dialog
      v-model="searchDialogVisible"
      title="搜索文章"
      width="600px"
      :append-to-body="true"
      @closed="handleDialogClosed"
    >
      <div class="search-content">
        <el-input
          v-model="searchKeyword"
          placeholder="请输入搜索关键词"
          clearable
          size="large"
          @input="handleInputChange"
        >
          <template #prefix>
            <Icon name="lucide:search" />
          </template>
        </el-input>

        <!-- Loading 状态 -->
        <div v-if="isLoading" class="search-loading">
          <Icon name="lucide:loader-2" class="loading-icon" />
          <span>搜索中...</span>
        </div>

        <!-- 搜索结果列表 -->
        <div v-else-if="searchResults.length > 0" class="search-results">
          <div
            v-for="item in searchResults"
            :key="item.id"
            class="search-result-item"
            @click="handleItemClick(item.id)"
          >
            <div class="item-title">{{ item.title }}</div>
            <div v-if="item.tagNames.length > 0" class="item-tags">
              <span
                v-for="tag in item.tagNames"
                :key="tag"
                class="tag-item"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>

        <!-- 无结果提示 -->
        <div
          v-else-if="hasSearched && searchKeyword.trim()"
          class="search-empty"
        >
          <Icon name="lucide:file-search" />
          <span>未找到相关文章</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { searchPosts } from '@app/api/search.api'
import type { SearchPostItem } from '@app/api/search.api'

const { theme, toggleTheme, isDark } = useTheme()

// 搜索对话框状态
const searchDialogVisible = ref(false)
const searchKeyword = ref('')
const isLoading = ref(false)
const hasSearched = ref(false)
const searchResults = ref<SearchPostItem[]>([])

// 防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// 打开搜索对话框，自动聚焦输入框
const openSearchDialog = () => {
  searchDialogVisible.value = true
  nextTick(() => {
    const input = document.querySelector('.search-content input') as HTMLInputElement
    input?.focus()
  })
}

// 输入变化处理（带防抖）
const handleInputChange = () => {
  // 清除之前的定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  // 清空搜索结果
  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    hasSearched.value = false
    return
  }

  // 设置新的防抖定时器（1秒后执行搜索）
  debounceTimer = setTimeout(() => {
    performSearch()
  }, 1000)
}

// 执行搜索
const performSearch = async () => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    return
  }

  isLoading.value = true
  hasSearched.value = false

  try {
    const response = await searchPosts({ q: keyword })
    searchResults.value = response.data
    hasSearched.value = true
  } catch (error) {
    console.error('搜索失败:', error)
    searchResults.value = []
  } finally {
    isLoading.value = false
  }
}

// 点击搜索结果项，跳转到文章详情页
const handleItemClick = (id: number) => {
  navigateTo(`/category/detail?id=${id}`)
  searchDialogVisible.value = false
}

// 对话框关闭时重置状态
const handleDialogClosed = () => {
  searchKeyword.value = ''
  searchResults.value = []
  hasSearched.value = false
  isLoading.value = false
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}
</script>

<style lang="scss" scoped>
.floating-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  display: flex;
  align-items: center;
  justify-content: space-between;

  width: 100%;
  height: 60px;
  padding: 0 2rem;

  background: rgba(218, 217, 217, 0.7);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-color);

  z-index: 1000;
}

.dark .floating-bar {
  background: rgba(24, 24, 24, 0.7);
}

.bar-left {
  .logo {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.5px;
  }
}

.bar-right {
  display: flex;
  gap: 0.5rem;

  .icon-btn {
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);

    &:hover {
      background: var(--bg-tertiary);
    }

    &:active {
      transform: scale(0.95);
    }
  }
}

// 搜索对话框内容区
.search-content {
  max-height: 60vh;
  overflow-y: auto;
}

// Loading 状态
.search-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  gap: 0.75rem;
  color: var(--text-secondary);

  .loading-icon {
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 搜索结果列表
.search-results {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.search-result-item {
  padding: 1rem;
  border-radius: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    border-color: var(--accent-color);
    background: var(--bg-tertiary);
  }

  .item-title {
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .item-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;

    .tag-item {
      padding: 0.25rem 0.625rem;
      font-size: 0.75rem;
      border-radius: 4px;
      background: var(--accent-color);
      color: #fff;
    }
  }
}

// 空状态
.search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  gap: 0.75rem;
  color: var(--text-secondary);

  svg {
    width: 48px;
    height: 48px;
    opacity: 0.5;
  }
}
</style>
