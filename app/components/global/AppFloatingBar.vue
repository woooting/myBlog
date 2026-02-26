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
      class="search-dialog"
    >
      <div class="search-content">
        <el-input
          v-model="searchKeyword"
          placeholder="请输入搜索关键词"
          clearable
          size="large"
          class="search-input"
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

<style lang="scss">
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

// ========== 搜索对话框美化 ==========
// 对话框主体
.search-dialog.el-dialog {
  background: var(--bg-dialog);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12),
              0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

// 标题区域
.search-dialog .el-dialog__header {
  background: transparent;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.search-dialog .el-dialog__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

// 内容区域
.search-dialog .el-dialog__body {
  padding: 20px 24px 24px;
}

// 搜索输入框 - 添加命名空间前缀，避免影响其他组件
.search-dialog .search-input .el-input__wrapper {
  border-radius: 14px;
  padding: 4px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05),
              0 1px 2px rgba(0, 0, 0, 0.02);
  transition: all 0.3s ease;
}

.search-dialog .search-input .el-input__wrapper:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08),
              0 2px 4px rgba(0, 0, 0, 0.04);
}

.search-dialog .search-input .el-input__wrapper.is-focus {
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.15),
              0 2px 6px rgba(0, 122, 255, 0.1);
}

.search-dialog .search-input .el-input__inner {
  font-size: 15px;
}

.search-dialog .search-input .el-input__prefix {
  color: var(--text-secondary);
}

// 深色模式适配
.dark .search-dialog.el-dialog {
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
              0 2px 8px rgba(0, 0, 0, 0.2);
}

.dark .search-dialog .el-dialog__header {
  background: transparent;
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

// 搜索内容区
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
    width: 28px;
    height: 28px;
    animation: spin 1s linear infinite;
    color: var(--accent-color);
  }

  span {
    font-size: 14px;
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
  border-radius: 12px;
  background: var(--bg-dialog-item);
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.25s ease;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);

  &:hover {
    border-color: var(--accent-color);
    background: var(--bg-primary);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08),
                0 2px 6px rgba(0, 122, 255, 0.1);
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
      padding: 0.3rem 0.75rem;
      font-size: 0.75rem;
      border-radius: 6px;
      background: linear-gradient(135deg, var(--accent-color) 0%, #0051d5 100%);
      color: #fff;
      box-shadow: 0 2px 4px rgba(0, 122, 255, 0.2);
    }
  }
}

// 深色模式搜索结果
.dark .search-result-item {
  border-color: rgba(255, 255, 255, 0.06);

  &:hover {
    background: var(--bg-secondary);
    border-color: var(--accent-color);
  }
}

// 空状态
.search-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  gap: 1rem;
  color: var(--text-tertiary);

  svg {
    width: 56px;
    height: 56px;
    opacity: 0.3;
    stroke: var(--accent-color);
  }

  span {
    font-size: 14px;
  }
}
</style>
