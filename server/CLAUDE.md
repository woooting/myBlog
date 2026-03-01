# Server CLAUDE.md

后端（Nitro）详细规范。

---

## 新功能实现规范

- 必须按照分层结构 controller - service ，不得在controller中写sql语句  controller层对应server\api 这个路径文件夹下的所有文件
- 必须规范所有接口响应的数据结构 使用successResponse包装result，不清晰时需要向我询问具体要求

## 数据库架构

**数据库文件**：`./data/blog.db`

### posts 表

id/title/content/summary/status/category/tags/cover_image/view_count/created_at/updated_at/published_at

- tags 以 JSON 数组字符串存储
- status: draft | published

### tags 表

id/name/slug/desc/count/created_at/updated_at

- name 为标签名称，唯一
- slug 为 URL 友好标识，唯一
- count 为关联文章数量

### post_tags 表

id/post_id/tag_id/created_at

- post_id 关联 posts.id
- tag_id 关联 tags.id
- 联合唯一索引 (post_id, tag_id)

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
| DELETE | `/api/messages/:id` | 删除 |

### 标签

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/tags` | 列表（分页、排序） |
| POST | `/api/tags` | 创建 |
| GET | `/api/tags/:id` | 详情 |
| PUT | `/api/tags/:id` | 更新 |
| DELETE | `/api/tags/:id` | 删除（级联删除 post_tags） |
| GET | `/api/tags/search` | 搜索（模糊匹配） |
| GET | `/api/tags/popular` | 热门标签 |

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

### tag.schema.ts

- `createTagSchema` - 创建标签
- `updateTagSchema` - 更新标签
- `updatePostTagsSchema` - 更新文章标签
- `searchQuerySchema` - 标签搜索
- `getTagListQuerySchema` - 标签列表分页
- `tagParamsSchema` - 标签 ID 路径参数

---

## 文件路由规则

```
server/api/posts/index.get.ts    → GET /api/posts
server/api/posts/[id].get.ts     → GET /api/posts/:id
server/api/posts/[id]/put.ts     → PUT /api/posts/:id
```

方法后缀：`.get.ts`、`.post.ts`、`.put.ts`、`.delete.ts`
