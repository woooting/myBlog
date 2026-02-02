# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 提供项目指导。

> **💡 文档查询提示**：当在 Nuxt 文档中找不到需要的上下文时，去 **Nitro** 或 **H3** 的文档中查看。这两个是 Nuxt 的上游库，处理服务端逻辑（如 `defineEventHandler`、`validateBody`、`createError` 等）时经常需要直接参考它们的 API。

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
  ├── app.vue               # 根组件
  ├── assets/
  │   └── styles/
  │       └── main.scss     # 主样式入口
  ├── components/           # Vue 组件
  │   ├── global/           # 全局组件（自动导入）
  │   │   └── AppFloatingBar.vue
  │   └── NavList.vue       # 局部组件
  ├── composables/          # 组合式函数（自动导入）
  │   └── useTheme.ts       # 主题切换
  ├── layouts/              # 布局组件
  │   └── default.vue       # 默认布局
  └── pages/                # 文件路由
      ├── index.vue         # 首页
      └── category/
          └── [PagePath].vue # 动态分类页面

server/                      # Nitro 服务器（后端）
  ├── api/                  # API 路由（Controller 层）
  │   └── posts/
  │       ├── index.get.ts
  │       ├── index.post.ts
  │       ├── [id].get.ts
  │       ├── [id].put.ts
  │       ├── [id].delete.ts
  │       └── [id]/publish.post.ts
  ├── services/             # 业务逻辑层
  │   └── posts.service.ts
  ├── schemas/              # Zod 验证 Schema
  │   └── post.schema.ts    # 文章相关验证
  ├── utils/                # 工具函数
  │   ├── db.ts             # 数据库单例
  │   ├── validation.ts     # 验证辅助函数
  │   ├── handler.ts        # （已废弃）
  │   └── response.ts       # 统一响应格式
  ├── plugins/              # Nitro 插件
  │   └── init-db.ts        # 数据库初始化
  └── middleware/           # Nitro 中间件

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

### 统一响应格式

**成功响应**：
```typescript
{
  success: true,
  code: 200,
  message: "操作成功",
  data: { ... }
}
```

**错误快捷方法**（`server/utils/response.ts`）：
```typescript
errors.badRequest()     // 400 - 请求参数错误
errors.notFound()       // 404 - 资源不存在
errors.unauthorized()   // 401 - 未授权
errors.forbidden()      // 403 - 禁止访问
errors.internal()       // 500 - 服务器错误
```

### 全局错误处理（`server/plugins/error-handle.ts`）

项目通过拦截 `h3App.options.onError` 实现了统一错误响应格式。

**错误响应格式**：
```json
{
  "success": false,
  "code": 404,
  "message": "文章不存在",
  "path": "/api/posts/1",
  "stack": "..."  // 仅开发环境
}
```

**实现代码**：
```typescript
export default defineNitroPlugin((nitroApp) => {
  nitroApp.h3App.options.onError = (error, event) => {
    // 防止重复发送响应
    if (event.node.res.headersSent) {
      return
    }

    const statusCode = error.statusCode || 500
    const message = error.message || 'Internal Server Error'

    const response = {
      success: false,
      code: statusCode,
      message,
      path: event.path,
      // 开发环境返回堆栈，生产环境隐藏
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }

    event.node.res.setHeader('Content-Type', 'application/json')
    event.node.res.end(JSON.stringify(response))
  }
})
```

**为什么用 `h3App.options.onError` 而不是 `hooks.hook('error')`**：
- `hooks.hook('error')` - 观察/监听模式，用于日志、上报等副作用
- `h3App.options.onError` - 处理器模式，用于完全接管错误响应

### 请求验证（使用 Zod）

项目使用 **Zod + H3 内置工具** 进行参数验证，提供运行时验证和类型安全。

#### 已实现的验证辅助函数（`server/utils/validation.ts`）

```typescript
// 三种验证方式，两种错误处理模式
validateBody(event, schema)      // safeParse + 自定义错误消息
validateQuery(event, schema)     // safeParse + 自定义错误消息
validateParams(event, schema)    // safeParse + 自定义错误消息

validateBodyOrThrow(event, schema)      // parse + Zod 默认异常
validateQueryOrThrow(event, schema)     // parse + Zod 默认异常
validateParamsOrThrow(event, schema)    // parse + Zod 默认异常
```

**推荐使用**：`validateBody/Query/Params` - 返回友好的中文错误消息。

#### 使用示例

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

// 验证路径参数
export default defineEventHandler(async (event) => {
  const { id } = await validateParams(event, postParamsSchema)
  // id 类型: number，已通过验证
})
```

#### Schema 定义示例（`server/schemas/post.schema.ts`）

```typescript
import { z } from 'zod'

// 文章状态枚举（带错误消息）
export const postStatusEnum = z.enum(['draft', 'published'], {
  message: '状态必须是 draft 或 published',
})

// 创建文章 Schema
export const createPostSchema = z.object({
  title: z.string()
    .min(1, { message: '标题不能为空' })
    .max(200, { message: '标题不能超过 200 字符' })
    .trim(),

  content: z.string()
    .min(1, { message: '内容不能为空' })
    .trim(),

  summary: z.string().trim().optional(),
  status: postStatusEnum.default('draft'),
  category: z.string().trim().optional(),
  tags: z.array(z.string()).optional(),
  cover_image: z.string().url('封面图必须是有效的 URL').optional().or(z.literal('')),
})

// 自动推导类型
export type CreatePostInput = z.infer<typeof createPostSchema>

// 更新文章 Schema（所有字段可选）
export const updatePostSchema = createPostSchema.partial()
export type UpdatePostInput = z.infer<typeof updatePostSchema>

// 查询参数 Schema
export const getListQuerySchema = z.object({
  status: postStatusEnum.optional(),
  category: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

// 路径参数 Schema（带类型转换）
export const postParamsSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, 'ID 必须是数字')
    .transform((val) => Number(val))  // string → number
    .refine((val) => val > 0, 'ID 必须大于 0'),
})
```

#### 验证流程

```
请求 → validateBody() → Zod safeParse → 失败？
                                    ↓ 是
                           formatZodError() 格式化错误
                                    ↓
                           errors.badRequest() 抛出 400
                                    ↓
                           error-handle.ts 统一响应格式
```

## 前端功能

### 已实现组件

| 组件 | 位置 | 功能 |
|------|------|------|
| `AppFloatingBar` | `app/components/global/` | 全局浮动栏 |
| `NavList` | `app/components/` | 导航列表 |

### Composables

| 函数 | 位置 | 功能 |
|------|------|------|
| `useTheme` | `app/composables/useTheme.ts` | 主题切换（dark/light） |

### 布局

- `default.vue` - 默认布局，包含导航栏和主题切换

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

## 环境变量

- `.env` 文件放在项目根目录
- `DATABASE_PATH` - 数据库文件路径（默认 `./data/blog.db`）
- Nuxt 4 内置支持 `process.env`

## 已安装依赖

### 核心依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `better-sqlite3` | 12.5.0 | 嵌入式 SQLite 数据库 |
| `zod` | 4.3.6 | Schema 验证与类型推导 |
| `@nuxt/content` | ^2.14.0 | Markdown 内容管理 |
| `@nuxt/icon` | ^1.10.3 | 图标系统 |

### 类型包

| 包名 | 版本 | 用途 |
|------|------|------|
| `@types/better-sqlite3` | ^7.6.13 | better-sqlite3 类型定义 |

### 工具包

| 包名 | 版本 | 用途 |
|------|------|------|
| `sass` | ^1.97.3 | Sass 样式预处理器 |
| `eslint-config-prettier` | ^10.1.8 | ESLint 与 Prettier 兼容配置 |

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

1. Node 内置模块
2. 外部依赖
3. 内部模块（相对路径）
4. 类型导入（如有）

---

`★ Insight ─────────────────────────────────────`
- **双层内容架构**：项目巧妙结合了数据库和 Markdown 文件，数据库适合需要管理的动态内容，Markdown 适合纯展示的静态页面
- **简化的两层设计**：对于小型项目，Service 层直接处理数据库操作避免了过度抽象，保持了代码简洁
- **Zod 验证优势**：Schema 定义即类型定义，一次编写同时获得运行时验证和 TypeScript 类型推导，消除了类型和验证规则不一致的问题
`─────────────────────────────────────────────────`
