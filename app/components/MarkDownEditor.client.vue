<template>
  <div
    class="tiptap-editor-container"
    :class="{ 'is-dragging': isDragging }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- 草稿恢复提示 -->
    <div v-if="showRestoreDraft && editor" class="draft-restore-bar">
      <span>检测到未保存的草稿内容</span>
      <div class="draft-restore-actions">
        <button @click="restoreDraft" class="restore-btn">恢复草稿</button>
        <button @click="dismissDraft" class="dismiss-btn">放弃</button>
      </div>
      <button @click="dismissDraft" class="close-btn">✕</button>
    </div>

    <!-- 工具栏 -->
    <div v-if="editor" class="editor-toolbar">
      <template v-for="group in toolbarGroups" :key="group.title">
        <div class="toolbar-divider" v-if="group.divider"></div>
        <button
          v-for="btn in group.buttons"
          :key="btn.key"
          @click="btn.action"
          :class="{ 'is-active': btn.active?.() }"
          :disabled="btn.disabled?.()"
          :title="btn.title"
        >
          <Icon :name="btn.icon" />
          <span v-if="btn.label">{{ btn.label }}</span>
        </button>
      </template>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".md,.markdown,.txt"
      style="display: none"
      @change="onFileSelect"
    />

    <!-- 图片插入弹窗 -->
    <Teleport to="body">
      <div v-if="showImageDialog" class="image-dialog-overlay" @click.self="closeImageDialog">
        <div class="image-dialog">
          <div class="dialog-header">
            <h3>插入图片</h3>
            <button @click="closeImageDialog" class="close-btn">✕</button>
          </div>

          <div class="dialog-tabs">
            <button @click="imageTab = 'url'" :class="{ active: imageTab === 'url' }">
              URL 链接
            </button>
            <button @click="imageTab = 'upload'" :class="{ active: imageTab === 'upload' }">
              本地上传
            </button>
          </div>

          <div class="dialog-content">
            <!-- URL 模式 -->
            <div v-if="imageTab === 'url'" class="url-input-group">
              <input
                v-model="imageUrl"
                type="text"
                placeholder="请输入图片 URL，如：https://example.com/image.jpg"
                @keyup.enter="insertImageByUrl"
              />
              <button @click="insertImageByUrl" class="insert-btn">插入图片</button>
            </div>

            <!-- 上传模式 -->
            <div v-if="imageTab === 'upload'" class="upload-group">
              <input
                ref="imageInputRef"
                type="file"
                accept="image/*"
                @change="onImageFileSelect"
                class="file-input"
              />
              <p class="upload-hint">支持 jpg、png、gif、webp 等格式</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 拖拽提示 -->
    <div v-if="isDragging" class="drag-overlay">
      <Icon name="lucide:file-text" :size="48" />
      <p>拖放 Markdown 文件到此处</p>
    </div>

    <!-- 编辑器 -->
    <div class="editor-content">
      <EditorContent v-show="editor" :editor="editor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import ImageResize from 'tiptap-extension-resize-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { Markdown } from 'tiptap-markdown'
import { useDragAndDrop } from '../composables/useDragAndDrop'
import { useMarkdownIO } from '../composables/useMarkdownIO'
import { useAutoSave } from '../composables/useAutoSave'
import { useToast } from 'vue-toastification'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  storageKey?: string // 可选：自定义存储 key
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  ready: []
}>()
const toast = useToast()
// 代码高亮配置
const lowlight = createLowlight(common)

// 文件输入引用
const fileInputRef = ref<HTMLInputElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)

// 草稿恢复提示状态
const showRestoreDraft = ref(false)

// 图片插入弹窗状态
const showImageDialog = ref(false)
const imageUrl = ref('')
const imageTab = ref<'url' | 'upload'>('url')

// 初始化编辑器
const editor = useEditor({
  content: '',
  extensions: [
    StarterKit.configure({ codeBlock: false }),
    Placeholder.configure({ placeholder: props.placeholder || '开始输入内容...' }),
    Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-500 underline' } }),
    Image,  // ← 基础 Image 扩展
    ImageResize.configure({
      inline: true,
    }),
    CodeBlockLowlight.configure({ lowlight }),
    Markdown.configure({
      html: true,
      transformPastedText: true,
      transformCopiedText: true,
    }),
  ],
  editorProps: {
    attributes: {
      style: 'min-height: 400px;', // 👈 直接作用在 .ProseMirror 上
      class: 'focus:outline-none',
    },
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
  onCreate: ({ editor: ed }) => {
    // 通知父组件编辑器已就绪
    emit('ready')

    // 编辑器创建后，设置初始内容
    const initialValue = props.modelValue || ''
    if (initialValue) {
      ed.commands.setContent(initialValue)
    }

    // 检查是否有草稿
    checkAndShowDraftOption()
  },
})

// 自动保存功能
const autoSave = useAutoSave<any>({
  storageKey: props.storageKey || 'markdown-editor-draft',
  // 使用 JSON 格式存储，避免 HTML 解析导致的 Base64 图片丢失问题
  getValue: () => {
    if (!editor.value) return ''
    return editor.value.getJSON()
  },
  setValue: (value) => {
    if (!editor.value || !value) return
    editor.value.commands.setContent(value)
  },
  delay: 1000, // 1秒防抖
  isEmpty: (json) => {
    // 检查 JSON 是否为空
    if (!json || typeof json !== 'object') return true
    if (json.type === 'doc' && (!json.content || json.content.length === 0)) return true
    if (json.type === 'doc' && json.content.length === 1) {
      const first = json.content[0]
      if (first.type === 'paragraph' && (!first.content || first.content.length === 0)) return true
    }
    return false
  },
})

// 检查并显示草稿恢复选项
const checkAndShowDraftOption = () => {
  // 如果有传入 modelValue，不显示恢复提示
  if (props.modelValue) {
    return
  }

  // 如果编辑器已有内容，不显示恢复提示
  if (editor.value && !editor.value.isEmpty) {
    return
  }

  // 检查是否有有效的草稿内容（JSON 格式）
  const draft = autoSave.getDraft()
  if (draft && typeof draft === 'object' && draft.type === 'doc') {
    showRestoreDraft.value = true
  }
}

// 监听数据库准备状态，当 IndexedDB 加载完成后重新检查草稿
watch(autoSave.isDbReady, (ready) => {
  if (ready) {
    checkAndShowDraftOption()
  }
})

// 恢复草稿
const restoreDraft = () => {
  autoSave.restoreDraft()
  showRestoreDraft.value = false
}

// 放弃草稿
const dismissDraft = async () => {
  showRestoreDraft.value = false
  // 清除 IndexedDB 中的草稿
  await autoSave.clearDraft()
}

// ===== 图片插入功能 =====

// 关闭图片弹窗
const closeImageDialog = () => {
  showImageDialog.value = false
  imageUrl.value = ''
  imageTab.value = 'url'
  if (imageInputRef.value) {
    imageInputRef.value.value = ''
  }
}

// TODO(human): 请实现以下两个图片插入函数

// 1. 通过 URL 插入图片
const insertImageByUrl = () => {
  if (imageUrl.value === '') return
  editor.value?.chain().focus().setImage({ src: imageUrl.value }).run()
  closeImageDialog()
}

// 2. 处理图片文件上传（转换为 Base64）
const onImageFileSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.error('请上传图片文件')
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const base64 = reader.result as string
    editor.value?.chain().focus().setImage({ src: base64 }).run()
    closeImageDialog()
  }
  reader.readAsDataURL(file)
}

// 使用拖拽 composable
const { isDragging, onDragOver, onDragLeave, onDrop } = useDragAndDrop({
  onDropFile: async (file) => {
    const content = await file.text()
    editor.value?.commands.setContent(content)
  },
  acceptExtensions: ['.md', '.markdown', '.txt'],
})

// 使用 Markdown IO composable
const { importMarkdown, exportMarkdown } = useMarkdownIO(editor)

// 触发文件选择
const triggerFileInput = () => fileInputRef.value?.click()

// 处理文件选择
const onFileSelect = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  await importMarkdown(file)
  ;(e.target as HTMLInputElement).value = ''
}

// 工具栏配置
const toolbarGroups = computed(() => {
  if (!editor.value) return []

  const ed = editor.value
  const chain = () => ed.chain().focus()

  return [
    {
      title: 'markdown',
      divider: false,
      buttons: [
        { key: 'import', icon: 'lucide:upload', title: '导入 Markdown', action: triggerFileInput },
        {
          key: 'export',
          icon: 'lucide:download',
          title: '导出 Markdown',
          action: () => exportMarkdown(),
          disabled: () => ed.isEmpty,
        },
      ],
    },
    {
      title: 'media',
      divider: true,
      buttons: [
        {
          key: 'image',
          icon: 'lucide:image',
          title: '插入图片',
          action: () => (showImageDialog.value = true),
        },
      ],
    },
    {
      title: 'format',
      divider: true,
      buttons: [
        {
          key: 'bold',
          icon: 'lucide:bold',
          title: '粗体',
          action: () => chain().toggleBold().run(),
          active: () => ed.isActive('bold'),
        },
        {
          key: 'italic',
          icon: 'lucide:italic',
          title: '斜体',
          action: () => chain().toggleItalic().run(),
          active: () => ed.isActive('italic'),
        },
        {
          key: 'strike',
          icon: 'lucide:strikethrough',
          title: '删除线',
          action: () => chain().toggleStrike().run(),
          active: () => ed.isActive('strike'),
        },
        {
          key: 'code',
          icon: 'lucide:code',
          title: '行内代码',
          action: () => chain().toggleCode().run(),
          active: () => ed.isActive('code'),
        },
      ],
    },
    {
      title: 'heading',
      divider: true,
      buttons: [
        {
          key: 'h1',
          icon: '',
          label: 'H1',
          title: '一级标题',
          action: () => chain().toggleHeading({ level: 1 }).run(),
          active: () => ed.isActive('heading', { level: 1 }),
        },
        {
          key: 'h2',
          icon: '',
          label: 'H2',
          title: '二级标题',
          action: () => chain().toggleHeading({ level: 2 }).run(),
          active: () => ed.isActive('heading', { level: 2 }),
        },
        {
          key: 'h3',
          icon: '',
          label: 'H3',
          title: '三级标题',
          action: () => chain().toggleHeading({ level: 3 }).run(),
          active: () => ed.isActive('heading', { level: 3 }),
        },
      ],
    },
    {
      title: 'list',
      divider: true,
      buttons: [
        {
          key: 'bullet',
          icon: 'lucide:list',
          title: '无序列表',
          action: () => chain().toggleBulletList().run(),
          active: () => ed.isActive('bulletList'),
        },
        {
          key: 'ordered',
          icon: 'lucide:list-ordered',
          title: '有序列表',
          action: () => chain().toggleOrderedList().run(),
          active: () => ed.isActive('orderedList'),
        },
        {
          key: 'quote',
          icon: 'lucide:quote',
          title: '引用',
          action: () => chain().toggleBlockquote().run(),
          active: () => ed.isActive('blockquote'),
        },
        {
          key: 'codeblock',
          icon: 'lucide:file-code',
          title: '代码块',
          action: () => chain().toggleCodeBlock().run(),
          active: () => ed.isActive('codeBlock'),
        },
      ],
    },
    {
      title: 'history',
      divider: true,
      buttons: [
        {
          key: 'undo',
          icon: 'lucide:undo',
          title: '撤销',
          action: () => chain().undo().run(),
          disabled: () => !ed.can().undo(),
        },
        {
          key: 'redo',
          icon: 'lucide:redo',
          title: '重做',
          action: () => chain().redo().run(),
          disabled: () => !ed.can().redo(),
        },
      ],
    },
  ]
})

// 监听外部 modelValue 变化
watch(
  () => props.modelValue,
  (newValue: string | undefined) => {
    if (editor.value && newValue !== editor.value.getHTML()) {
      editor.value.commands.setContent(newValue || '')
    }
  }
)

onBeforeUnmount(() => {
  // 销毁编辑器
  // 注意：useAutoSave 会在自己的 onBeforeUnmount 中保存到 IndexedDB
  editor.value?.destroy()
})
</script>

<style lang="scss" scoped>
.tiptap-editor-container {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 500px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;

  &.is-dragging {
    border-color: var(--primary-color, #1890ff);
    border-style: dashed;
    border-width: 2px;
  }
}

// 草稿恢复提示栏
.draft-restore-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff3cd;
  border-bottom: 1px solid #ffc107;
  font-size: 14px;

  .draft-restore-actions {
    display: flex;
    gap: 8px;
    margin-left: 16px;
  }

  .restore-btn {
    padding: 4px 12px;
    background: #ffc107;
    border: none;
    border-radius: 4px;
    color: #000;
    font-size: 13px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;

    &:hover {
      background: #e0a800;
    }
  }

  .dismiss-btn {
    padding: 4px 12px;
    background: transparent;
    border: none;
    color: #666;
    font-size: 13px;
    cursor: pointer;
    text-decoration: underline;

    &:hover {
      color: #333;
    }
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: #666;
    padding: 4px 8px;
    margin-left: 8px;

    &:hover {
      color: #333;
    }
  }
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  flex-wrap: wrap;

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 32px;
    height: 32px;
    padding: 0 8px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: var(--text-secondary, #666);
    font-size: 14px;
    transition: all 0.2s;

    &:hover {
      background: var(--bg-tertiary, #e0e0e0);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &.is-active {
      background: var(--primary-color, #1890ff);
      color: white;
    }
  }

  .toolbar-divider {
    width: 1px;
    height: 20px;
    background: var(--border-color, #ccc);
    margin: 0 4px;
  }
}

.drag-overlay {
  position: absolute;
  inset: 0;
  background: rgba(24, 144, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  pointer-events: none;
  z-index: 10;

  p {
    font-size: 1.125rem;
    color: var(--primary-color, #1890ff);
    font-weight: 500;
  }
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  background: white;
  min-height: 400px;
}

:deep(.ProseMirror) {
  min-height: 100%;
  padding: 16px;
  outline: none;
  font-size: 16px;
  line-height: 1.6;

  > * + * {
    margin-top: 0.75em;
  }

  p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #adb5bd;
    pointer-events: none;
    height: 0;
  }

  h1 {
    font-size: 2em;
    font-weight: bold;
  }
  h2 {
    font-size: 1.5em;
    font-weight: bold;
  }
  h3 {
    font-size: 1.25em;
    font-weight: bold;
  }

  pre {
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    background: #1e1e1e;
    color: #fff;
    font-family: 'JetBrainsMono', monospace;
    overflow-x: auto;

    code {
      background: none;
      color: inherit;
      font-size: 0.875rem;
      padding: 0;
    }
  }

  code {
    background: rgba(135, 131, 120, 0.15);
    color: #eb5757;
    padding: 0.2em 0.4em;
    border-radius: 0.25em;
    font-size: 0.875em;
    font-family: 'JetBrainsMono', monospace;
  }

  blockquote {
    padding-left: 1rem;
    border-left: 3px solid var(--border-color, #ccc);
    color: var(--text-secondary, #666);
  }

  ul,
  ol {
    padding-left: 1.5rem;
  }

  a {
    color: #1890ff;
    text-decoration: underline;
    cursor: pointer;
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }

  // resize-image 扩展创建的图片容器居中
  // 覆盖 tiptap-extension-resize-image 添加的内联样式
  [contenteditable='false'][draggable='true'] {
    float: none !important;
    display: flex !important;
    justify-content: center !important;
    margin: 1rem auto;
    padding-right: 0 !important; // 移除扩展添加的右侧 padding
  }

  // 确保图片容器内的 div 也居中
  [contenteditable='false'][draggable='true'] > div {
    margin: 0 auto;
  }

  .image-resize {
    display: flex;
    justify-content: center;
    margin: 1rem auto;
  }

  .hljs {
    background: #1e1e1e;
    color: #d4d4d4;
  }
}

// 图片插入弹窗
.image-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.image-dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    color: #999;
    cursor: pointer;
    padding: 4px 8px;
    transition: color 0.2s;

    &:hover {
      color: #333;
    }
  }
}

.dialog-tabs {
  display: flex;
  gap: 0;
  padding: 0 20px;
  border-bottom: 1px solid #e8e8e8;

  button {
    padding: 12px 16px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 14px;
    color: #666;
    transition: all 0.2s;

    &:hover {
      color: #1890ff;
    }

    &.active {
      color: #1890ff;
      border-bottom-color: #1890ff;
    }
  }
}

.dialog-content {
  padding: 20px;
}

.url-input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;

  input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: #1890ff;
    }

    &::placeholder {
      color: #bbb;
    }
  }

  .insert-btn {
    align-self: flex-end;
    padding: 8px 20px;
    background: #1890ff;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #40a9ff;
    }
  }
}

.upload-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 0;

  .file-input {
    width: 100%;
    padding: 10px;
    border: 2px dashed #d9d9d9;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;

    &:hover {
      border-color: #1890ff;
    }
  }

  .upload-hint {
    margin: 0;
    font-size: 13px;
    color: #999;
  }
}
</style>
