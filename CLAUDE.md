# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 提供项目指导。

---

## ⚠️ 关键规则

### Nuxt 4 自动导入机制

**在 `app/` 目录下的所有文件中，永远不要从 `vue` 中导入任何类型、Hook 或 API！**

不要导入：`ref`、`computed`、`onMounted`、`watch`、`Ref`、`ComputedRef` 等
直接使用即可，Nuxt 4 会自动导入所有 Vue API。

只有第三方库的组件和工具、相对路径的本地模块才需要手动导入。

### Controller + Service 分层规范

**所有 API 接口必须按照以下标准模式实现：**

#### Controller 层模板（`server/api/`）

```typescript
import { validateQuery } from '@server/utils/validation'
import { someSchema } from '@server/schemas/some.schema'
import { successResponse } from '@server/utils/response'

export default defineEventHandler(async (event) => {
  const query = validateQuery(event, someSchema)
  const { someService } = await import('@server/services/some.service')
  const result = someService.someMethod(query)
  return successResponse(result)
})
```

**职责**：参数验证 → 调用 Service → 返回响应

#### Service 层模板（`server/services/`）

```typescript
import db from '../utils/db'

export const someService = {
  someMethod(options: SomeOptions) {
    const stmt = db.prepare('SELECT * FROM table WHERE condition = ?')
    return stmt.all(param)
  }
}
```

**职责**：SQL 查询、业务逻辑、数据处理

**核心要点**：
- 使用 `await import('@server/services/xxx.service')` 动态导入
- SQL 查询必须在 Service 层，Controller 只做验证和调用
- 使用 `successResponse()` 包装返回结果

---

## 架构规范

### 目录结构

```
app/                    # 前端（Nuxt app）
  ├── api/             # 前端 API 请求封装
  ├── components/      # Vue 组件（global/ 自动导入）
  ├── composables/     # 组合式函数（自动导入）
  ├── layouts/         # 布局组件
  ├── pages/           # 文件路由
  └── utils/           # 前端工具

server/                 # 后端（Nitro）
  ├── api/             # Controller 层（参数验证、调用 service）
  ├── schemas/         # Zod 验证 Schema
  ├── services/        # Service 层（SQL、业务逻辑）
  └── utils/           # 工具函数（db.ts、validation.ts、response.ts）
```

### 命名约定

- 文件名：`kebab-case`（如 `posts.service.ts`）
- 组件名：`PascalCase`（如 `AppFloatingBar.vue`）
- API 路由：复数形式（如 `/api/posts`）
- 数据库表：复数形式（如 `posts`）

---

## 关键工具入口

### 后端

| 工具 | 路径 | 用途 |
|------|------|------|
| `validateQuery` | `@server/utils/validation` | 验证查询参数 |
| `validateBody` | `@server/utils/validation` | 验证请求体 |
| `successResponse` | `@server/utils/response` | 成功响应包装 |
| `errors.notFound` | `@server/utils/response` | 404 错误 |
| `db` | `@server/utils/db` | 数据库实例 |

### 前端

| 工具 | 路径 | 用途 |
|------|------|------|
| `useApi()` | `app/composables/useApi.ts` | API 请求封装 |
| `useToastNotification()` | `app/composables/useToastNotification.ts` | 通知提示 |

### UI 组件

- **Element Plus**：`el-button`、`el-input`、`el-table` 等（自动导入）
- **Nuxt UI**：`UButton`、`UCard`、`UModal` 等
- **图标**：`<Icon name="lucide:search" />`（@nuxt/icon）

---

## 其他文档

- **后端详细规范**：`server/CLAUDE.md`（数据库表结构、API 路由列表）
- **前端组件列表**：`app/CLAUDE.md`（组件、Composables、页面路由）
- **技术日志规范**：`resource/技术日志记录规范.md`

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm lint:fix` | ESLint 自动修复 |
| `pnpm format` | Prettier 格式化 |

---

## 项目技术栈

**核心**：Nuxt 4、TypeScript、Zod、Sass、better-sqlite3

**UI**：Element Plus、Nuxt UI、vue-toastification、Swiper

**编辑器**：TipTap（富文本）、@nuxt/content（Markdown）

**存储**：SQLite、IndexedDB（idb）

**包管理**：pnpm
