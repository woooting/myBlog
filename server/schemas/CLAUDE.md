---
title: "Schema 层文档"
description: "后端 Zod 验证 Schema 定义和使用说明"
lastUpdated: 2025-03-01
version: "1.0.0"
schemas:
  total: 3
table_of_contents:
  - Schema 依赖关系矩阵
  - 文章 Schemas (post.schema.ts)
  - 标签 Schemas (tag.schema.ts)
  - 留言 Schemas (message.schema.ts)
  - 使用规范
---

# Server Schemas 文档

> 本文档记录 `server/schemas/` 目录下所有 Zod 验证 Schema 的定义和使用说明。

---

## 📑 目录

- [Schema 依赖关系矩阵](#schema-依赖关系矩阵)
- [文章 Schemas](#文章-schemas-postschemats)
- [标签 Schemas](#标签-schemas-tagschemats)
- [留言 Schemas](#留言-schemas-messageschemats)
- [使用规范](#使用规范)

---

## 🔗 Schema 依赖关系矩阵

| Schema 文件 | Schema 数量 | 被 API 引用 | 主要用途 |
|------------|-----------|-----------|---------|
| **post.schema.ts** | 9 | 8 个文件 | 文章相关验证 |
| **tag.schema.ts** | 8 | 7 个文件 | 标签相关验证 |
| **message.schema.ts** | 2 | 2 个文件 | 留言相关验证 |

### 引用关系图

```
server/api/
├── posts/
│   ├── index.get.ts ─────────────> getListQuerySchema
│   ├── index.post.ts ────────────> createPostSchema
│   ├── paginated.get.ts ─────────> paginationQuerySchema
│   ├── [id].get.ts ──────────────> postParamsSchema
│   ├── [id].put.ts ──────────────> updatePostSchema + postParamsSchema
│   ├── [id].delete.ts ───────────> postParamsSchema
│   ├── batch-delete.post.ts ─────> batchDeleteSchema
│   └── [id]/publish.post.ts ─────> publishActionSchema + postParamsSchema
│
├── tags/
│   ├── index.get.ts ─────────────> getTagListQuerySchema
│   ├── index.post.ts ────────────> createTagSchema
│   ├── [id].put.ts ──────────────> updateTagSchema + tagParamsSchema
│   ├── [id].delete.ts ───────────> tagParamsSchema
│   └── search.get.ts ────────────> searchQuerySchema
│
├── search/
│   └── posts.get.ts ─────────────> postSearchQuerySchema
│
└── messages/
    ├── index.get.ts ─────────────> getMessagesQuerySchema
    └── index.post.ts ────────────> createMessageSchema
```

---

## 📝 文章 Schemas (post.schema.ts)

**文件路径**: [`post.schema.ts`](post.schema.ts)

**功能说明**: 文章相关的请求体验证，包括创建、更新、查询参数等

### Schema 列表

| Schema | 类型 | 用途 |
|--------|------|------|
| `createPostSchema` | Request Body | 创建文章 |
| `updatePostSchema` | Request Body | 更新文章（所有字段可选） |
| `getListQuerySchema` | Query Params | 获取文章列表（筛选参数） |
| `paginationQuerySchema` | Query Params | 分页查询 |
| `postParamsSchema` | Path Params | 文章 ID 参数 |
| `publishActionSchema` | Request Body | 发布/撤回操作 |
| `batchDeleteSchema` | Request Body | 批量删除 |

### 详细定义

#### 1. createPostSchema - 创建文章

```typescript
z.object({
  title: z.string()
    .min(1, '标题不能为空')
    .max(200, '标题不能超过 200 字符')
    .trim(),

  content: z.string()
    .min(1, '内容不能为空')
    .trim(),

  summary: z.string().trim().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  category: z.string().trim().optional(),
  tags: z.array(z.string()).optional(),
  tagIds: z.array(z.number().int().positive())
    .max(3, '最多选择 3 个标签')
    .optional(),
  cover_image: z.string().url('封面图必须是有效的 URL').optional().or(z.literal('')),
})
```

**验证规则**:
- 标题：必填，1-200 字符
- 内容：必填，自动 trim
- 摘要：可选
- 状态：默认 `draft`
- 标签 ID 数组：最多 3 个
- 封面图：必须是有效 URL 或空字符串

**导出类型**: `CreatePostInput`

---

#### 2. updatePostSchema - 更新文章

```typescript
createPostSchema.partial().extend({
  tagIds: z.array(z.number().int().positive())
    .max(3, '最多选择 3 个标签')
    .optional(),
})
```

**特点**: 继承 `createPostSchema`，所有字段变为可选

**导出类型**: `UpdatePostInput`

---

#### 3. getListQuerySchema - 列表查询

```typescript
z.object({
  status: z.enum(['draft', 'published']).optional(),
  category: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
```

**用途**: 获取文章列表时的筛选和分页

**导出类型**: `GetListQuery`

---

#### 4. paginationQuerySchema - 分页查询

```typescript
z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['draft', 'published']).optional(),
  category: z.string().trim().optional(),
})
```

**特点**: 提供默认值（page=1, pageSize=10）

**导出类型**: `PaginationQuery`

---

#### 5. postParamsSchema - 路径参数

```typescript
z.object({
  id: z.string()
    .regex(/^\d+$/, 'ID 必须是数字')
    .transform((val) => Number(val))
    .refine((val) => val > 0, 'ID 必须大于 0'),
})
```

**验证流程**:
1. 检查是否为数字字符串
2. 转换为 number 类型
3. 检查是否大于 0

**导出类型**: `PostParams`

---

#### 6. publishActionSchema - 发布操作

```typescript
z.object({
  action: z.enum(['publish', 'unpublish']),
})
```

**导出类型**: `PublishActionInput`

---

#### 7. batchDeleteSchema - 批量删除

```typescript
z.object({
  ids: z.array(z.number().int().positive()).min(1, '至少选择一篇文章'),
})
```

**导出类型**: `BatchDeleteInput`

---

## 🏷️ 标签 Schemas (tag.schema.ts)

**文件路径**: [`tag.schema.ts`](tag.schema.ts)

**功能说明**: 标签相关的请求体验证

### Schema 列表

| Schema | 类型 | 用途 |
|--------|------|------|
| `createTagSchema` | Request Body | 创建标签 |
| `updateTagSchema` | Request Body | 更新标签 |
| `updatePostTagsSchema` | Request Body | 更新文章标签关联 |
| `searchQuerySchema` | Query Params | 标签搜索 |
| `postSearchQuerySchema` | Query Params | 文章搜索（按标签） |
| `getTagListQuerySchema` | Query Params | 标签列表查询 |
| `tagParamsSchema` | Path Params | 标签 ID 参数 |

### 详细定义

#### 1. createTagSchema - 创建标签

```typescript
z.object({
  name: z.string()
    .min(1, '标签名称不能为空')
    .max(20, '标签名称不能超过 20 字符')
    .trim()
    .refine((val) => !/[\s,，]/.test(val), '标签名称不能包含空格或逗号'),
  desc: z.string().max(100).optional(),
})
```

**验证规则**:
- 名称：1-20 字符
- 禁止字符：空格、逗号（中英文）
- 描述：最多 100 字符

**导出类型**: `CreateTagInput`

---

#### 2. updateTagSchema - 更新标签

```typescript
createTagSchema.partial()
```

**特点**: 所有字段可选

**导出类型**: `UpdateTagInput`

---

#### 3. updatePostTagsSchema - 更新文章标签

```typescript
z.object({
  tagIds: z.array(z.number().int().positive())
    .min(1, '至少选择一个标签')
    .max(3, '最多选择 3 个标签')
    .refine((ids) => new Set(ids).size === ids.length, '标签不能重复'),
})
```

**验证规则**:
- 至少 1 个，最多 3 个标签
- 标签 ID 不能重复

**导出类型**: `UpdatePostTagsInput`

---

#### 4. searchQuerySchema - 标签搜索

```typescript
z.object({
  q: z.string().min(1, '搜索关键词不能为空'),
  limit: z.coerce.number().int().positive().max(50).default(10),
})
```

**导出类型**: `SearchQuery`

---

#### 5. postSearchQuerySchema - 文章搜索

```typescript
z.object({
  q: z.string().min(1, '搜索关键词不能为空'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
})
```

**导出类型**: `PostSearchQuery`

---

#### 6. getTagListQuerySchema - 标签列表

```typescript
z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
  sort: z.enum(['count', 'name', 'created_at']).default('count'),
  order: z.enum(['asc', 'desc']).default('desc'),
})
```

**特点**: 支持排序和分页，默认按 count 降序

**导出类型**: `GetTagListQuery`

---

#### 7. tagParamsSchema - 标签路径参数

```typescript
z.object({
  id: z.string()
    .regex(/^\d+$/, 'ID 必须是数字')
    .transform((val) => Number(val))
    .refine((val) => val > 0, 'ID 必须大于 0'),
})
```

**导出类型**: `TagParams`

---

## 💬 留言 Schemas (message.schema.ts)

**文件路径**: [`message.schema.ts`](message.schema.ts)

**功能说明**: 留言相关的请求体验证

### Schema 列表

| Schema | 类型 | 用途 |
|--------|------|------|
| `createMessageSchema` | Request Body | 创建留言 |
| `getMessagesQuerySchema` | Query Params | 留言列表查询 |
| `messageParamsSchema` | Path Params | 留言 ID 路径参数 |

### 详细定义

#### 1. createMessageSchema - 创建留言

```typescript
z.object({
  content: z.string()
    .min(1, '留言内容不能为空')
    .max(150, '留言内容不能超过 150 字')
    .trim(),
  image_url: z.union([
    z.string().min(1, '图片URL不能为空'),
    z.literal('')
  ]).optional(),
})
```

**验证规则**:
- 内容：1-150 字符
- 图片 URL：可选，可以是有效 URL 或空字符串

**导出类型**: `CreateMessageInput`

---

#### 2. getMessagesQuerySchema - 留言列表

```typescript
z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(15),
})
```

**导出类型**: `GetMessagesQuery`

---

#### 3. messageParamsSchema - 留言路径参数

```typescript
z.object({
  id: z.string()
    .regex(/^\d+$/, 'ID 必须是数字')
    .transform((val) => Number(val))
    .refine((val) => val > 0, 'ID 必须大于 0'),
})
```

**验证流程**:
1. 检查是否为数字字符串
2. 转换为 number 类型
3. 检查是否大于 0

**导出类型**: `MessageParams`

---

## 📋 使用规范

### 1. Schema 命名约定

```typescript
// ✅ 推荐 - 清晰的命名
createPostSchema      // 创建资源
updatePostSchema      // 更新资源
getListQuerySchema    // 查询参数
postParamsSchema      // 路径参数

// ❌ 不推荐 - 模糊的命名
postSchema            // 不明确的用途
validatePost          // 动词开头
```

### 2. 类型推导

```typescript
// ✅ 推荐 - 使用 z.infer 推导类型
export const createPostSchema = z.object({ /* ... */ })
export type CreatePostInput = z.infer<typeof createPostSchema>

// Controller 中使用
import type { CreatePostInput } from '@server/schemas/post.schema'
```

### 3. 复用和组合

```typescript
// ✅ 推荐 - 复用基础 Schema
export const updatePostSchema = createPostSchema.partial()

// ✅ 推荐 - 扩展 Schema
export const updatePostSchema = createPostSchema.partial().extend({
  tagIds: z.array(z.number().int().positive()).max(3).optional(),
})
```

### 4. 路径参数转换

```typescript
// ✅ 推荐 - 字符串转数字
export const postParamsSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, 'ID 必须是数字')
    .transform((val) => Number(val))  // 转换为 number
    .refine((val) => val > 0, 'ID 必须大于 0'),  // 验证
})
```

### 5. 自定义错误消息

```typescript
// ✅ 推荐 - 提供清晰的错误提示
z.string()
  .min(1, { message: '标题不能为空' })
  .max(200, { message: '标题不能超过 200 字符' })

// ✅ 推荐 - 使用 refine 添加自定义验证
.refine((val) => !/[\s,，]/.test(val), '标签名称不能包含空格或逗号')
```

### 6. 可选字段处理

```typescript
// ✅ 推荐 - 明确区分可选和可空
z.string().optional()         // undefined 或 string
z.string().nullable()         // null 或 string
z.string().optional().or(z.literal(''))  // undefined 或 string 或空字符串
```

### 7. 数字类型强制转换

```typescript
// ✅ 推荐 - 使用 coerce 处理字符串参数
z.coerce.number().int().positive()  // 自动将字符串转为数字
z.coerce.number().int().positive().default(1)  // 提供默认值
```

### 8. 数组验证

```typescript
// ✅ 推荐 - 完整的数组验证
z.array(z.number().int().positive())
  .min(1, '至少选择一个')
  .max(3, '最多选择 3 个')
  .refine((ids) => new Set(ids).size === ids.length, '标签不能重复')
```

### 9. URL 验证

```typescript
// ✅ 推荐 - URL 验证（允许空字符串）
z.string().url('必须是有效的 URL').optional().or(z.literal(''))

// ✅ 推荐 - 可选的 URL
z.string().url('必须是有效的 URL').optional()
```

### 10. 枚举验证

```typescript
// ✅ 推荐 - 使用 enum
export const postStatusEnum = z.enum(['draft', 'published'], {
  message: '状态必须是 draft 或 published',
})

// 在 Schema 中复用
status: postStatusEnum.default('draft')
```

### 11. 自动 trim

```typescript
// ✅ 推荐 - 字符串自动去除首尾空格
z.string().trim()
z.string().min(1).trim()  // 先验证最小长度，再 trim
```

### 12. 联合类型

```typescript
// ✅ 推荐 - 使用 union 处理多种情况
z.union([
  z.string().min(1, '图片URL不能为空'),
  z.literal('')
])
```

---

## 📄 文档同步更新准则

**⚠️ 重要**: Schema 的任何变更必须同步更新本文档

**必须更新文档的情况**:
- ✅ **新增 Schema 文件**: 在文档中添加新的 Schema 章节
- ✅ **新增 Schema**: 更新对应文件的"Schema 列表"
- ✅ **修改验证规则**: 更新 Schema 定义和说明
- ✅ **删除 Schema**: 从"Schema 列表"中移除
- ✅ **修改类型定义**: 更新导出的类型说明
- ✅ **新增验证规则**: 添加验证规则说明

**更新检查清单**:
- [ ] Schema 依赖关系矩阵
- [ ] Schema 列表
- [ ] 详细定义章节
- [ ] 使用示例

---

**(注：不需要在文档中维护版本历史，Git Commit 会记录所有变更轨迹。保持本文档始终为最新状态的快照即可。)**

---

## 🔍 相关文档

- **Controller 层**: [`../api/CLAUDE.md`](../api/CLAUDE.md) - API 路由文档
- **Service 层**: [`../services/CLAUDE.md`](../services/CLAUDE.md) - Service 层文档
- **验证工具**: [`../utils/validation.ts`](../utils/validation.ts) - 验证工具函数
- **后端规范**: [`../CLAUDE.md`](../CLAUDE.md) - 后端完整文档
- **项目规范**: [`../../CLAUDE.md`](../../CLAUDE.md) - 项目级规范