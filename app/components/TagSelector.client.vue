<template>
  <div class="tag-selector">
    <!-- 已选标签展示 -->
    <div class="selected-tags">
      <el-tag
        v-for="tagId in modelValue"
        :key="tagId"
        :closable="!disabled"
        @close="removeTag(tagId)"
        class="tag-item"
        size="large"
      >
        {{ getTagName(tagId) }}
      </el-tag>
      <el-button
        v-if="modelValue.length < maxTags && !disabled"
        class="add-tag-btn"
        @click="openDialog"
        size="small"
      >
        <Icon name="lucide:plus" :size="14" />
        添加标签
      </el-button>
    </div>

    <!-- 添加标签对话框 -->
    <el-dialog v-model="dialogVisible" title="选择标签" width="500px" :before-close="handleClose">
      <!-- 搜索输入框 -->
      <el-autocomplete
        ref="searchInputRef"
        v-model="searchKeyword"
        :fetch-suggestions="handleSearch"
        placeholder="输入标签名搜索..."
        @select="handleSelectSuggestion"
        @keyup.enter="handleCreateTag"
        class="search-input"
      >
        <template #default="{ item }">
          <div class="search-suggestion">
            <span class="suggestion-name">{{ item.name }}</span>
            <span class="suggestion-count">{{ item.count }} 篇文章</span>
          </div>
        </template>
      </el-autocomplete>

      <!-- 热门标签 -->
      <div v-if="!searchKeyword" class="popular-tags">
        <div class="section-title">热门标签</div>
        <div class="tag-cloud">
          <el-tag
            v-for="tag in popularTags"
            :key="tag.id"
            :type="isTagSelected(tag.id) ? 'primary' : 'info'"
            @click="toggleTag(tag.id)"
            class="clickable-tag"
            size="large"
          >
            {{ tag.name }}
            <span v-if="tag.count > 0" class="tag-count">({{ tag.count }})</span>
          </el-tag>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div v-else class="search-results">
        <div class="section-title">搜索结果</div>
        <div v-if="searchResults.length === 0" class="no-results">
          未找到 "{{ searchKeyword }}"
          <el-button type="primary" link @click="handleCreateTag">
            创建新标签 "{{ searchKeyword }}"
          </el-button>
        </div>
        <div v-else class="tag-cloud">
          <el-tag
            v-for="tag in searchResults"
            :key="tag.id"
            :type="isTagSelected(tag.id) ? 'primary' : 'info'"
            @click="toggleTag(tag.id)"
            class="clickable-tag"
            size="large"
          >
            {{ tag.name }}
          </el-tag>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <template #footer>
        <div class="dialog-footer">
          <span class="selection-count"
            >已选择 {{ tempSelectedTags.length }} / {{ maxTags }} 个标签</span
          >
          <div>
            <el-button @click="handleClose">取消</el-button>
            <el-button
              type="primary"
              @click="handleConfirm"
              :disabled="tempSelectedTags.length === 0"
            >
              确定
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import * as tagsApi from '@app/api/tags.api'
import type { Tag } from '@app/api/tags.api'
import { useToastNotification } from '@app/composables/useToastNotification'

interface Props {
  modelValue: number[] // 选中的标签 ID 数组
  maxTags?: number // 最多标签数量
  placeholder?: string
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: number[]): void
}

const props = withDefaults(defineProps<Props>(), {
  maxTags: 3,
  placeholder: '选择标签...',
  disabled: false,
})

const emit = defineEmits<Emits>()

const { success, error } = useToastNotification()

// 对话框状态
const dialogVisible = ref(false)
const searchKeyword = ref('')
const searchInputRef = ref()

// 标签数据
const popularTags = ref<Tag[]>([])
const searchResults = ref<Tag[]>([])

// 临时选择的标签（对话框中）
const tempSelectedTags = ref<number[]>([...props.modelValue])

// 所有已加载的标签（用于显示名称）
const allTags = ref<Map<number, Tag>>(new Map())

/**
 * 获取标签名称
 */
function getTagName(id: number) {
  const tag = allTags.value.get(id)
  return tag?.name || `标签#${id}`
}

/**
 * 判断标签是否已选中
 */
function isTagSelected(id: number) {
  return tempSelectedTags.value.includes(id)
}

/**
 * 切换标签选中状态
 */
function toggleTag(id: number) {
  const index = tempSelectedTags.value.indexOf(id)
  if (index > -1) {
    tempSelectedTags.value.splice(index, 1)
  } else {
    if (tempSelectedTags.value.length >= props.maxTags) {
      error(`最多只能选择 ${props.maxTags} 个标签`)
      return
    }
    tempSelectedTags.value.push(id)
  }
}

/**
 * 移除标签
 */
function removeTag(id: number) {
  const newValue = props.modelValue.filter((tagId) => tagId !== id)
  emit('update:modelValue', newValue)
}

/**
 * 打开对话框
 */
async function openDialog() {
  dialogVisible.value = true
  tempSelectedTags.value = [...props.modelValue]
  searchKeyword.value = ''

  // 加载热门标签
  try {
    const tags = await tagsApi.getPopularTags(20)
    popularTags.value = tags
    // 更新所有标签缓存
    for (const tag of tags) {
      allTags.value.set(tag.id, tag)
    }
  } catch (err) {
    error('加载标签失败')
  }

  // 聚焦搜索框
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

/**
 * 关闭对话框
 */
function handleClose() {
  dialogVisible.value = false
  searchKeyword.value = ''
  searchResults.value = []
}

/**
 * 确认选择
 */
function handleConfirm() {
  emit('update:modelValue', [...tempSelectedTags.value])
  handleClose()
}

/**
 * 搜索标签
 */
async function handleSearch(queryString: string, callback: any) {
  if (!queryString) {
    callback([])
    return
  }

  try {
    const tags = await tagsApi.search(queryString, 10)
    const results = tags.map((tag) => ({
      value: tag.name,
      ...tag,
    }))
    callback(results)
  } catch (err) {
    callback([])
  }
}

/**
 * 选择搜索建议
 */
function handleSelectSuggestion(item: any) {
  toggleTag(item.id)
  searchKeyword.value = ''
}

/**
 * 创建新标签
 */
async function handleCreateTag() {
  const name = searchKeyword.value.trim()
  if (!name) return

  // 检查标签名是否合法
  if (/[\s,，]/.test(name)) {
    error('标签名称不能包含空格或逗号')
    return
  }

  // 检查是否已存在
  const existing = Array.from(allTags.value.values()).find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  )
  if (existing) {
    toggleTag(existing.id)
    searchKeyword.value = ''
    return
  }

  try {
    const result = await tagsApi.create({ name })
    const newTag: Tag = {
      id: result.id,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    allTags.value.set(result.id, newTag)
    toggleTag(result.id)
    searchKeyword.value = ''
    success(`标签 "${name}" 创建成功`)
  } catch (err: any) {
    error(err.message || '创建标签失败')
  }
}
</script>

<style lang="scss" scoped>
.tag-selector {
  width: 100%;
}

// ========== Dialog 美化 ==========
:deep(.el-dialog) {
  background: var(--bg-dialog);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

:deep(.el-dialog__header) {
  background: transparent;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

:deep(.el-dialog__body) {
  padding: 20px 24px 24px;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

// ========== 搜索输入框美化 ==========
// 使用 :deep() 因为 el-autocomplete 是第三方组件，根元素没有 scoped 属性
:deep(.search-input) {
  width: 100%;

  .el-input {
    margin-bottom: 1rem;
  }

  .el-input__wrapper {
    border-radius: 12px;
    padding: 4px 16px;
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.05),
      0 1px 2px rgba(0, 0, 0, 0.02);
    transition: all 0.3s ease;
  }

  .el-input__wrapper:hover {
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.08),
      0 2px 4px rgba(0, 0, 0, 0.04);
  }

  .el-input__wrapper.is-focus {
    box-shadow:
      0 4px 16px rgba(0, 122, 255, 0.15),
      0 2px 6px rgba(0, 122, 255, 0.1);
  }

  .el-input__inner {
    font-size: 15px;
  }
}

// ========== 下拉建议列表美化 ==========
:deep(.el-autocomplete__popper) {
  background: var(--bg-primary);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 8px;
}

:deep(.el-autocomplete-suggestion__wrap) {
  max-height: 200px;
}

:deep(.el-autocomplete-suggestion__list) {
  padding: 0;
}

:deep(.el-autocomplete-suggestion__li) {
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: var(--bg-secondary);
  }

  &.is-highlighted {
    background: var(--accent-color);
    color: white;
  }
}

// ========== 已选标签区域 ==========
.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;

  .tag-item {
    font-size: 14px;
    padding: 4px 10px;
    height: 28px;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  }

  .add-tag-btn {
    height: 28px;
    padding: 0 12px;
    font-size: 13px;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    :deep(.icon) {
      margin-right: 4px;
    }
  }
}

// ========== 搜索建议项 ==========
.search-suggestion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .suggestion-name {
    font-weight: 500;
  }

  .suggestion-count {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

// ========== 区域标题 ==========
.section-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

// ========== 标签云 ==========
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;

  .clickable-tag {
    cursor: pointer;
    user-select: none;
    transition: all 0.2s ease;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .tag-count {
      margin-left: 4px;
      font-size: 12px;
      opacity: 0.7;
    }
  }
}

// ========== 搜索结果 ==========
.search-results {
  .no-results {
    padding: 1rem 0;
    text-align: center;
    color: var(--text-secondary);
    font-size: 14px;
  }
}

// ========== 对话框底部 ==========
.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .selection-count {
    font-size: 13px;
    color: var(--text-secondary);
  }
}
</style>
