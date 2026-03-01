---
title: "Service 层文档"
description: "后端 Service 层依赖关系、数据库操作和业务逻辑"
lastUpdated: 2025-03-01
version: "1.0.0"
services:
  total: 5
  core: 2
  feature: 3
table_of_contents:
  - Service 依赖关系矩阵
  - 核心业务 Services (posts, tags)
  - 功能 Services (search, messages, users)
  - Service 间依赖关系
  - 使用规范
---

# Server Services 文档

> 本文档记录 `server/services/` 目录下所有 Service 层的依赖关系、数据库操作和业务逻辑说明。

---

## 📑 目录

- [Service 依赖关系矩阵](#service-依赖关系矩阵)
- [核心业务 Services](#核心业务-services)
- [功能 Services](#功能-services)
- [Service 间依赖关系](#service-间依赖关系)
- [使用规范](#使用规范)

---

## 🔗 Service 依赖关系矩阵

| Service | 操作表 | 被引用次数 | Service 依赖 | 类型 |
|---------|--------|-----------|-------------|------|
| **posts.service.ts** | posts | 9 | tags.service | 核心 |
| **tags.service.ts** | tags, post_tags | 9 | - | 核心 |
| **search.service.ts** | posts, tags, post_tags | 1 | - | 功能 |
| **messages.service.ts** | messages, users | 2 | - | 功能 |
| **users.service.ts** | users | 2 | - | 功能 |

### 引用关系图

```
server/api/
├── posts/
│   ├── index.get.ts ──────────────> postsService
│   ├── index.post.ts ─────────────> postsService + tagsService
│   ├── [id].get.ts ───────────────> postsService
│   ├── [id].put.ts ───────────────> postsService + tagsService
│   ├── [id].delete.ts ────────────> postsService + tagsService
│   ├── batch-delete.post.ts ──────> postsService
│   ├── [id]/publish.post.ts ──────> postsService
│   └── paginated.get.ts ──────────> postsService
│
├── tags/
│   ├── index.get.ts ──────────────> tagsService
│   ├── index.post.ts ─────────────> tagsService
│   ├── [id].put.ts ───────────────> tagsService
│   ├── [id].delete.ts ────────────> tagsService
│   ├── search.get.ts ─────────────> tagsService
│   └── popular.get.ts ─────────────> tagsService
│
├── search/
│   └── posts.get.ts ──────────────> searchService
│
├── messages/
│   ├── index.get.ts ──────────────> messagesService
│   └── index.post.ts ─────────────> messagesService + usersService
│
└── auth/
    └── [...].ts ──────────────────> usersService
```

---

## 🎯 核心业务 Services

### posts.service.ts - 文章服务

**文件路径**: [`posts.service.ts`](posts.service.ts)

**操作表**: `posts`

**功能说明**: 文章的 CRUD 操作、发布管理、批量删除

**Service 依赖**:
- `tags.service` - 动态导入，用于获取文章标签信息

**被引用位置** (9个):
- `server/api/posts/index.get.ts` - 获取文章列表
- `server/api/posts/index.post.ts` - 创建文章
- `server/api/posts/[id].get.ts` - 获取文章详情
- `server/api/posts/[id].put.ts` - 更新文章
- `server/api/posts/[id].delete.ts` - 删除文章
- `server/api/posts/batch-delete.post.ts` - 批量删除
- `server/api/posts/[id]/publish.post.ts` - 发布/撤回
- `server/api/posts/paginated.get.ts` - 分页查询

**类型定义**:
```typescript
interface Post {
  id?: number
  title: string
  content: string
  summary?: string
  status?: 'draft' | 'published'
  category?: string
  tags?: string              // 兼容旧字段，返回标签名称数组
  cover_image?: string
  view_count?: number
  created_at?: string
  updated_at?: string
  published_at?: string
}
```

**核心方法**:

| 方法 | 数据库操作 | 说明 |
|------|-----------|------|
| `create(post)` | INSERT | 创建文章 |
| `getList(options)` | SELECT | 获取文章列表（支持 status、category 过滤） |
| `getPaginated(options)` | SELECT | 分页查询（带标签） |
| `getById(id, options)` | SELECT | 获取单篇文章（默认带标签） |
| `update(id, post)` | UPDATE | 更新文章 |
| `delete(id)` | DELETE | 删除文章 |
| `batchDelete(ids)` | DELETE | 批量删除（使用 IN 子句） |
| `publish(id)` | UPDATE | 发布文章（status = 'published'） |
| `unpublish(id)` | UPDATE | 撤回文章（status = 'draft'） |
| `getCount(options)` | SELECT | 获取总数（用于分页） |

**Service 依赖说明**:
```typescript
// 动态导入 tags.service，避免循环依赖
const { tagsService } = await import('./tags.service')

// 在 getList、getPaginated、getById 中自动附加标签
if (options?.withTags !== false) {
  const tags = tagsService.getTagsByPostId(post.id)
  post.tags = tags.map(tag => tag.name)
}
```

**数据库操作详情**:
- **主表**: `posts`
- **关联查询**: 通过 `tags.service` 间接关联 `post_tags` 和 `tags`
- **排序**: 默认按 `created_at DESC`
- **过滤**: 支持 `status`（草稿/发布）、`category`（分类）

---

### tags.service.ts - 标签服务

**文件路径**: [`tags.service.ts`](tags.service.ts)

**操作表**: `tags`, `post_tags`

**功能说明**: 标签的 CRUD 操作、文章标签关联、统计更新

**Service 依赖**: 无

**被引用位置** (9个):
- `server/api/tags/index.get.ts` - 获取标签列表
- `server/api/tags/index.post.ts` - 创建标签
- `server/api/tags/[id].put.ts` - 更新标签
- `server/api/tags/[id].delete.ts` - 删除标签
- `server/api/tags/search.get.ts` - 搜索标签
- `server/api/tags/popular.get.ts` - 热门标签
- `server/api/posts/index.post.ts` - 创建文章时关联标签
- `server/api/posts/[id].put.ts` - 更新文章时关联标签
- `server/api/posts/[id].delete.ts` - 删除文章时清理关联

**类型定义**:
```typescript
interface Tag {
  id?: number
  name: string
  slug: string
  desc?: string
  count?: number           // 文章数量统计
  created_at?: string
  updated_at?: string
}

interface TagWithPostIds extends Tag {
  postIds?: number[]
}
```

**核心方法**:

| 方法 | 操作表 | 说明 |
|------|--------|------|
| `getList(options)` | SELECT tags | 分页查询（支持排序：count/name/created_at） |
| `getById(id)` | SELECT tags | 根据 ID 获取标签 |
| `getBySlug(slug)` | SELECT tags | 根据 slug 获取标签 |
| `create(data)` | INSERT tags | 创建标签（检查名称重复） |
| `update(id, data)` | UPDATE tags | 更新标签（检查名称冲突） |
| `delete(id)` | DELETE tags | 删除标签（级联删除 post_tags） |
| `searchByName(keyword, limit)` | SELECT tags | 模糊搜索（精确匹配优先） |
| `updateCount(tagId, delta)` | UPDATE tags | 更新统计数量（+1/-1） |
| `linkPostToTags(postId, tagIds)` | INSERT/DELETE post_tags, UPDATE tags | 建立文章标签关联 |
| `unlinkPostFromTags(postId)` | DELETE post_tags, UPDATE tags | 移除文章标签关联 |
| `getTagsByPostId(postId)` | SELECT tags + post_tags | 获取文章的所有标签 |
| `getPostIdsByTagId(tagId, options)` | SELECT posts + post_tags | 获取标签关联的文章 ID |
| `getPopularTags(limit)` | SELECT tags | 获取热门标签（按 count 排序） |

**数据库操作详情**:

**主表**: `tags`
```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  desc TEXT,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**关联表**: `post_tags`
```sql
CREATE TABLE post_tags (
  post_id INTEGER,
  tag_id INTEGER,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
)
```

**事务处理**:
- `linkPostToTags`: 使用事务确保关联更新和统计同步
- `updateCount`: 使用事务确保 count >= 0

**级联删除**:
- 删除标签时，自动删除 `post_tags` 中的关联记录（数据库级联）

---

## 🔧 功能 Services

### search.service.ts - 搜索服务

**文件路径**: [`search.service.ts`](search.service.ts)

**操作表**: `posts`, `tags`, `post_tags`（LEFT JOIN）

**功能说明**: 文章全文搜索（标题+标签）

**Service 依赖**: 无

**被引用位置** (1个):
- `server/api/search/posts.get.ts` - 搜索文章

**类型定义**:
```typescript
interface SearchPostsOptions {
  q: string                // 搜索关键词
  page?: number
  pageSize?: number
}

interface PostSearchResult {
  id: number
  title: string
  tagIds: number[]         // 关联的标签 ID 数组
  tagNames: string[]       // 关联的标签名称数组
}
```

**核心方法**:

| 方法 | 说明 | SQL 特性 |
|------|------|---------|
| `searchPosts(options)` | 搜索文章（标题或标签匹配） | GROUP_CONCAT, DISTINCT |
| `searchTags(keyword, limit)` | 搜索标签（名称匹配） | 精确匹配优先排序 |

**数据库操作详情**:
```sql
-- 搜索文章（标题模糊匹配 OR 标签精确匹配）
SELECT DISTINCT
  p.id, p.title,
  GROUP_CONCAT(t.id) as tag_ids,
  GROUP_CONCAT(t.name) as tag_names
FROM posts p
LEFT JOIN post_tags pt ON p.id = pt.post_id
LEFT JOIN tags t ON pt.tag_id = t.id
WHERE p.status = 'published'
  AND (p.title LIKE ? OR t.name = ?)
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT ? OFFSET ?
```

**搜索逻辑**:
- 标题模糊匹配：`LIKE '%keyword%'`
- 标签精确匹配：`= 'keyword'`
- 只搜索已发布文章：`status = 'published'`
- 使用 `GROUP_CONCAT` 合并标签 ID 和名称

---

### messages.service.ts - 留言服务

**文件路径**: [`messages.service.ts`](messages.service.ts)

**操作表**: `messages`, `users`（LEFT JOIN）

**功能说明**: 留言板的创建和查询（支持登录用户和访客）

**Service 依赖**: 无

**被引用位置** (2个):
- `server/api/messages/index.get.ts` - 获取留言列表
- `server/api/messages/index.post.ts` - 创建留言

**类型定义**:
```typescript
interface Message {
  id?: number
  user_id?: number        // 登录用户 ID
  visitor_id?: string     // 访客 ID
  content: string
  image_url?: string
  created_at?: string
}

interface MessageWithUser extends Message {
  username?: string       // 用户名（JOIN 查询）
  user_avatar?: string    // 用户头像（JOIN 查询）
  is_guest?: boolean      // 0 = 登录用户, 1 = 访客
}
```

**核心方法**:

| 方法 | 说明 | JOIN |
|------|------|------|
| `create(message)` | 创建留言 | - |
| `getPaginated(options)` | 分页获取留言（带用户信息） | LEFT JOIN users |
| `getCount()` | 获取留言总数 | - |

**数据库操作详情**:
```sql
-- 创建留言
INSERT INTO messages (user_id, visitor_id, content, image_url)
VALUES (?, ?, ?, ?)

-- 分页查询（包含用户信息）
SELECT
  m.id, m.user_id, m.visitor_id, m.content, m.image_url, m.created_at,
  u.username,
  u.avatar_url as user_avatar,
  CASE WHEN m.user_id IS NOT NULL THEN 0 ELSE 1 END as is_guest
FROM messages m
LEFT JOIN users u ON m.user_id = u.id
ORDER BY m.created_at DESC
LIMIT ? OFFSET ?
```

**特性**:
- 支持 `user_id`（登录用户）或 `visitor_id`（访客）
- 自动关联用户信息（用户名、头像）
- `is_guest` 字段区分用户类型

---

### users.service.ts - 用户服务

**文件路径**: [`users.service.ts`](users.service.ts)

**操作表**: `users`

**功能说明**: OAuth 用户管理（GitHub、Google）

**Service 依赖**: 无

**被引用位置** (2个):
- `server/api/auth/[...].ts` - OAuth 认证回调
- `server/api/messages/index.post.ts` - 创建留言时获取用户 ID

**类型定义**:
```typescript
interface User {
  id?: number
  github_id?: string      // GitHub OAuth ID
  google_id?: string      // Google OAuth ID
  email?: string
  username?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

interface OAuthUserInfo {
  provider: 'github' | 'google'
  providerAccountId: string
  email?: string | null
  username?: string | null
  avatarUrl?: string | null
}
```

**核心方法**:

| 方法 | 说明 | OAuth 提供商 |
|------|------|-------------|
| `findByGithubId(githubId)` | 根据 GitHub ID 查找用户 | GitHub |
| `findByGoogleId(googleId)` | 根据 Google ID 查找用户 | Google |
| `findById(userId)` | 根据 ID 查找用户 | - |
| `upsertOAuthUser(userInfo)` | 创建或更新 OAuth 用户 | GitHub + Google |
| `findUserIdByProvider(provider, providerAccountId)` | 根据 OAuth 提供商查找用户 ID | GitHub + Google |

**数据库操作详情**:
```sql
-- GitHub 用户查找
SELECT * FROM users WHERE github_id = ?

-- Google 用户查找
SELECT * FROM users WHERE google_id = ?

-- 创建 GitHub 用户
INSERT INTO users (github_id, email, username, avatar_url)
VALUES (?, ?, ?, ?)

-- 创建 Google 用户
INSERT INTO users (google_id, email, username, avatar_url)
VALUES (?, ?, ?, ?)

-- 更新用户信息
UPDATE users
SET email = ?, username = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
WHERE github_id = ? -- 或 google_id
```

**Upsert 逻辑**:
1. 根据 `providerAccountId` 查找用户
2. 如果存在：更新 `email`, `username`, `avatar_url`, `updated_at`
3. 如果不存在：创建新用户
4. 返回完整的用户信息

---

## 🔗 Service 间依赖关系

### 依赖图

```
posts.service.ts
  └── (动态导入) --> tags.service.ts
                          ↑
                          │
                  (间接调用)
                          │
                    posts.service.ts
```

### 依赖说明

**posts.service.ts → tags.service.ts**:
- **依赖类型**: 动态导入（`await import()`）
- **调用方法**:
  - `tagsService.getTagsByPostId(postId)` - 获取文章标签
- **调用位置**:
  - `getList(options)` - 列表查询
  - `getPaginated(options)` - 分页查询
  - `getById(id, options)` - 详情查询
- **避免循环依赖**: 使用动态导入而非静态 import

**无其他 Service 依赖**:
- `search.service.ts` - 独立实现搜索逻辑
- `messages.service.ts` - 直接 SQL JOIN，无需调用 users.service
- `users.service.ts` - 独立的用户管理
- `tags.service.ts` - 独立的标签管理

---

## 📋 使用规范

### 1. Service 层职责

**✅ 应该做**:
- 数据库 CRUD 操作
- 业务逻辑处理
- 数据验证和转换
- 事务管理

**❌ 不应该做**:
- HTTP 请求/响应处理（由 Controller 层负责）
- 参数验证（由 Controller 层的 Zod schema 负责）
- 直接返回 HTTP 响应

### 2. 命名约定

```typescript
// ✅ 推荐 - Service 对象导出
export const postsService = {
  create(post) { /* ... */ },
  getList(options) { /* ... */ },
  getById(id) { /* ... */ }
}

// ❌ 不推荐 - 单独导出方法
export function createPost(post) { /* ... */ }
export function getPostList(options) { /* ... */ }
```

### 3. 错误处理

```typescript
// ✅ 推荐 - 使用统一错误工具
import { errors } from '@server/utils/response'

getById(id: number) {
  const stmt = db.prepare('SELECT * FROM posts WHERE id = ?')
  const post = stmt.get(id)
  if (!post) {
    errors.notFound('文章不存在')  // 抛出 404 错误
  }
  return post
}

// ❌ 不推荐 - 直接抛出 Error
if (!post) {
  throw new Error('文章不存在')
}
```

### 4. SQL 安全

```typescript
// ✅ 推荐 - 使用参数化查询
const stmt = db.prepare('SELECT * FROM posts WHERE id = ?')
stmt.get(id)

// ✅ 推荐 - 验证排序字段
const validSortFields = ['count', 'name', 'created_at']
const sortField = validSortFields.includes(sort) ? sort : 'count'

// ❌ 不推荐 - 字符串拼接（SQL 注入风险）
const sql = `SELECT * FROM posts ORDER BY ${sort} DESC`
```

### 5. 事务处理

```typescript
// ✅ 推荐 - 使用事务
const transaction = db.transaction(() => {
  // 多个数据库操作
  db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(postId)
  db.prepare('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)').run(postId, tagId)
})

return transaction()

// ✅ 推荐 - Service 方法中的事务
linkPostToTags(postId: number, tagIds: number[]) {
  const transaction = db.transaction((ids: number[]) => {
    // 删除旧关联
    db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(postId)
    // 插入新关联
    // 更新统计
  })
  return transaction(tagIds)
}
```

### 6. Service 间调用

```typescript
// ✅ 推荐 - 动态导入（避免循环依赖）
const { tagsService } = await import('./tags.service')
const tags = tagsService.getTagsByPostId(postId)

// ❌ 不推荐 - 静态导入（可能导致循环依赖）
import { tagsService } from './tags.service'
```

### 7. 类型导出

```typescript
// ✅ 推荐 - 导出数据模型类型
export interface Post {
  id?: number
  title: string
  content: string
  // ...
}

// ✅ 推荐 - Controller 可以使用这些类型
import type { Post } from '@server/services/posts.service'
```

### 8. 📄 文档同步更新准则

**⚠️ 重要**: Service 层的任何变更必须同步更新本文档

**必须更新文档的情况**:
- ✅ **新增 Service 文件**: 在文档中添加新的 Service 章节
- ✅ **新增方法**: 更新对应 Service 的"核心方法"表格
- ✅ **修改方法签名**: 更新类型定义和参数说明
- ✅ **删除方法**: 从"核心方法"表格中移除
- ✅ **新增数据库表**: 更新"操作表"说明
- ✅ **Service 间依赖变更**: 更新依赖关系图
- ✅ **引用位置变更**: 更新"被引用位置"列表

**更新检查清单**:
- [ ] 依赖关系矩阵
- [ ] 引用关系图
- [ ] Service 详细说明章节
- [ ] 核心方法表格
- [ ] 状态统计

---
**(注：不需要在文档中维护版本历史，Git Commit 会记录所有变更轨迹。保持本文档始终为最新状态的快照即可。)**

## 📊 Service 状态统计

| 状态 | 数量 | Service 列表 |
|------|------|-------------|
| ✅ 高频使用 | 2 | posts.service, tags.service |
| ✅ 中频使用 | 1 | messages.service |
| ✅ 低频使用 | 2 | search.service, users.service |



## 🔍 相关文档

- **Controller 层**: [`../api/CLAUDE.md`](../api/CLAUDE.md) - API 路由文档
- **数据库**: [`../utils/db.ts`](../utils/db.ts) - 数据库连接配置
- **后端规范**: [`../CLAUDE.md`](../CLAUDE.md) - 后端完整文档
- **项目规范**: [`../../CLAUDE.md`](../../CLAUDE.md) - 项目级规范

