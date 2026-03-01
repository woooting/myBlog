---
title: "App Components 文档"
description: "前端组件使用情况、功能说明和依赖关系"
lastUpdated: 2025-03-01
version: "1.0.0"
components:
  total: 7
  global: 1
  regular: 6
table_of_contents:
  - 依赖关系矩阵
  - 全局组件规范
  - 通用组件清单 (7个)
  - 客户端组件后缀规则
  - 组件使用规范
  - AI 开发规范
---

# App Components 文档

> 本文档记录 `app/components/` 目录下所有组件的使用情况、依赖关系和功能说明。

---

## 📑 目录

- [组件依赖关系图](#组件依赖关系图)
- [全局组件](#全局组件-global)
- [通用组件](#通用组件)
- [客户端组件](#客户端组件-client-only)
- [组件使用规范](#组件使用规范)

---

## 🔗 组件依赖关系图

```
layouts/
├── default.vue
│   ├── AppFloatingBar (全局组件)
│   └── NavList
│
├── admin.vue
│   └── NavList
│
pages/
├── index.vue
│   └── CarouselSwiper
│
└── admin/system/editor.vue
    ├── MarkDownEditor
    └── TagSelector
```

### 依赖关系矩阵

| 组件 | 被引用位置 | 使用次数 |
|------|-----------|---------|
| `AppFloatingBar` | `layouts/default.vue` | 1 |
| `NavList` | `layouts/default.vue`, `layouts/admin.vue` | 2 |
| `CarouselSwiper` | `pages/index.vue` | 1 |
| `MarkDownEditor` | `pages/admin/system/editor.vue` | 1 |
| `TagSelector` | `pages/admin/system/editor.vue` | 1 |
| `Sidebar` | 未使用 (已在 default.vue 中注释) | 0 |
| `ImageCard` | 未使用 | 0 |

---

## 🌍 全局组件 (`global/`)

### AppFloatingBar

**文件路径**: [`global/AppFloatingBar.vue`](global/AppFloatingBar.vue)

**功能说明**:
- 顶部固定导航栏组件
- 包含 Logo、搜索、主题切换、通知、用户头像等功能
- 集成搜索对话框（支持防抖、加载状态、结果显示）
- 用户登录/登出状态管理

**Props**: 无

**主要功能**:
- 搜索文章（调用 `@app/api/search.api`）
- 主题切换（使用 `useTheme()` composable）
- 用户认证（使用 `useAuth()` composable）
- 头像加载失败处理

**依赖**:
- `@app/api/search.api` - 搜索 API
- `useTheme()` - 主题管理
- `useAuth()` - 认证管理
- `useToastNotification()` - 通知提示

**使用位置**:
- `layouts/default.vue` - 默认布局顶部

**Event**:
- 点击用户头像：已登录显示退出确认，未登录跳转登录页
- 点击搜索图标：打开搜索对话框

---

## 📦 通用组件

### NavList

**文件路径**: [`NavList.vue`](NavList.vue)

**功能说明**:
- 侧边栏导航列表组件
- 支持图标+文字显示
- 响应式设计（移动端收缩为仅图标）
- 激活状态高亮

**Props**:
```typescript
interface NavItem {
  name: string      // 导航项名称
  path: string      // 路由路径
  iconname: string  // 图标名称（使用 @nuxt/icon）
}

defineProps<{
  navList: NavItem[]  // 导航项数组
}>()
```

**使用示例**:
```vue
<NavList :nav-list="[
  { name: '首页', path: '/', iconname: 'lucide:home' },
  { name: '文章', path: '/posts', iconname: 'lucide:file-text' }
]" />
```

**使用位置**:
- `layouts/default.vue` - 默认布局侧边栏
- `layouts/admin.vue` - 管理后台侧边栏

**样式特性**:
- 毛玻璃效果背景（`backdrop-filter: blur(10px)`）
- 悬停时右移动画（`translateX(4px)`）
- 激活状态使用主题色高亮
- 移动端（<980px）自动收缩为图标模式

---

### CarouselSwiper

**文件路径**: [`CarouselSwiper.vue`](CarouselSwiper.vue)

**功能说明**:
- 基于 Swiper 的轮播组件
- 带倒计时 Pagination（激活的点变成长条，进度条动画填充）
- 支持自动播放、手动切换、拖拽
- 响应式设计

**Props**:
```typescript
interface CarouselItem {
  image?: string        // 图片地址
  title?: string        // 标题
  description?: string  // 描述
  link?: string         // 链接地址
}

interface Props {
  items: CarouselItem[]           // 轮播项数组
  autoplayDelay?: number          // 自动播放延迟（毫秒），默认 5000
  showArrows?: boolean            // 是否显示导航箭头，默认 false
  loop?: boolean                  // 是否循环播放，默认 true
  paginationPosition?: 'top' | 'bottom'  // Pagination 位置，默认 'bottom'
}
```

**使用示例**:
```vue
<CarouselSwiper
  :items="[
    {
      image: '/images/banner1.jpg',
      title: '欢迎来到我的博客',
      description: '分享技术与生活',
      link: '/posts/1'
    }
  ]"
  :autoplay-delay="5000"
  :show-arrows="true"
/>
```

**使用位置**:
- `pages/index.vue` - 首页轮播图

**核心特性**:
- 倒计时 Pagination：激活的 bullet 从 8px 圆点变为 32px 长条，进度条从左到右填充
- 鼠标悬停暂停自动播放
- 支持图片懒加载（`loading="lazy"`）
- 自定义导航箭头样式

**依赖**:
- `swiper/vue` - Swiper Vue 组件
- `swiper/modules` - Autoplay, Pagination, Navigation 模块

---

### MarkDownEditor

**文件路径**: [`MarkDownEditor.client.vue`](MarkDownEditor.client.vue)

**功能说明**:
- 基于 TipTap 的富文本 Markdown 编辑器
- 支持 Markdown 导入/导出
- 拖拽上传 .md 文件
- 草稿自动保存（IndexedDB）
- 图片插入（URL 或本地上传 Base64）
- 代码高亮（lowlight）

**Props**:
```typescript
interface Props {
  modelValue?: string   // 编辑器内容（HTML）
  placeholder?: string  // 占位符文本，默认 '开始输入内容...'
  storageKey?: string   // 自定义存储 key（用于草稿恢复）
}
```

**Emits**:
```typescript
emit('update:modelValue', value: string)  // 内容更新
emit('ready')                              // 编辑器就绪
```

**使用示例**:
```vue
<MarkDownEditor
  v-model="form.content"
  placeholder="开始编写你的文章..."
  storage-key="post-editor-draft"
  @ready="onEditorReady"
/>
```

**使用位置**:
- `pages/admin/system/editor.vue` - 文章编辑器

**核心功能**:
- 工具栏：导入/导出 Markdown、插入图片、文本格式、标题、列表、撤销/重做
- 拖拽支持：拖入 .md/.markdown/.txt 文件自动导入内容
- 草稿恢复：检测到未保存草稿时显示恢复提示栏
- 图片插入：支持 URL 链接或本地上传（转换为 Base64）
- 代码块：支持语法高亮（使用 lowlight）

**依赖**:
- `@tiptap/vue-3` - TipTap Vue 3 集成
- `@tiptap/starter-kit` - 基础扩展
- `@tiptap/extension-placeholder` - 占位符
- `@tiptap/extension-link` - 链接
- `@tiptap/extension-image` - 图片
- `tiptap-extension-resize-image` - 图片缩放
- `@tiptap/extension-code-block-lowlight` - 代码块高亮
- `tiptap-markdown` - Markdown 支持
- `lowlight` - 语法高亮
- `@app/composables/useDragAndDrop` - 拖拽功能
- `@app/composables/useMarkdownIO` - Markdown IO
- `@app/composables/useAutoSave` - 自动保存

---

### TagSelector

**文件路径**: [`TagSelector.client.vue`](TagSelector.client.vue)

**功能说明**:
- 标签选择器组件（支持多选）
- 支持搜索标签、创建新标签
- 显示热门标签
- 限制最多选择数量

**Props**:
```typescript
interface Props {
  modelValue: number[]   // 选中的标签 ID 数组
  maxTags?: number       // 最多标签数量，默认 3
  placeholder?: string   // 占位符，默认 '选择标签...'
  disabled?: boolean     // 是否禁用，默认 false
}
```

**使用示例**:
```vue
<TagSelector
  v-model="form.tagIds"
  :max-tags="3"
  placeholder="输入标签名，如 Vue、React..."
/>
```

**使用位置**:
- `pages/admin/system/editor.vue` - 文章编辑器标签选择

**核心功能**:
- 搜索标签：使用 el-autocomplete 实时搜索
- 创建标签：搜索无结果时提示创建新标签
- 热门标签：显示使用频率最高的标签
- 标签云：点击标签切换选中状态
- 限制数量：超过 maxTags 时提示错误

**依赖**:
- `@app/api/tags.api` - 标签 API（getPopular, search, create）
- `@app/composables/useToastNotification` - 通知提示

---

### Sidebar

**文件路径**: [`Sidebar.vue`](Sidebar.vue)

**功能说明**:
- 侧边栏组件
- 包含日历卡片，显示有文章的日期

**Props**: 无

**使用位置**:
- 未使用（已在 `layouts/default.vue` 中注释掉）

**功能**:
- 日历显示：使用 Element Plus 的 `el-calendar`
- 文章标记：有文章的日期显示圆点标记
- 当前日期：`currentDate` ref 控制显示月份

**TODO**:
- 连接后端 API 获取实际文章发布日期
- 添加点击日期跳转到对应文章列表功能

---

### ImageCard

**文件路径**: [`ImageCard.vue`](ImageCard.vue)

**功能说明**:
- 响应式图片卡片组件
- 支持多种宽高比（正方形、竖版、横版、竖屏）
- 图片加载失败自动替换为占位图
- 悬停缩放效果

**Props**:
```typescript
interface Props {
  src: string                              // 图片地址
  alt?: string                             // 替代文本，默认 '图片'
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'story'  // 宽高比，默认 'square'
  rounded?: boolean                        // 是否圆角，默认 true
}
```

**使用示例**:
```vue
<ImageCard
  src="/images/avatar.jpg"
  alt="用户头像"
  aspect-ratio="square"
  :rounded="true"
/>
```

**使用位置**:
- 未使用

**宽高比说明**:
- `square`: 1:1 正方形
- `portrait`: 3:4 竖版
- `landscape`: 16:9 横版
- `story`: 9:16 竖屏

**样式特性**:
- 悬停时图片放大 1.05 倍
- 圆角 8px
- 占位图：SVG 格式的 "No Image" 文本

---

## 🖥️ 客户端组件 (Client Only)

| 组件 | 后缀 | 原因 |
|------|------|------|
| `MarkDownEditor` | `.client.vue` | 依赖浏览器 API（FileReader、IndexedDB） |
| `TagSelector` | `.client.vue` | 依赖 Element Plus 的 el-dialog、el-autocomplete |

---

## 📋 组件使用规范

### 1. 全局组件命名

全局组件放在 `global/` 目录下，使用 `App` 前缀：
- ✅ `AppFloatingBar.vue`
- ❌ `FloatingBar.vue`

### 2. 组件命名约定

- **文件名**: `PascalCase`（如 `ImageCard.vue`）
- **组件名**: 与文件名一致
- **客户端组件**: 添加 `.client.vue` 后缀

### 3. Props 定义

使用 TypeScript 接口定义 Props，并导出类型供父组件使用：

```typescript
// ✅ 推荐
export interface NavItem {
  name: string
  path: string
  iconname: string
}

defineProps<{
  navList: NavItem[]
}>()
```
```

### 6. 📄 文档同步更新准则

**⚠️ 重要**: 组件的任何变更必须同步更新本文档

**必须更新文档的情况**:
- ✅ **新增组件**: 在文档中添加新的组件章节
- ✅ **新增 Props**: 更新组件的 Props 定义
- ✅ **修改 Props**: 更新类型定义和使用示例
- ✅ **删除 Props**: 从 Props 表格中移除
- ✅ **组件被新位置引用**: 更新"使用位置"列表
- ✅ **依赖关系变更**: 更新依赖关系矩阵

**更新检查清单**:
- [ ] 依赖关系矩阵
- [ ] 组件详细说明章节
- [ ] Props 定义
- [ ] 使用示例
- [ ] 使用位置
- [ ] 状态统计

---
**(注：不需要在文档中维护版本历史，Git Commit 会记录所有变更轨迹。保持本文档始终为最新状态的快照即可。)**
## 📊 组件状态统计

| 状态 | 数量 | 组件列表 |
|------|------|---------|
| ✅ 已使用 | 5 | AppFloatingBar, NavList, CarouselSwiper, MarkDownEditor, TagSelector |
| ⚠️ 未使用 | 2 | Sidebar, ImageCard |
| 🔒 客户端组件 | 2 | MarkDownEditor, TagSelector |
| 🌍 全局组件 | 1 | AppFloatingBar |

---


## 🔍 相关文档

- **前端组件库**: [app/CLAUDE.md](../CLAUDE.md) - 前端完整文档
- **后端 API**: [server/CLAUDE.md](../../server/CLAUDE.md) - 后端 API 文档
- **项目规范**: [CLAUDE.md](../../CLAUDE.md) - 项目级规范
