# Server CLAUDE.md

后端（Nitro）详细规范。

---

## 数据库架构

**数据库文件**：`./data/blog.db`

### posts 表

id/title/content/summary/status/category/tags/cover_image/view_count/created_at/updated_at/published_at

- tags 以 JSON 数组字符串存储
- status: draft | published

### messages 表

id/visitor_id/content/image_url/created_at

- visitor_id 为 UUID

### 配置

- 数据库实例：`server/utils/db.ts`（单例模式）
- WAL 模式：`journal_mode = WAL`
- 初始化：`server/plugins/init-db.ts`

---

## API 路由列表

### 文章

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/posts` | 列表（状态、分类筛选） |
| POST | `/api/posts` | 创建 |
| GET | `/api/posts/:id` | 详情 |
| PUT | `/api/posts/:id` | 更新 |
| DELETE | `/api/posts/:id` | 删除 |
| POST | `/api/posts/:id/publish` | 发布/撤回 |
| POST | `/api/posts/batch-delete` | 批量删除 |
| GET | `/api/posts/paginated` | 分页 |

### 留言

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/messages` | 列表（分页） |
| POST | `/api/messages` | 创建 |

### 其他

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/upload/image` | 上传图片 |
| GET | `/api/search/posts` | 搜索文章 |

---

## 统一响应格式

### 成功

```typescript
{
  success: true,
  code: 200,
  message: '成功',
  data: { ... }
}
```

### 失败

```typescript
{
  success: false,
  code: 404,
  message: '错误信息',
  path: '/api/xxx',
  stack: '...'  // 仅开发环境
}
```

---

## Zod Schema

### post.schema.ts

- `createPostSchema` - 创建文章
- `updatePostSchema` - 更新文章
- `paginationQuerySchema` - 分页参数
- `postParamsSchema` - ID 路径参数

### message.schema.ts

- `createMessageSchema` - 创建留言
- `getMessagesQuerySchema` - 留言分页
- `postSearchQuerySchema` - 文章搜索

---

## 文件路由规则

```
server/api/posts/index.get.ts    → GET /api/posts
server/api/posts/[id].get.ts     → GET /api/posts/:id
server/api/posts/[id]/put.ts     → PUT /api/posts/:id
```

方法后缀：`.get.ts`、`.post.ts`、`.put.ts`、`.delete.ts`
