# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 提供项目指导。

> **💡 文档查询提示**：当在 Nuxt 文档中找不到需要的上下文时，去 **Nitro** 或 **H3** 的文档中查看。这两个是 Nuxt 的上游库，处理服务端逻辑（如 `defineEventHandler`、`validateBody`、`createError` 等）时经常需要直接参考它们的 API。

---

## ⚠️ 重要注意事项：Nuxt 4 自动导入机制

**在 `app/` 目录下的所有文件中，永远不要从 `vue` 中导入任何类型、Hook 或 API！**

### ❌ 禁止的导入

```typescript
// 以下导入方式在 app/ 目录下都是禁止的：
import { ref, computed, onMounted, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'
```

### ✅ 正确做法

```typescript
// 所有 Vue API 和类型都是自动导入的，直接使用
const count = ref(0)
const doubled = computed(() => count.value * 2)

onMounted(() => {
  console.log('mounted')
})

watch(count, (newValue) => {
  console.log(newValue)
})

// 类型也是自动导入的，无需 import type
function processValue(value: Ref<number>) {
  // ...
}
```

### 原因

Nuxt 4 会自动导入所有 Vue 的 Composition API、响应式 API 和类型定义：
- **响应式 API**：`ref`, `computed`, `reactive`, `readonly` 等
- **生命周期 Hook**：`onMounted`, `onBeforeUnmount`, `watch` 等
- **类型定义**：`Ref`, `ComputedRef`, `Writable` 等
- **Nuxt 专属 API**：`useRouter`, `useRoute`, `useNuxtApp` 等

手动导入会导致：
- 模块解析错误
- 运行时冲突
- 构建失败

### 唯一需要导入的

```typescript
// ✅ 第三方库的组件和工具
import { useEditor } from '@tiptap/vue-3'
import { Markdown } from 'tiptap-markdown'

// ✅ 相对路径的本地模块
import { myUtil } from '../utils/myUtil'

// ✅ 类型定义从其他包
import type { SomeType } from 'some-library'
```

---

## 项目概述

基于 Nuxt 4 的个人博客项目，采用**双层内容管理**架构：
- **SQLite 数据库** - 存储动态内容（文章、分类、标签等）
- **@nuxt/content** - 处理静态 Markdown 内容（文档、页面）

技术栈：
- **Nuxt 4** - 全栈框架（Vue 3 + Nitro）
- **TypeScript** - 类型安全
- **Zod** - Schema 验证与类型推导
- **Sass** - 样式预处理器
- **better-sqlite3** - 嵌入式数据库
- **@nuxt/icon** - 图标系统
- **TipTap** - 富文本编辑器

项目使用 **pnpm** 作为包管理器。

## 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器 http://localhost:3000

# 构建与预览
pnpm build            # 生产构建
pnpm preview          # 本地预览生产构建

# 代码质量
pnpm lint             # ESLint 检查
pnpm lint:fix         # ESLint 自动修复
pnpm format           # Prettier 格式化
pnpm format:check     # 检查代码格式
```

## 架构设计

### 目录结构

```
app/                         # Nuxt app 目录（前端）
  ├── api/                   # 前端 API 请求封装
  │   └── posts.api.ts      # 文章相关 API
  ├── assets/
  │   └── styles/
  │       └── main.scss     # 主样式入口
  ├── components/           # Vue 组件
  │   ├── global/           # 全局组件（自动导入）
  │   │   └── AppFloatingBar.vue
  │   ├── NavList.vue       # 局部组件
  │   └── MarkDownEditor.client.vue  # 富文本编辑器
  ├── composables/          # 组合式函数（自动导入）
  │   ├── useTheme.ts       # 主题切换
  │   ├── useApi.ts         # 请求封装
  │   ├── useDragAndDrop.ts # 拖拽上传
  │   └── useMarkdownIO.ts  # Markdown 导入/导出
  ├── layouts/              # 布局组件
  │   ├── default.vue       # 默认布局
  │   └── admin.vue         # 管理后台布局
  ├── pages/                # 文件路由
  │   ├── index.vue         # 首页
  │   └── admin/
  │       └── index.vue     # 管理后台首页
  └── types/                # 类型定义（如需要）
      └── api.types.ts      # API 相关类型

server/                      # Nitro 服务器（后端）
  ├── api/                  # API 路由（Controller 层）
  │   └── posts/
  │       ├── index.get.ts
  │       ├── index.post.ts
  │       ├── [id].get.ts
  │       ├── [id].put.ts
  │       ├── [id].delete.ts
  │       └── [id]/publish.post.ts
  ├── plugins/              # Nitro 插件
  │   ├── error-handle.ts   # 全局错误处理
  │   └── init-db.ts        # 数据库初始化
  ├── schemas/              # Zod 验证 Schema
  │   └── post.schema.ts    # 文章相关验证
  ├── services/             # 业务逻辑层
  │   └── posts.service.ts
  └── utils/                # 工具函数
      ├── db.ts             # 数据库单例
      ├── response.ts       # 统一响应格式
      └── validation.ts     # 验证辅助函数

public/                      # 静态资源
  └── image/                # 图片资源

data/                        # 数据文件
  └── blog.db              # SQLite 数据库文件
```

### 后端分层

项目采用**简化的两层架构**：

| 层级 | 位置 | 职责 |
|------|------|------|
| **API/Controllers** | `server/api/` | 处理 HTTP 请求、参数验证，调用 services |
| **Services** | `server/services/` | 业务逻辑、数据库操作 |

**注意**：项目没有独立的 Repository 层，数据库操作直接在 Service 层中完成。

### 数据库架构

**数据库文件**：`./data/blog.db`（相对于项目根目录）

**posts 表结构**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER | 主键，自增 |
| `title` | TEXT | 文章标题（必填） |
| `content` | TEXT | 文章内容 |
| `summary` | TEXT | 文章摘要 |
| `status` | TEXT | 状态：`draft`（草稿）/ `published`（已发布） |
| `category` | TEXT | 分类 |
| `tags` | TEXT | 标签（JSON 数组字符串） |
| `cover_image` | TEXT | 封面图 URL |
| `view_count` | INTEGER | 浏览次数 |
| `created_at` | DATETIME | 创建时间 |
| `updated_at` | DATETIME | 更新时间 |
| `published_at` | DATETIME | 发布时间 |

**重要**：
- 数据库实例从 `server/utils/db.ts` 导入（单例模式）
- WAL 模式已启用：`journal_mode = WAL`
- `server/plugins/init-db.ts` 在服务器启动时自动初始化表结构

### API 路由列表

| 方法 | 路径 | 文件 | 功能 |
|------|------|------|------|
| GET | `/api/posts` | `server/api/posts/index.get.ts` | 获取文章列表 |
| POST | `/api/posts` | `server/api/posts/index.post.ts` | 创建文章 |
| GET | `/api/posts/:id` | `server/api/posts/[id].get.ts` | 获取单篇文章 |
| PUT | `/api/posts/:id` | `server/api/posts/[id].put.ts` | 更新文章 |
| DELETE | `/api/posts/:id` | `server/api/posts/[id].delete.ts` | 删除文章 |
| POST | `/api/posts/:id/publish` | `server/api/posts/[id]/publish.post.ts` | 发布文章 |

---

## 后端：统一响应格式

### 成功响应

```typescript
{
  success: true,
  code: 200,
  message: "操作成功",
  data: { ... }  // 响应数据
}
```

### 失败响应

```typescript
{
  success: false,
  code: 404,      // HTTP 状态码
  message: "文章不存在",
  path: "/api/posts/1",
  stack: "..."    // 仅开发环境
}
```

### 错误快捷方法（`server/utils/response.ts`）

```typescript
errors.badRequest()     // 400 - 请求参数错误
errors.notFound()       // 404 - 资源不存在
errors.unauthorized()   // 401 - 未授权
errors.forbidden()      // 403 - 禁止访问
errors.internal()       // 500 - 服务器错误
```

### 全局错误处理（`server/plugins/error-handle.ts`）

项目通过拦截 `h3App.options.onError` 实现了统一错误响应格式。

**为什么用 `h3App.options.onError` 而不是 `hooks.hook('error')`**：
- `hooks.hook('error')` - 观察/监听模式，用于日志、上报等副作用
- `h3App.options.onError` - 处理器模式，用于完全接管错误响应

---

## 前端：API 请求封装

### 核心函数（`app/composables/useApi.ts`）

```typescript
const { request } = useApi()

// GET 请求
const posts = await request<Post[]>('/api/posts', {
  params: { status: 'published', page: 1 }
})

// POST 请求
const newPost = await request<Post>('/api/posts', {
  method: 'POST',
  body: { title: '标题', content: '内容' },
  showToast: true,
})

// 错误处理
try {
  await request('/api/posts', { showToast: true })
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.code, error.message)
  }
}
```

### 类型定义（`app/api/api.types.ts`）

```typescript
// 统一响应格式
export interface ApiResponse<T = any> {
  success: boolean
  code: number
  message: string
  data?: T
  path?: string
  stack?: string
}

// 错误类
export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 请求配置
export interface ApiRequestConfig {
  method?: HttpMethod
  headers?: Record<string, string>
  params?: Record<string, any>
  body?: any
  timeout?: number
  showToast?: boolean
}
```

### 请求处理流程

```
请求发送 → fetch → response.ok 检查 → 解析 JSON → success 检查 → 返回 data
                                     ↓                  ↓
                                  HTTP 错误          业务失败
                                     ↓                  ↓
                               抛出 ApiError      抛出 ApiError
```

---

## 请求验证（使用 Zod）

项目使用 **Zod + H3 内置工具** 进行参数验证，提供运行时验证和类型安全。

### 验证辅助函数（`server/utils/validation.ts`）

```typescript
// 推荐使用：返回友好错误消息
validateBody(event, schema)
validateQuery(event, schema)
validateParams(event, schema)

// 或使用：抛出 Zod 默认异常
validateBodyOrThrow(event, schema)
validateQueryOrThrow(event, schema)
validateParamsOrThrow(event, schema)
```

### 使用示例

```typescript
import { validateBody, validateQuery, validateParams } from '@server/utils/validation'
import { createPostSchema, getListQuerySchema, postParamsSchema } from '@server/schemas/post.schema'

// 验证请求体
export default defineEventHandler(async (event) => {
  const body = await validateBody(event, createPostSchema)
  // body 类型: CreatePostInput，已通过验证
})

// 验证查询参数
export default defineEventHandler(async (event) => {
  const query = await validateQuery(event, getListQuerySchema)
  // query 类型: GetListQuery，已通过验证
})
```

---

## 前端功能

### 已实现组件

| 组件 | 位置 | 功能 |
|------|------|------|
| `AppFloatingBar` | `app/components/global/` | 全局浮动栏 |
| `NavList` | `app/components/` | 导航列表 |
| `MarkDownEditor` | `app/components/` | 富文本编辑器（支持 Markdown） |

### Composables

| 函数 | 位置 | 功能 |
|------|------|------|
| `useTheme` | `app/composables/useTheme.ts` | 主题切换（dark/light） |
| `useApi` | `app/composables/useApi.ts` | API 请求封装 |
| `useDragAndDrop` | `app/composables/useDragAndDrop.ts` | 拖拽文件上传 |
| `useMarkdownIO` | `app/composables/useMarkdownIO.ts` | Markdown 导入/导出 |

### 布局

- `default.vue` - 默认布局，包含导航栏和主题切换
- `admin.vue` - 管理后台布局

---

## Nitro 服务器说明

### 文件路由规则

- `server/api/posts/index.get.ts` → `GET /api/posts`
- `server/api/posts/[id].get.ts` → `GET /api/posts/:id`
- `server/api/posts/[id]/publish.post.ts` → `POST /api/posts/:id/publish`

### 方法特定处理器

通过添加文件后缀处理特定 HTTP 方法：
- `.get.ts` - GET 请求
- `.post.ts` - POST 请求
- `.put.ts` - PUT 请求
- `.delete.ts` - DELETE 请求

### 插件与中间件

- **插件**：`server/plugins/` 中的插件在服务器启动时自动运行
- **中间件**：`server/middleware/` 在所有路由处理器之前运行

---

## 环境变量

- `.env` 文件放在项目根目录
- `DATABASE_PATH` - 数据库文件路径（默认 `./data/blog.db`）
- Nuxt 4 内置支持 `process.env`

---

## 已安装依赖

### 核心依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `better-sqlite3` | 12.5.0 | 嵌入式 SQLite 数据库 |
| `zod` | 4.3.6 | Schema 验证与类型推导 |
| `@nuxt/content` | ^3.11.0 | Markdown 内容管理 |
| `@nuxt/icon` | ^2.2.1 | 图标系统 |
| `@tiptap/vue-3` | ^3.19.0 | 富文本编辑器 |
| `tiptap-markdown` | ^0.9.0 | Markdown 支持 |

### 类型包

| 包名 | 版本 | 用途 |
|------|------|------|
| `@types/better-sqlite3` | ^7.6.13 | better-sqlite3 类型定义 |

### 工具包

| 包名 | 版本 | 用途 |
|------|------|------|
| `sass` | ^1.97.3 | Sass 样式预处理器 |
| `eslint-config-prettier` | ^10.1.8 | ESLint 与 Prettier 兼容配置 |

---

## 开发规范

### 代码风格

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 和 Prettier 配置
- Vue 组件使用 `<script setup>` 语法
- 组合式 API 风格

### 命名约定

- 文件名：`kebab-case`（如 `posts.service.ts`）
- 组件名：`PascalCase`（如 `AppFloatingBar.vue`）
- API 路由：复数形式（如 `/api/posts`）
- 数据库表：复数形式（如 `posts`）

### 导入顺序

1. 第三方库（从 `node_modules`）
2. 相对路径的本地模块
3. 类型定义（使用 `import type`）

---

`★ Insight ─────────────────────────────────────`
- **双层内容架构**：项目巧妙结合了数据库和 Markdown 文件，数据库适合需要管理的动态内容，Markdown 适合纯展示的静态页面
- **简化的两层设计**：对于小型项目，Service 层直接处理数据库操作避免了过度抽象，保持了代码简洁
- **Zod 验证优势**：Schema 定义即类型定义，一次编写同时获得运行时验证和 TypeScript 类型推导，消除了类型和验证规则不一致的问题
- **Nuxt 4 自动导入**：充分利用 Nuxt 的自动导入机制，减少样板代码，提升开发体验
`─────────────────────────────────────────────────`
