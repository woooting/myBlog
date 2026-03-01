---
title: "API 接口文档"
description: "前端 API 封装层使用情况、接口说明和类型定义"
lastUpdated: 2025-03-01
version: "1.0.0"
apis:
  total: 5
  core: 1
  feature: 4
table_of_contents:
  - API 依赖关系矩阵
  - 核心 API (useRequest)
  - 文章 API (posts.api.ts)
  - 标签 API (tags.api.ts)
  - 搜索 API (search.api.ts)
  - 留言 API (messages.api.ts)
  - 上传 API (upload.api.ts)
  - 使用规范
---

# App API 文档

> 本文档记录 `app/api/` 目录下所有前端 API 封装层的使用情况、接口说明和类型定义。

---

## 📑 目录

- [API 依赖关系矩阵](#api-依赖关系矩阵)
- [核心 API](#核心-api)
- [业务 API](#业务-api)
- [使用规范](#使用规范)
- [API 状态统计](#api-状态统计)

---

## 🔗 API 依赖关系矩阵

| API 模块 | 文件 | 方法数 | 被引用位置 | 类型 |
|---------|------|--------|-----------|------|
| **posts.api.ts** | 文章 API | 15 | 3 个页面 | 业务 |
| **tags.api.ts** | 标签 API | 7 | 2 个组件 + 1 个 composable | 业务 |
| **search.api.ts** | 搜索 API | 1 | 2 个页面 | 业务 |
| **messages.api.ts** | 留言 API | 2 | 1 个页面 | 业务 |
| **upload.api.ts** | 上传 API | 1 | 未使用 | 业务 |

### 引用关系图

```
app/pages/
├── admin/system/
│   ├── articles.vue ──> posts.api.ts
│   ├── tags.vue ──────> tags.api.ts
│   └── editor.vue ─────> posts.api.ts
├── message/index.vue ──> messages.api.ts
├── search/index.vue ───> search.api.ts
├── index.vue ──────────> search.api.ts
└── category/detail.vue > posts.api.ts

app/components/
├── TagSelector.client.vue ──> tags.api.ts
└── AppFloatingBar.vue ──────> search.api.ts

app/composables/
└── useTags.ts ───────────────> tags.api.ts
```

---

## 🎯 核心 API

### useRequest (useApi.ts)

**文件路径**: [`../composables/useApi.ts`](../composables/useApi.ts)

**功能说明**:
- 统一的 HTTP 请求封装
- 自动处理 Toast 提示、错误处理、超时控制
- 所有业务 API 的基础依赖

**详细文档**: [`../composables/CLAUDE.md#userequest`](../composables/CLAUDE.md#userequest)

---

## 🛠️ 业务 API

### posts.api.ts - 文章 API

**文件路径**: [`posts.api.ts`](posts.api.ts)

**功能说明**: 文章的 CRUD 操作、发布管理、批量删除

**类型定义**:
```typescript
// 文章数据模型
interface Post {
  id: number
  title: string
  content: string
  summary?: string
  status: 'draft' | 'published'
  category?: string
  tags?: string[]
  cover_image?: string
  view_count?: number
  created_at: string
  updated_at: string
  published_at?: string
}

// 创建文章 DTO
interface CreatePostDto {
  title: string
  content: string
  summary?: string
  status?: 'draft' | 'published'
  category?: string
  tags?: string[]
  cover_image?: string
}

// 分页响应
interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
```

**API 方法**:

| 方法 | 说明 | Toast | 使用场景 |
|------|------|-------|---------|
| `getList(params?)` | 获取文章列表 | ❌ | 列表页加载 |
| `getListWithToast(params?)` | 获取文章列表 | ✅ | 手动刷新列表 |
| `getPaginatedList(params?)` | 分页获取文章 | ❌ | 分页列表 |
| `getById(id)` | 获取单篇文章 | ❌ | 文章详情页 |
| `create(data)` | 创建文章 | ✅ | 保存草稿/发布 |
| `createSilent(data)` | 创建文章（静默） | ❌ | 自动保存 |
| `update(id, data)` | 更新文章 | ✅ | 编辑保存 |
| `deletePost(id)` | 删除文章 | ✅ | 删除单篇 |
| `batchDeletePosts(ids)` | 批量删除 | ✅ | 批量操作 |
| `publish(id)` | 发布文章 | ✅ | 发布操作 |
| `unpublish(id)` | 撤回文章 | ✅ | 撤回操作 |

**使用示例**:
```typescript
import * as postsApi from '@app/api/posts.api'

// 获取文章列表
const posts = await postsApi.getList({ status: 'published' })

// 分页获取
const result = await postsApi.getPaginatedList({
  page: 1,
  pageSize: 20,
  category: 'tech'
})

// 创建文章
const newPost = await postsApi.create({
  title: '新文章',
  content: '文章内容',
  status: 'draft'
})

// 批量删除
await postsApi.batchDeletePosts([1, 2, 3])
```

**使用位置**:
- `pages/admin/system/articles.vue` - 文章管理页
- `pages/admin/system/editor.vue` - 文章编辑器
- `pages/category/detail.vue` - 文章详情页

---

### tags.api.ts - 标签 API

**文件路径**: [`tags.api.ts`](tags.api.ts)

**功能说明**: 标签的 CRUD 操作、搜索、热门标签

**类型定义**:
```typescript
// 标签数据模型
interface Tag {
  id: number
  name: string
  slug: string
  desc?: string
  count: number          // 文章数量
  created_at: string
  updated_at: string
}

// 创建标签 DTO
interface CreateTagDto {
  name: string
  desc?: string
}

// 更新标签 DTO
interface UpdateTagDto {
  name?: string
  desc?: string
}

// 列表查询参数
interface TagListParams {
  page?: number
  pageSize?: number
  sort?: 'count' | 'name' | 'created_at'
  order?: 'asc' | 'desc'
}
```

**API 方法**:

| 方法 | 说明 | Toast | 使用场景 |
|------|------|-------|---------|
| `getList(params?)` | 获取标签列表（分页） | ❌ | 标签管理页 |
| `getById(id)` | 根据 ID 获取标签 | ❌ | 标签详情 |
| `create(data)` | 创建标签 | ✅ | 创建新标签 |
| `update(id, data)` | 更新标签 | ✅ | 编辑标签 |
| `remove(id)` | 删除标签 | ✅ | 删除标签 |
| `search(keyword, limit)` | 搜索标签 | ❌ | 标签搜索建议 |
| `getPopular(limit)` | 获取热门标签 | ❌ | 热门标签云 |

**使用示例**:
```typescript
import * as tagsApi from '@app/api/tags.api'

// 获取热门标签
const popularTags = await tagsApi.getPopular(10)

// 搜索标签
const results = await tagsApi.search('vue', 10)

// 创建标签
const result = await tagsApi.create({ name: 'Vue.js' })

// 更新标签
await tagsApi.update(1, { desc: 'Vue.js 相关文章' })

// 删除标签
await tagsApi.remove(1)
```

**使用位置**:
- `components/TagSelector.client.vue` - 标签选择器
- `pages/admin/system/tags.vue` - 标签管理页
- `composables/useTags.ts` - 标签管理 composable

---

### search.api.ts - 搜索 API

**文件路径**: [`search.api.ts`](search.api.ts)

**功能说明**: 文章全文搜索

**类型定义**:
```typescript
// 搜索结果项
interface SearchPostItem {
  id: number
  title: string
  summary?: string
  cover_image?: string
  status: string
  tagIds: number[]
  tagNames: string[]      // 返回标签名称，方便显示
}

// 搜索响应
interface SearchResponse {
  data: SearchPostItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
```

**API 方法**:

| 方法 | 说明 | 参数 |
|------|------|------|
| `searchPosts(params)` | 搜索文章 | `q`: 关键词（必填）<br>`page`: 页码（默认1）<br>`pageSize`: 每页数量（默认10） |

**使用示例**:
```typescript
import { searchPosts } from '@app/api/search.api'

// 搜索文章
const results = await searchPosts({
  q: 'Vue',
  page: 1,
  pageSize: 20
})

console.log(results.data)        // 搜索结果数组
console.log(results.pagination)  // 分页信息
```

**使用位置**:
- `components/AppFloatingBar.vue` - 顶部搜索框
- `pages/search/index.vue` - 搜索结果页

**特性**:
- 支持分页
- 返回标签名称（无需二次查询）
- 包含文章封面、摘要等信息

---

### messages.api.ts - 留言 API

**文件路径**: [`messages.api.ts`](messages.api.ts)

**功能说明**: 留言板的创建和查询

**类型定义**:
```typescript
// 留言数据模型
interface Message {
  id: number
  user_id?: number          // 登录用户 ID
  visitor_id?: string       // 访客 ID
  content: string
  image_url?: string        // 图片 URL
  created_at: string
  // 用户信息（JOIN 查询）
  username?: string
  user_avatar?: string
  is_guest?: boolean        // 0 = 登录用户, 1 = 访客
}

// 分页留言列表
interface PaginatedMessages {
  data: Message[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
```

**API 方法**:

| 方法 | 说明 | Toast | 参数 |
|------|------|-------|------|
| `create(data)` | 创建留言 | ✅ | `content`: 内容（必填）<br>`image_url`: 图片 URL |
| `getList(params)` | 获取留言列表（分页） | ❌ | `page`: 页码（必填）<br>`pageSize`: 每页数量（可选） |

**使用示例**:
```typescript
import { messagesApi } from '@app/api/messages.api'

// 创建留言
await messagesApi.create({
  content: '这是一条留言',
  image_url: 'https://example.com/image.jpg'
})

// 获取留言列表
const result = await messagesApi.getList({
  page: 1,
  pageSize: 20
})

console.log(result.data)  // 留言数组
```

**使用位置**:
- `pages/message/index.vue` - 留言板页面

**特性**:
- 支持登录用户和访客留言
- 支持上传图片
- 自动关联用户信息（用户名、头像）
- 分页查询

---

### upload.api.ts - 上传 API

**文件路径**: [`upload.api.ts`](upload.api.ts)

**功能说明**: 文件上传（目前仅支持图片）

**类型定义**:
```typescript
interface UploadResponse {
  url: string  // 上传后的文件 URL
}
```

**API 方法**:

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `uploadImage(file)` | 上传图片 | `Promise<UploadResponse>` |

**使用示例**:
```typescript
import { uploadApi } from '@app/api/upload.api'

// 上传图片
const file = document.querySelector('input[type="file"]').files[0]
const result = await uploadApi.uploadImage(file)
console.log(result.url)  // 图片 URL
```

**使用位置**:
- 未使用（可能已被编辑器内联 Base64 替代）

**特性**:
- 使用 FormData 上传
- 自动错误处理
- 返回可访问的图片 URL

**TODO**:
- 考虑在文章编辑器中集成此 API，替代 Base64 内联图片

---

## 📋 使用规范

### 1. API 命名约定

**文件命名**:
- 使用复数形式：`posts.api.ts`（而非 `post.api.ts`）
- 小写 + 连字符：`search.api.ts`、`messages.api.ts`

**导出方式**:
```typescript
// ✅ 推荐 - 命名导出（按需导入）
export const getList = (params?) => { /* ... */ }
export const create = (data) => { /* ... */ }

// ✅ 可选 - 对象导出（多个相关方法）
export const messagesApi = {
  async create(data) { /* ... */ },
  async getList(params) { /* ... */ }
}
```

### 2. 类型定义规范

**数据模型**:
```typescript
// ✅ 推荐 - 完整的数据模型
export interface Post {
  id: number
  title: string
  content: string
  status: 'draft' | 'published'
  // ...
}

// DTO (Data Transfer Object)
export interface CreatePostDto {
  title: string
  content: string
}
```

**分页响应**:
```typescript
// ✅ 推荐 - 泛型分页响应
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
```

### 3. API 方法规范

**Toast 提示**:
```typescript
// ✅ 推荐 - 提供带/不带 Toast 的版本
export const create = (data) => {
  return useRequest().request<Post>('/api/posts', {
    method: 'POST',
    body: data,
    showToast: true,  // 带成功提示
  })
}

export const createSilent = (data) => {
  return useRequest().request<Post>('/api/posts', {
    method: 'POST',
    body: data,
    // showToast: false  // 不带提示
  })
}
```

**错误处理**:
- API 层不捕获错误，让调用者处理
- `useRequest` 会自动显示错误 Toast

### 4. 导入方式

```typescript
// ✅ 推荐 - 命名导入
import * as postsApi from '@app/api/posts.api'
import { searchPosts } from '@app/api/search.api'
import { messagesApi } from '@app/api/messages.api'

// ❌ 不推荐 - 默认导入（除非使用对象导出）
import postsApi from '@app/api/posts.api'
```

### 5. 文档注释

为每个方法添加 JSDoc 注释：

```typescript
/**
 * 创建文章(带成功提示)
 * @param data 文章数据
 * @returns 创建的文章对象
 */
export const create = (data: CreatePostDto) => {
  return useRequest().request<Post>('/api/posts', {
    method: 'POST',
    body: data,
    showToast: true,
  })
}
```

### 6. 📄 文档同步更新准则

**⚠️ 重要**: API 的任何变更必须同步更新本文档

**必须更新文档的情况**:
- ✅ **新增 API 模块**: 在文档中添加新的 API 章节
- ✅ **新增方法**: 更新对应 API 的方法列表
- ✅ **修改方法签名**: 更新类型定义和参数说明
- ✅ **删除方法**: 从方法表格中移除
- ✅ **修改返回类型**: 更新类型定义
- ✅ **Toast 配置变更**: 更新方法列表中的 Toast 列

**更新检查清单**:
- [ ] API 依赖关系矩阵
- [ ] API 详细说明章节
- [ ] 类型定义
- [ ] 方法列表（含 Toast 标记）
- [ ] 使用示例
- [ ] 状态统计

---

**(注：不需要在文档中维护版本历史，Git Commit 会记录所有变更轨迹。保持本文档始终为最新状态的快照即可。)**

## 🔍 相关文档

- **Composables**: [`../composables/CLAUDE.md`](../composables/CLAUDE.md) - useRequest 详细说明
- **组件**: [`../components/CLAUDE.md`](../components/CLAUDE.md) - 组件使用文档
- **后端 API**: [`../../server/CLAUDE.md`](../../server/CLAUDE.md) - 后端接口文档
- **项目规范**: [`../../CLAUDE.md`](../../CLAUDE.md) - 项目级规范
