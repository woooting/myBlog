# App CLAUDE.md

前端（Nuxt app）组件和功能列表。

---

## 已实现组件

| 组件 | 位置 | 功能 |
|------|------|------|
| `AppFloatingBar` | `components/global/` | 全局浮动栏 |
| `ImageCard` | `components/` | 响应式图片卡片 |
| `CarouselSwiper` | `components/` | 轮播组件（Swiper） |
| `NavList` | `components/` | 导航列表 |
| `MarkDownEditor` | `components/` | 富文本编辑器（TipTap） |
| `TagSelector` | `components/` | 标签选择器 |

---

## Composables

| 函数 | 位置 | 功能 |
|------|------|------|
| `useTheme()` | `composables/useTheme.ts` | 主题切换（dark/light） |
| `useApi()` | `composables/useApi.ts` | API 请求封装 |
| `useDragAndDrop()` | `composables/useDragAndDrop.ts` | 拖拽文件上传 |
| `useMarkdownIO()` | `composables/useMarkdownIO.ts` | Markdown 导入/导出 |
| `useToastNotification()` | `composables/useToastNotification.ts` | 通知提示 |
| `useAutoSave()` | `composables/useAutoSave.ts` | 自动保存（IndexedDB） |
| `useTags()` | `composables/useTags.ts` | 标签管理 |

---

## 前端 API 封装

| 模块 | 位置 | 功能 |
|------|------|------|
| `posts.api.ts` | `api/` | 文章 API |
| `messages.api.ts` | `api/` | 留言 API |
| `upload.api.ts` | `api/` | 文件上传 API |
| `search.api.ts` | `api/` | 搜索 API |
| `tags.api.ts` | `api/` | 标签 API |

---

## 页面路由

| 路径 | 文件 | 功能 |
|------|------|------|
| `/` | `pages/index.vue` | 首页 |
| `/admin` | `pages/admin/index.vue` | 管理后台首页 |
| `/admin/system/editor` | `pages/admin/system/editor.vue` | 编辑器 |
| `/admin/system/articles` | `pages/admin/system/articles.vue` | 文章管理 |
| `/category/[PagePath]` | `pages/category/[PagePath].vue` | 分类列表 |
| `/category/detail` | `pages/category/detail.vue` | 文章详情 |
| `/message` | `pages/message/index.vue` | 留言列表 |
| `/search` | `pages/search/index.vue` | 搜索页面 |

---

## 布局

- `default.vue` - 默认布局（含侧边导航栏）
- `admin.vue` - 管理后台布局

---

## 工具函数

| 模块 | 位置 | 功能 |
|------|------|------|
| `draftDB.ts` | `utils/` | IndexedDB 草稿存储 |
| `dateUtils.ts` | `utils/` | 日期格式化（相对/绝对时间） |
