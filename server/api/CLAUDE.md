---
title: "Controller 层文档"
description: "后端 API 路由定义和实现规范"
lastUpdated: 2025-03-01
version: "1.0.0"
apis:
  total: 6
  modules:
    - posts
    - tags
    - messages
    - search
    - auth
    - upload
table_of_contents:
  - Controller 三层架构规范
  - API 路由清单（6个模块）
  - 实现规范
---

# Server API 文档

> 本文档记录 `server/api/` 目录下所有 Controller 的路由定义和实现规范。

---

## 🏗️ Controller 三层架构规范

### 标准实现流程

**所有 Controller 必须遵守以下三层架构**：

```
┌─────────────────────────────────────────────┐
│ 1️⃣ 参数验证层 (Validation)                   │
│    - validateBody()   : 验证请求体            │
│    - validateQuery()  : 验证查询参数          │
│    - validateParams() : 验证路径参数          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2️⃣ 业务处理层 (Service)                     │
│    - 调用对应的 Service 方法                  │
│    - 处理业务逻辑                            │
│    - 数据库操作                              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3️⃣ 响应层 (Response)                        │
│    - successResponse() : 统一成功响应         │
│    - errors.xxx()      : 统一错误响应         │
└─────────────────────────────────────────────┘
```

### 标准模板

```typescript
import { validateBody/validateQuery/validateParams } from '@server/utils/validation'
import { xxxSchema } from '@server/schemas/xxx.schema'
import { successResponse } from '@server/utils/response'
import { xxxService } from '@server/services/xxx.service'

/**
 * API 说明
 * METHOD /api/xxx
 */
export default defineEventHandler(async (event) => {
  // 1️⃣ 验证参数
  const body = await validateBody(event, xxxSchema)

  // 2️⃣ 调用 Service
  const result = xxxService.method(body)

  // 3️⃣ 统一响应
  return successResponse(result, '操作成功')
})
```

### 统一响应格式

```typescript
// 成功响应
{
  success: true,
  code: 200,
  message: '操作成功',
  data: { /* 实际数据 */ }
}

// 错误响应
{
  success: false,
  code: 400/404/500,
  message: '错误信息'
}
```

---

## 📋 API 路由清单

### 📝 Posts - 文章模块

**路径**: `server/api/posts/`

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/posts` | GET | 获取文章列表（支持 status、category 筛选） |
| `/api/posts` | POST | 创建文章 |
| `/api/posts/paginated` | GET | 分页获取文章列表 |
| `/api/posts/:id` | GET | 获取文章详情 |
| `/api/posts/:id` | PUT | 更新文章 |
| `/api/posts/:id` | DELETE | 删除文章 |
| `/api/posts/batch-delete` | POST | 批量删除文章 |
| `/api/posts/:id/publish` | POST | 发布/撤回文章 |

**关联 Schema**: `post.schema.ts`
**关联 Service**: `posts.service.ts`

---

### 🏷️ Tags - 标签模块

**路径**: `server/api/tags/`

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/tags` | GET | 获取标签列表（分页、排序） |
| `/api/tags` | POST | 创建标签 |
| `/api/tags/:id` | PUT | 更新标签 |
| `/api/tags/:id` | DELETE | 删除标签 |
| `/api/tags/search` | GET | 搜索标签（模糊匹配） |
| `/api/tags/popular` | GET | 获取热门标签 |

**关联 Schema**: `tag.schema.ts`
**关联 Service**: `tags.service.ts`

---

### 💬 Messages - 留言模块

**路径**: `server/api/messages/`

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/messages` | GET | 获取留言列表（分页，含用户信息） |
| `/api/messages` | POST | 创建留言（支持登录用户和访客） |

**关联 Schema**: `message.schema.ts`
**关联 Service**: `messages.service.ts`

---

### 🔍 Search - 搜索模块

**路径**: `server/api/search/`

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/search/posts` | GET | 搜索文章（标题+标签匹配） |

**关联 Schema**: `tag.schema.ts` (postSearchQuerySchema)
**关联 Service**: `search.service.ts`

---

### 🔐 Auth - 认证模块

**路径**: `server/api/auth/`

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/auth/[...].ts` | GET | OAuth 认证回调（GitHub、Google） |

**关联 Schema**: 无
**关联 Service**: `users.service.ts`

---

### 📤 Upload - 上传模块

**路径**: `server/api/upload/`

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/upload/image` | POST | 上传图片 |

**关联 Schema**: 无
**关联 Service**: 无（直接处理文件上传）

---

## 📏 实现规范

### 1. 参数验证

**所有请求必须先验证参数**：

```typescript
// ✅ 验证请求体
const body = await validateBody(event, createPostSchema)

// ✅ 验证查询参数
const query = await validateQuery(event, getListQuerySchema)

// ✅ 验证路径参数
const { id } = await validateParams(event, postParamsSchema)
```

**验证工具**: [`@server/utils/validation.ts`](../utils/validation.ts)

---

### 2. 业务处理

**Controller 只负责调用 Service，不处理业务逻辑**：

```typescript
// ✅ 推荐 - 调用 Service
const result = postsService.create(body)

// ❌ 不推荐 - 直接操作数据库
const stmt = db.prepare('INSERT INTO posts ...')
```

---

### 3. 统一响应

**所有响应必须使用统一格式**：

```typescript
// ✅ 成功响应
return successResponse(data, '操作成功')

// ✅ 错误响应
errors.notFound('文章不存在')
errors.badRequest('参数错误')
```

**响应工具**: [`@server/utils/response.ts`](../utils/response.ts)

---

### 4. 动态导入 Service

**避免循环依赖，使用动态导入**：

```typescript
// ✅ 推荐 - 动态导入
const { postsService } = await import('@server/services/posts.service')

// ❌ 不推荐 - 静态导入（可能导致循环依赖）
import { postsService } from '@server/services/posts.service'
```

---

### 5. 错误处理

**Service 层抛出错误，Controller 不捕获**：

```typescript
// ✅ Service 层
getById(id: number) {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id)
  if (!post) {
    errors.notFound('文章不存在')  // 直接抛出
  }
  return post
}

// ✅ Controller 层
export default defineEventHandler(async (event) => {
  const { id } = await validateParams(event, postParamsSchema)
  const post = postsService.getById(id)  // 错误会自动向上传递
  return successResponse(post)
})
```

---

### 6. 文件命名规范

```
server/api/
├── posts/
│   ├── index.get.ts          # GET /api/posts
│   ├── index.post.ts         # POST /api/posts
│   ├── [id].get.ts           # GET /api/posts/:id
│   ├── [id].put.ts           # PUT /api/posts/:id
│   ├── [id].delete.ts        # DELETE /api/posts/:id
│   ├── [id]/publish.post.ts  # POST /api/posts/:id/publish
│   └── paginated.get.ts      # GET /api/posts/paginated
```

**规则**:
- 使用 `index.get.ts` 表示根路由
- 使用 `[param].method.ts` 表示动态路由
- 使用 `sub/method.ts` 表示子路由

---

### 7. 类型导入

**从 Schema 导入验证类型，从 Service 导入数据类型**：

```typescript
// ✅ 推荐
import { createPostSchema } from '@server/schemas/post.schema'
import type { Post } from '@server/services/posts.service'

// ❌ 不推荐 - 重复定义类型
interface Post { /* ... */ }
```

---

### 8. 注释规范

**每个 Controller 必须包含注释**：

```typescript
/**
 * 创建文章
 *
 * Body 参数：
 * - title: 必填，1-200 字符
 * - content: 必填
 * - status: 可选，默认 draft
 * - tagIds: 可选，标签 ID 数组（最多 3 个）
 */
export default defineEventHandler(async (event) => {
  // ...
})
```

---

### 9. 事务处理

**涉及多表操作时使用事务**：

```typescript
// ✅ Service 层处理事务
linkPostToTags(postId: number, tagIds: number[]) {
  const transaction = db.transaction((ids) => {
    // 删除旧关联
    db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(postId)
    // 插入新关联
    db.prepare('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)').run(postId, tagId)
    // 更新统计
    this.updateCount(tagId, 1)
  })
  return transaction(tagIds)
}

// ✅ Controller 调用
tagsService.linkPostToTags(postId, tagIds)
```

---

### 10. 认证授权

**需要认证的路由添加中间件**：

```typescript
export default defineEventHandler(async (event) => {
  // 检查认证状态
  const session = await getUserSession(event)
  if (!session) {
    return errors.unauthorized('请先登录')
  }

  // 继续处理...
})
```

---

## 📄 文档同步更新准则

**⚠️ 重要**: Controller 层的任何变更必须同步更新本文档

**必须更新文档的情况**:
- ✅ **新增路由**: 在对应模块的"API 路由清单"中添加
- ✅ **删除路由**: 从"API 路由清单"中移除
- ✅ **修改路由功能**: 更新功能说明
- ✅ **新增模块**: 添加新的模块章节

**更新检查清单**:
- [ ] API 路由清单
- [ ] 关联 Schema
- [ ] 关联 Service

---

**(注：不需要在文档中维护版本历史，Git Commit 会记录所有变更轨迹。保持本文档始终为最新状态的快照即可。)**

---

## 🔍 相关文档

- **Schema 层**: [`../schemas/CLAUDE.md`](../schemas/CLAUDE.md) - 参数验证定义
- **Service 层**: [`../services/CLAUDE.md`](../services/CLAUDE.md) - 业务逻辑实现
- **验证工具**: [`../utils/validation.ts`](../utils/validation.ts) - 验证函数
- **响应工具**: [`../utils/response.ts`](../utils/response.ts) - 响应格式
- **后端规范**: [`../CLAUDE.md`](../CLAUDE.md) - 后端完整文档
