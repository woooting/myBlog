<template>
  <div class="editor-page">
    <div v-show="isLoadingEditor" class="editor-loading-wrapper">
      <div class="loading-spinner"></div>
      <p>编辑器加载中...</p>
    </div>

    <div v-show="!isLoadingEditor" class="editor-container">
      <!-- 标题输入框 -->
      <input
        v-model="form.title"
        type="text"
        class="title-input"
        placeholder="请输入文章标题..."
      />

      <!-- 编辑器 -->
      <div class="editor-wrapper">
        <MarkDownEditor v-model="form.content" @ready="onEditorReady" />
      </div>

      <!-- 标签与封面图区域 -->
      <div v-if="showDraftManagement" class="editor-enhancements">
        <!-- 左侧：封面图上传区 -->
        <div class="cover-upload-area" @click="triggerCoverUpload">
          <div class="cover-label">文章封面</div>

          <!-- 状态1：用户未上传自定义封面 - 显示上传引导 UI -->
          <div v-if="!hasCustomCover" class="cover-upload-placeholder">
            <div class="upload-icon-wrapper">
              <Icon name="lucide:image-plus" :size="32" />
            </div>
            <div class="upload-text">
              <p class="upload-title">点击上传封面图</p>
              <p class="upload-hint">支持 JPG、PNG、WebP 格式，最大 2MB</p>
              <p class="upload-default-hint">不上传将使用「{{ selectedTag?.name }}」标签的默认封面</p>
            </div>
            <input
              ref="coverUploadInput"
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              @change="onCoverImageUpload"
              style="display: none"
            />
          </div>

          <!-- 状态2：用户已上传自定义封面 - 显示预览 -->
          <div
            v-else
            class="cover-preview-wrapper"
            :style="coverAspectRatioStyle"
          >
            <img
              :src="currentCoverImage"
              alt="自定义封面"
              class="cover-preview-image"
            />
            <div class="cover-preview-overlay">
              <Icon name="lucide:refresh-cw" :size="16" />
              <span>更换封面</span>
            </div>
            <button
              @click.stop="removeCustomCover"
              class="remove-cover-btn"
              title="移除自定义封面"
            >
              <Icon name="lucide:x" :size="14" />
            </button>
            <input
              ref="coverUploadInput"
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              @change="onCoverImageUpload"
              style="display: none"
            />
          </div>
        </div>

        <!-- 右侧：标签选择器 -->
        <div class="tag-selector-area">
          <div class="tag-label">文章标签</div>
          <div class="tag-list">
            <button
              v-for="tag in DRAFT_TAGS"
              :key="tag.id"
              @click="selectTag(tag)"
              :class="{ 'selected': selectedTag?.id === tag.id }"
              class="tag-button"
            >
              <Icon :name="tag.icon" :size="16" />
              <span>{{ tag.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button @click="submit" class="btn btn-primary">发布文章</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as postApi from '@app/api/posts.api'
import { useToast } from 'vue-toastification'

const form = ref({
  title: '',
  content: '',
})

// 草稿标签定义
const DRAFT_TAGS = [
  { id: 'learning', name: '学习经验', icon: 'lucide:book-open', defaultImage: '/images/draft-learning.jpg' },
  { id: 'inspiration', name: '灵感', icon: 'lucide:lightbulb', defaultImage: '/images/draft-inspiration.jpg' },
  { id: 'abstract', name: '抽象思想', icon: 'lucide:brain', defaultImage: '/images/draft-abstract.jpg' },
  { id: 'work', name: '工作', icon: 'lucide:briefcase', defaultImage: '/images/draft-work.jpg' },
  { id: 'life', name: '有感而发', icon: 'lucide:heart', defaultImage: '/images/draft-life.jpg' },
] as const

// 草稿管理状态
const currentCoverImage = ref('')
const selectedTag = ref<typeof DRAFT_TAGS[0] | null>(null)
const coverUploadInput = ref<HTMLInputElement | null>(null)

// 图片尺寸（用于自适应预览区域）
const coverImageDimensions = ref<{ width: number; height: number } | null>(null)

// 判断是否使用了自定义封面（Data URL 格式）
const hasCustomCover = computed(() => {
  return currentCoverImage.value.startsWith('data:image')
})

// 动态计算预览区域的宽高比
const coverAspectRatioStyle = computed(() => {
  if (!coverImageDimensions.value) return {}
  const { width, height } = coverImageDimensions.value
  return { aspectRatio: `${width} / ${height}` }
})

// 编辑器 loading 状态
const isLoadingEditor = ref(true)

// 自动保存功能（暂时禁用）
const autoSave = useAutoSave({
  storageKey: 'editor-draft',
  getValue: () => form.value,
  setValue: (value) => { form.value = value },
  delay: 1000,
  enabled: false,
})

// 是否显示草稿管理区域（暂时设置为始终显示）
const showDraftManagement = computed(() => !isLoadingEditor.value)

// Toast 实例
const toast = useToast()

// 初始化默认标签
onMounted(() => {
  if (DRAFT_TAGS.length > 0) {
    selectedTag.value = DRAFT_TAGS[0]
    currentCoverImage.value = DRAFT_TAGS[0].defaultImage
  }
})

// 选择标签
const selectTag = (tag: typeof DRAFT_TAGS[0]) => {
  selectedTag.value = tag
  // 如果用户没有上传自定义封面（封面图以 data:image 开头或为空），则使用标签的默认封面
  if (!currentCoverImage.value || !currentCoverImage.value.startsWith('data:image')) {
    currentCoverImage.value = tag.defaultImage
  }
}

// 触发封面上传
const triggerCoverUpload = () => {
  coverUploadInput.value?.click()
}

// 移除自定义封面，恢复默认封面
const removeCustomCover = () => {
  if (selectedTag.value) {
    currentCoverImage.value = selectedTag.value.defaultImage
  }
  coverImageDimensions.value = null
  toast.info('已恢复默认封面')
}

// 封面图上传
const onCoverImageUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  // 验证文件大小（2MB = 2 * 1024 * 1024 bytes）
  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    toast.error('图片大小不能超过 2MB')
    return
  }

  // 验证文件类型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    toast.error('仅支持 JPG、PNG、WebP 格式的图片')
    return
  }

  // 读取文件并转换为 Data URL
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result as string
    currentCoverImage.value = result

    // 获取图片尺寸以自适应预览区域
    const img = new Image()
    img.onload = () => {
      coverImageDimensions.value = { width: img.naturalWidth, height: img.naturalHeight }
    }
    img.src = result

    toast.success('封面图已更新')
  }
  reader.onerror = () => {
    toast.error('图片读取失败')
  }
  reader.readAsDataURL(file)
}

// 编辑器准备就绪
const onEditorReady = () => {
  isLoadingEditor.value = false
}

// 发布文章
const submit = async () => {
  if (!form.value.title || !form.value.content) {
    toast.warning('请填写标题和内容')
    return
  }

  try {
    await postApi.create({
      title: form.value.title,
      content: form.value.content,
      cover_image: currentCoverImage.value,
      tags: selectedTag.value ? [selectedTag.value.id] : undefined,
      status: 'published',
    })
    toast.success('发布成功！')
    // 重置表单
    form.value = { title: '', content: '' }
    // 重置封面图和标签
    if (DRAFT_TAGS.length > 0) {
      selectedTag.value = DRAFT_TAGS[0]
      currentCoverImage.value = DRAFT_TAGS[0].defaultImage
    }
  } catch (error) {
    console.error('发布失败:', error)
    toast.error('发布失败，请重试')
  }
}

definePageMeta({
  layout: 'admin',
})
</script>

<style lang="scss" scoped>
.editor-page {
  min-height: 100vh;
  padding: 2rem;
  background: var(--bg-primary, #ffffff);
}

.editor-container {
  max-width: 900px;
  margin: 0 auto;
}

.editor-loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
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
    font-weight: 400;
  }
}

.title-input {
  width: 100%;
  padding: 1rem 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-primary, #333);
  border: none;
  border-bottom: 1px solid var(--border-color, #e8e8e8);
  background: transparent;
  outline: none;
  transition: border-color 0.2s ease;
  margin-bottom: 1.5rem;

  &::placeholder {
    color: var(--text-tertiary, #ccc);
    font-weight: 400;
  }

  &:focus {
    border-bottom-color: var(--accent-color, #007aff);
  }
}

.editor-wrapper {
  min-height: 500px;
  margin-bottom: 2rem;
}

// 标签与封面图区域
.editor-enhancements {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--bg-secondary, #f9f9f9);
  border-radius: 12px;
  border: 1px solid var(--border-color, #e8e8e8);
}

// 封面图上传区
.cover-upload-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  .cover-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary, #666);
  }

  // 上传引导 UI（用户未上传时显示）
  .cover-upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    border: 2px dashed var(--border-color, #d0d0d0);
    background: var(--bg-tertiary, #fafafa);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--accent-color, #007aff);
      background: rgba(0, 122, 255, 0.02);

      .upload-icon-wrapper {
        color: var(--accent-color, #007aff);
        transform: scale(1.1);
      }
    }

    .upload-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      color: var(--text-tertiary, #bbb);
      background: var(--bg-primary, #fff);
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .upload-text {
      text-align: center;

      .upload-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary, #333);
        margin: 0 0 0.25rem 0;
      }

      .upload-hint {
        font-size: 12px;
        color: var(--text-tertiary, #999);
        margin: 0 0 0.5rem 0;
      }

      .upload-default-hint {
        font-size: 11px;
        color: var(--text-tertiary, #999);
        margin: 0;
      }
    }
  }

  // 预览 UI（用户已上传时显示）
  .cover-preview-wrapper {
    position: relative;
    width: 100%;
    max-height: 400px; // 限制最大高度，避免图片过高
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;

    .cover-preview-image {
      width: 100%;
      height: auto;
      display: block;
    }

    .cover-preview-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      font-size: 13px;
      font-weight: 500;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .remove-cover-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: rgba(255, 255, 255, 0.95);
      border: none;
      border-radius: 50%;
      color: var(--text-secondary, #666);
      cursor: pointer;
      opacity: 0;
      transition: all 0.2s ease;

      &:hover {
        background: #ff4757;
        color: white;
        transform: scale(1.1);
      }
    }

    &:hover {
      .cover-preview-overlay,
      .remove-cover-btn {
        opacity: 1;
      }
    }
  }
}

// 标签选择区
.tag-selector-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  .tag-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary, #666);
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-button {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.875rem;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary, #666);
    background: var(--bg-primary, #fff);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--accent-color, #007aff);
      color: var(--accent-color, #007aff);
    }

    &.selected {
      background: var(--accent-color, #007aff);
      border-color: var(--accent-color, #007aff);
      color: white;
    }
  }
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #f0f0f0);
}

.btn {
  padding: 0.625rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;

  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.btn-primary {
  background: var(--accent-color, #007aff);
  color: white;

  &:hover {
    background: #0066d6;
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 响应式
@media (max-width: 768px) {
  .editor-enhancements {
    flex-direction: column;
  }
}
</style>
