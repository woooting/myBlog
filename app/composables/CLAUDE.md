---
title: "Composables 文档"
description: "前端组合式函数（Composables）使用情况、功能说明和依赖关系"
lastUpdated: 2025-03-01
version: "1.0.0"
composables:
  total: 7
  core: 1
  feature: 4
  ui: 2
table_of_contents:
  - 依赖关系矩阵
  - 核心 Composables (useRequest)
  - 功能 Composables (4个)
  - UI Composables (2个)
  - 使用规范
  - 状态统计
---

# App Composables 文档

> 本文档记录 `app/composables/` 目录下所有组合式函数的使用情况、依赖关系和功能说明。

---

## 📑 目录

- [依赖关系图](#依赖关系图)
- [核心 Composables](#核心-composables)
- [功能 Composables](#功能-composables)
- [UI Composables](#ui-composables)
- [使用规范](#使用规范)
- [Composables 状态统计](#composables-状态统计)

---

## 🔗 依赖关系图

```
app/api/
├── posts.api.ts ──────────────────┐
├── tags.api.ts ───────────────────┤
├── search.api.ts ─────────────────┤
└── messages.api.ts ───────────────┤
                                     ├──> useRequest (核心 HTTP)
                                     │
app/components/                      │
├── AppFloatingBar.vue ─────────────┤
│   ├── useTheme ───────────────────┤
│   └── useToastNotification ───────┤
│                                   │
├── MarkDownEditor.client.vue ──────┤
│   ├── useAutoSave ────────────────┤
│   ├── useMarkdownIO ──────────────┤
│   └── useDragAndDrop ─────────────┤
│                                   │
├── TagSelector.client.vue ─────────┤
│   └── useToastNotification ───────┤
│                                   │
app/pages/                           │
├── index.vue ───────────────────────┤
│   └── useToastNotification ───────┤
│                                   │
└── login/index.vue ─────────────────┘
    └── useToastNotification ────┘
```

### 依赖关系矩阵

| Composable | 被引用位置 | 引用次数 | 类型 |
|-----------|-----------|---------|------|
| `useRequest` | 5 个 API 文件 | 15+ | 核心 |
| `useToastNotification` | 4 个组件 | 4 | UI |
| `useTheme` | 1 个组件 | 1 | UI |
| `useAutoSave` | 2 个组件 | 2 | 功能 |
| `useMarkdownIO` | 1 个组件 | 1 | 功能 |
| `useDragAndDrop` | 1 个组件 | 1 | 功能 |
| `useTags` | 未使用 | 0 | 功能 |

---

## 🎯 核心 Composables

### useRequest (useApi.ts)

**文件路径**: [`useApi.ts`](useApi.ts)

**导出名称**: `useRequest`

**功能说明**:
- 统一的 HTTP 请求封装
- 支持请求/响应拦截
- 自动 Toast 提示（可配置）
- 超时控制
- AbortController 支持
- 错误处理和类型安全

**返回值**:
```typescript
{
  request: <T>(url: string, config?: ApiRequestConfig) => Promise<T>
}
```

**配置选项**:
```typescript
interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  params?: Record<string, any>
  timeout?: number          // 请求超时（毫秒）
  showToast?: boolean        // 是否显示 Toast，默认 false
  signal?: AbortSignal       // 自定义中断信号
}
```

**使用示例**:
```typescript
// 在 API 文件中使用
export async function getPost(id: number) {
  return useRequest().request<Post>(`/api/posts/${id}`)
}

export async function createPost(data: CreatePostDto) {
  return useRequest().request<Post>('/api/posts', {
    method: 'POST',
    body: data,
    showToast: true  // 自动显示成功/失败提示
  })
}

// 带参数的 GET 请求
export async function searchPosts(query: string) {
  return useRequest().request<SearchResult[]>('/api/search', {
    params: { q: query }
  })
}
```

**使用位置**:
- `app/api/posts.api.ts` - 文章 API（10 处）
- `app/api/tags.api.ts` - 标签 API（6 处）
- `app/api/search.api.ts` - 搜索 API（1 处）
- `app/api/messages.api.ts` - 留言 API（2 处）

**核心特性**:
- 自动序列化请求体（JSON.stringify）
- 自动 URL 参数构建（URLSearchParams）
- 统一错误处理（ApiError 类）
- 自动显示 Toast 提示（vue-toastification）
- 支持请求取消（AbortController）

**错误处理**:
```typescript
// 抛出 ApiError，包含 code、message、data
throw new ApiError(res.code, res.message, res.data)
```

---

## 🛠️ 功能 Composables

### useAutoSave

**文件路径**: [`useAutoSave.ts`](useAutoSave.ts)

**功能说明**:
- 自动保存内容到 IndexedDB
- 支持防抖配置
- 空内容检查（避免保存空草稿）
- 组件卸载时自动保存
- 草稿恢复功能

**类型定义**:
```typescript
interface UseAutoSaveOptions<T> {
  getValue: () => T                    // 获取当前内容
  setValue: (value: T) => void         // 设置内容
  storageKey: string                   // 存储键名
  delay?: number                       // 防抖延迟（毫秒），默认 1000
  enabled?: Ref<boolean> | boolean     // 是否启用，默认 true
  isEmpty?: (value: T) => boolean      // 检查内容是否为空
}
```

**返回值**:
```typescript
{
  hasDraft: ComputedRef<boolean>       // 是否有草稿
  getDraft: () => T | null             // 获取草稿（同步）
  clearDraft: () => Promise<void>      // 清除草稿
  restoreDraft: () => boolean          // 恢复草稿
  isDbReady: Ref<boolean>              // 数据库是否准备就绪
}
```

**使用示例**:
```typescript
// TipTap 编辑器自动保存
const autoSave = useAutoSave<any>({
  storageKey: 'markdown-editor-draft',
  getValue: () => editor.value?.getJSON() || {},
  setValue: (value) => editor.value?.commands.setContent(value),
  delay: 1000,
  isEmpty: (json) => {
    return json.type === 'doc' && !json.content?.length
  },
})

// 检查是否有草稿
if (autoSave.hasDraft.value) {
  showRestorePrompt()
}

// 恢复草稿
autoSave.restoreDraft()

// 清除草稿
await autoSave.clearDraft()
```

**使用位置**:
- `MarkDownEditor.client.vue` - 编辑器自动保存
- `pages/admin/system/editor.vue` - 文章编辑器草稿

**依赖**:
- `@app/utils/draftDB` - IndexedDB 封装

**核心特性**:
- 响应式草稿缓存（`cachedDraft`）
- 防抖保存（`watchDebounced`）
- 空内容自动清理
- 组件卸载时最后保存
- 数据库准备状态监听

---

### useMarkdownIO

**文件路径**: [`useMarkdownIO.ts`](useMarkdownIO.ts)

**功能说明**:
- Markdown 文件导入/导出
- 支持 TipTap 编辑器
- 自动生成 .md 文件下载

**参数**:
```typescript
function useMarkdownIO(editor: Ref<Editor | null>)
```

**返回值**:
```typescript
{
  importMarkdown: (file: File) => Promise<void>
  exportMarkdown: () => void
}
```

**使用示例**:
```typescript
const { importMarkdown, exportMarkdown } = useMarkdownIO(editor)

// 导入 Markdown 文件
async function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    await importMarkdown(file)
  }
}

// 导出 Markdown 文件
function handleExport() {
  exportMarkdown()  // 下载为 document.md
}
```

**使用位置**:
- `MarkDownEditor.client.vue` - 编辑器工具栏导入/导出

**核心特性**:
- 使用 TipTap 的 Markdown 序列化
- 自动生成 Blob 下载
- UTF-8 编码支持

---

### useDragAndDrop

**文件路径**: [`useDragAndDrop.ts`](useDragAndDrop.ts)

**功能说明**:
- 文件拖拽上传处理
- 支持单文件/多文件模式
- 文件扩展名验证
- 自定义错误处理

**类型定义**:
```typescript
// 单文件模式
interface UseDragAndDropOptionsSingle {
  onDropFile: (file: File) => void | Promise<void>
  acceptExtensions?: string[]
  onError?: (message: string) => void
}

// 多文件模式
interface UseDragAndDropOptionsMultiple {
  multiple: true
  onDropMultiple: (files: File[]) => void | Promise<void>
  acceptExtensions?: string[]
  onError?: (message: string) => void
}
```

**返回值**:
```typescript
{
  isDragging: Ref<boolean>          // 是否正在拖拽
  onDragOver: (e: DragEvent) => void
  onDragLeave: (e: DragEvent) => void
  onDrop: (e: DragEvent) => Promise<void>
}
```

**使用示例**:
```typescript
// 单文件 - Markdown 导入
const { isDragging, onDragOver, onDragLeave, onDrop } = useDragAndDrop({
  onDropFile: async (file) => {
    const content = await file.text()
    editor.value?.commands.setContent(content)
  },
  acceptExtensions: ['.md', '.markdown', '.txt']
})

// 多文件 - 图片批量上传
const { isDragging, onDrop } = useDragAndDrop({
  multiple: true,
  onDropMultiple: async (files) => {
    await Promise.all(files.map(uploadImage))
  },
  acceptExtensions: ['.jpg', '.png', '.gif']
})
```

**使用位置**:
- `MarkDownEditor.client.vue` - 拖拽上传 .md 文件

**模板使用**:
```vue
<div
  @dragover.prevent="onDragOver"
  @dragleave.prevent="onDragLeave"
  @drop.prevent="onDrop"
  :class="{ 'is-dragging': isDragging }"
>
  拖拽文件到此处
</div>
```

---

### useTags

**文件路径**: [`useTags.ts`](useTags.ts)

**功能说明**:
- 标签管理 Composable
- 封装标签 CRUD 操作
- 本地标签列表缓存

**返回值**:
```typescript
{
  tags: ReadonlyRef<Tag[]>           // 标签列表
  loading: ReadonlyRef<boolean>      // 加载状态
  error: ReadonlyRef<string | null>  // 错误信息
  fetchList: (params?) => Promise<any>          // 获取列表
  fetchPopular: (limit?) => Promise<Tag[]>      // 获取热门标签
  createTag: (data) => Promise<number>          // 创建标签
  searchTags: (keyword, limit?) => Promise<Tag[]> // 搜索标签
  deleteTag: (id) => Promise<void>              // 删除标签
  findByName: (name) => Tag | undefined         // 本地查找（按名称）
  findById: (id) => Tag | undefined             // 本地查找（按ID）
}
```

**使用示例**:
```typescript
const {
  tags,
  loading,
  fetchList,
  createTag,
  searchTags
} = useTags()

// 获取标签列表
await fetchList({ page: 1, pageSize: 20, sort: 'count' })

// 创建标签
const id = await createTag({ name: 'Vue', desc: 'Vue.js 相关' })

// 搜索标签
const results = await searchTags('vue', 10)

// 本地查找
const tag = findByName('Vue')
```

**使用位置**:
- 未直接使用（可能被 `TagSelector` 组件内部 API 调用替代）

**依赖**:
- `@app/api/tags.api` - 标签 API

**TODO**:
- 考虑在 `TagSelector` 组件中使用此 composable，简化组件逻辑

---

## 🎨 UI Composables

### useTheme

**文件路径**: [`useTheme.ts`](useTheme.ts)

**功能说明**:
- 主题切换管理
- 支持亮色/暗色模式
- 使用 useState 实现全局状态

**返回值**:
```typescript
{
  theme: ReadonlyRef<'light' | 'dark'>
  toggleTheme: () => void
  isDark: ComputedRef<boolean>
}
```

**使用示例**:
```typescript
const { theme, toggleTheme, isDark } = useTheme()

// 切换主题
toggleTheme()

// 监听主题变化
watch(isDark, (dark) => {
  console.log('暗色模式:', dark)
})
```

**使用位置**:
- `AppFloatingBar.vue` - 主题切换按钮

**核心特性**:
- 使用 `useState` 实现跨组件共享状态
- 自动添加/移除 `dark` class 到 `<html>` 元素
- 响应式计算 `isDark`

---

### useToastNotification

**文件路径**: [`useToastNotification.ts`](useToastNotification.ts)

**功能说明**:
- Toast 通知封装
- 基于 vue-toastification
- 提供简化的 API

**返回值**:
```typescript
{
  success: (message: string, options?: any) => void
  error: (message: string, options?: any) => void
  info: (message: string, options?: any) => void
  warning: (message: string, options?: any) => void
  clear: () => void
}
```

**使用示例**:
```typescript
const toast = useToastNotification()

// 成功提示
toast.success('操作成功！')

// 错误提示
toast.error('操作失败，请重试')

// 信息提示
toast.info('加载中...')

// 警告提示
toast.warning('请注意')

// 清除所有通知
toast.clear()
```

**使用位置**:
- `AppFloatingBar.vue` - 用户登出提示
- `TagSelector.client.vue` - 标签创建/删除提示
- `pages/index.vue` - 首页通知
- `pages/login/index.vue` - 登录通知

**依赖**:
- `vue-toastification` - Toast 库

---

## 📋 使用规范

### 1. Composable 命名约定

- **文件名**: `use` + 功能名 + `.ts`（如 `useTheme.ts`）
- **函数名**: 与文件名一致（如 `useTheme()`）
- **返回值**: 返回响应式数据和方法

```typescript
// ✅ 推荐
export function useTheme() {
  const theme = useState('theme', () => 'light')
  const toggleTheme = () => { /* ... */ }
  return { theme, toggleTheme }
}

// ❌ 不推荐
export function themeManager() { /* ... */ }
```

### 2. 类型导出

导出关键类型，供外部使用：

```typescript
// ✅ 推荐
export interface UseDragAndDropOptions {
  onDropFile: (file: File) => void
}

export function useDragAndDrop(options: UseDragAndDropOptions) {
  // ...
}
```

### 3. 响应式数据

使用 `readonly` 保护响应式数据：

```typescript
// ✅ 推荐
export function useTags() {
  const tags = ref<Tag[]>([])
  return {
    tags: readonly(tags),  // 只读暴露
    addTag: (tag: Tag) => tags.value.push(tag)
  }
}
```

### 4. 错误处理

Composable 内部处理错误，或抛出让调用者处理：

```typescript
// ✅ 推荐 - 内部处理
export function useAutoSave(options: UseAutoSaveOptions) {
  const save = async () => {
    try {
      await draftDB.set(key, value)
    } catch (error) {
      console.error('保存失败:', error)
    }
  }
}

// ✅ 推荐 - 抛出错误
export function useTags() {
  const fetchList = async () => {
    try {
      return await tagsApi.getList()
    } catch (error) {
      throw error  // 让调用者处理
    }
  }
}
```

### 5. 文档注释

为导出的函数添加 JSDoc 注释：

```typescript
/**
 * 自动保存 Composable
 * 将编辑内容自动保存到 IndexedDB，防止意外丢失
 *
 * @example
 * ```ts
 * const autoSave = useAutoSave({
 *   storageKey: 'editor-draft',
 *   getValue: () => editor.value?.getJSON(),
 *   setValue: (value) => editor.value?.commands.setContent(value)
 * })
 * ```
 */
export function useAutoSave<T>(options: UseAutoSaveOptions<T>) {
  // ...
}
```

### 6. 依赖管理

- **第三方库** 通过 `@app/` 别名导入
- **工具函数** 从 `@app/utils` 导入
- **API** 从 `@app/api` 导入
- **类型** 从相对路径或 `@app/utils/types` 导入

### 7. 📄 文档同步更新准则

**⚠️ 重要**: Composable 的任何变更必须同步更新本文档

**必须更新文档的情况**:
- ✅ **新增 Composable**: 在文档中添加新的 Composable 章节
- ✅ **新增方法/属性**: 更新返回值说明
- ✅ **修改方法签名**: 更新类型定义和参数说明
- ✅ **删除方法**: 从返回值中移除
- ✅ **依赖关系变更**: 更新依赖关系图
- ✅ **被新位置引用**: 更新"使用位置"列表

**更新检查清单**:
- [ ] 依赖关系矩阵
- [ ] Composable 详细说明章节
- [ ] 类型定义
- [ ] 使用示例
- [ ] 使用位置
- [ ] 状态统计

---

**(注：不需要在文档中维护版本历史，Git Commit 会记录所有变更轨迹。保持本文档始终为最新状态的快照即可。)**

## 📊 Composables 状态统计

| 状态 | 数量 | Composables 列表 |
|------|------|-----------------|
| ✅ 高频使用 | 2 | useRequest, useToastNotification |
| ✅ 中频使用 | 2 | useAutoSave, useTheme |
| ⚠️ 低频使用 | 2 | useMarkdownIO, useDragAndDrop |
| ⚠️ 未使用 | 1 | useTags |

### 使用频率排行

| 排名 | Composable | 引用次数 | 类型 |
|-----|-----------|---------|------|
| 1 | `useRequest` | 15+ | 核心 |
| 2 | `useToastNotification` | 4 | UI |
| 3 | `useAutoSave` | 2 | 功能 |
| 4 | `useTheme` | 1 | UI |
| 5 | `useMarkdownIO` | 1 | 功能 |
| 5 | `useDragAndDrop` | 1 | 功能 |

---


## 🔍 相关文档

- **组件文档**: [components/CLAUDE.md](../components/CLAUDE.md) - 组件使用文档
- **API 文档**: [api/](../api/) - API 接口说明
- **工具函数**: [utils/](../utils/) - 工具函数库
- **项目规范**: [CLAUDE.md](../../CLAUDE.md) - 项目级规范
