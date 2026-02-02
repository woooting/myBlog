# Markdown 博客功能实现指南

> 本指南帮助你逐步实现一个带草稿功能的 Markdown 博客文章系统

## 功能概述

- [x] Markdown 编辑器（ByteMD）
- [x] 文章创建、编辑、删除
- [x] 草稿保存和发布功能
- [x] 文章列表和详情展示
- [x] 分类和标签支持

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端编辑器 | ByteMD (Vue 3) |
| 后端框架 | Nitro (Nuxt 内置) |
| 数据库 | SQLite (better-sqlite3) |
| 架构模式 | 两层架构 (Controller → Service) |

## 架构设计

本指南采用 **Controller + Service 两层架构**，符合 Nuxt 4 的目录约定：

```
server/
├── api/              # Controller 层 - 处理 HTTP 请求、参数验证
├── services/         # Service 层 - 业务逻辑 + 直接数据库操作
├── utils/            # 工具函数 - 数据库实例 db.ts（自动导入）
├── middleware/       # 服务端中间件
└── plugins/          # Nitro 插件（如 init-db.ts）
```

| 层级 | 目录 | 职责 |
|------|------|------|
| **Controller** | `server/api/` | 处理 HTTP 请求、参数验证、调用 Service |
| **Service** | `server/services/` | 业务逻辑 + 直接数据库 CRUD 操作 |
| **Utils** | `server/utils/` | 数据库实例等工具函数（自动导入） |

---

## 实现步骤

### 第一步：安装依赖

```bash
# ByteMD 核心
pnpm add @bytemd/vue-next bytemd

# ByteMD 插件（GFM、代码高亮、数学公式）
pnpm add @bytemd/plugin-gfm @bytemd/plugin-highlight @bytemd/plugin-math

# 插件依赖
pnpm add -D highlight.js katex
```

---

### 第二步：更新数据库表结构

当前 `posts` 表需要扩展字段以支持草稿、分类、标签等功能。

**文件：`server/plugins/init-db.ts`**

```typescript
import db from '../utils/db'

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,              -- 文章摘要
    status TEXT DEFAULT 'draft', -- draft: 草稿, published: 已发布
    category TEXT,             -- 分类
    tags TEXT,                 -- 标签（JSON 数组字符串）
    cover_image TEXT,          -- 封面图
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME      -- 发布时间
  )
`)

export default defineNitroPlugin(() => {
  console.log('✅ 数据库初始化完成')
})
```

**验证：** 重启开发服务器，检查 `./data/blog.db` 是否更新

---

### 第三步：创建 Service 层

Service 层处理业务逻辑并**直接操作数据库**（无需额外的 Repository 层）。

**新建文件：`server/services/posts.service.ts`**

```typescript
import db from '../utils/db'

export interface Post {
  id?: number
  title: string
  content: string
  summary?: string
  status?: 'draft' | 'published'
  category?: string
  tags?: string
  cover_image?: string
  view_count?: number
  created_at?: string
  updated_at?: string
  published_at?: string
}

export const postsService = {
  // 创建文章
  create(post: Omit<Post, 'id' | 'created_at' | 'updated_at'>) {
    const stmt = db.prepare(`
      INSERT INTO posts (title, content, summary, status, category, tags, cover_image, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    return stmt.run(
      post.title,
      post.content,
      post.summary || null,
      post.status || 'draft',
      post.category || null,
      post.tags || null,
      post.cover_image || null,
      post.published_at || null
    )
  },	

  // 获取所有文章
  getList(options?: { status?: string; category?: string }) {
    let sql = 'SELECT * FROM posts WHERE 1=1'
    const params: any[] = []

    if (options?.status) {
      sql += ' AND status = ?'
      params.push(options.status)
    }

    if (options?.category) {
      sql += ' AND category = ?'
      params.push(options.category)
    }

    sql += ' ORDER BY created_at DESC'

    const stmt = db.prepare(sql)
    return stmt.all(...params)
  },

  // 根据 ID 获取文章
  getById(id: number) {
    const stmt = db.prepare('SELECT * FROM posts WHERE id = ?')
    const post = stmt.get(id)

    if (!post) {
      throw createError({
        statusCode: 404,
        message: '文章不存在'
      })
    }

    return post
  },

  // 更新文章
  update(id: number, post: Partial<Post>) {
    // 先检查文章是否存在
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id)
    if (!existing) {
      throw createError({
        statusCode: 404,
        message: '文章不存在'
      })
    }

    const fields = Object.keys(post)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ')

    const values = Object.entries(post)
      .filter(([key]) => key !== 'id')
      .map(([, value]) => value)

    const stmt = db.prepare(`UPDATE posts SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    return stmt.run(...values, id)
  },

  // 删除文章
  delete(id: number) {
    // 先检查文章是否存在
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id)
    if (!existing) {
      throw createError({
        statusCode: 404,
        message: '文章不存在'
      })
    }

    const stmt = db.prepare('DELETE FROM posts WHERE id = ?')
    return stmt.run(id)
  },

  // 发布文章
  publish(id: number) {
    const stmt = db.prepare(`
      UPDATE posts
      SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    return stmt.run(id)
  },

  // 取消发布文章
  unpublish(id: number) {
    const stmt = db.prepare(`
      UPDATE posts
      SET status = 'draft', published_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    return stmt.run(id)
  }
}
```

**说明：**
- Service 层直接通过 `db` 实例操作数据库
- 业务逻辑（如错误处理、数据验证）在 Service 层处理
- 无需额外的 Repository 抽象层，代码更简洁

---

### 第四步：创建 Controller 层（API 路由）

Controller 层处理 HTTP 请求、参数验证，并调用 Service 层。

按照 Nitro 的文件路由规则创建 API（`server/api/` 目录会自动添加 `/api` 前缀）。

#### 5.1 创建文章

**新建文件：`server/api/posts/index.post.ts`**

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { postsService } = await import('../services/posts.service')

  // 基本验证
  if (!body.title || !body.content) {
    throw createError({
      statusCode: 400,
      message: '标题和内容不能为空'
    })
  }

  const result = postsService.create(body)
  return {
    success: true,
    data: {
      id: result.lastInsertRowid,
      ...body
    }
  }
})
```

#### 5.2 获取文章列表

**新建文件：`server/api/posts/index.get.ts`**

```typescript
export default defineEventHandler(async (event) => {
  const { status, category } = getQuery(event)
  const { postsService } = await import('../services/posts.service')

  const posts = postsService.getList({
    status: status as string,
    category: category as string
  })

  return {
    success: true,
    data: posts
  }
})
```

#### 5.3 获取单篇文章

**新建文件：`server/api/posts/[id].get.ts`**

```typescript
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { postsService } = await import('../services/posts.service')

  const post = postsService.getById(id)
  return {
    success: true,
    data: post
  }
})
```

#### 5.4 更新文章

**新建文件：`server/api/posts/[id].put.ts`**

```typescript
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const { postsService } = await import('../services/posts.service')

  postsService.update(id, body)
  return {
    success: true
  }
})
```

#### 5.5 删除文章

**新建文件：`server/api/posts/[id].delete.ts`**

```typescript
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { postsService } = await import('../services/posts.service')

  postsService.delete(id)
  return {
    success: true
  }
})
```

#### 5.6 发布/取消发布文章

**新建文件：`server/api/posts/[id]/publish.post.ts`**

```typescript
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { action } = await readBody(event) // action: 'publish' | 'unpublish'
  const { postsService } = await import('../services/posts.service')

  if (action === 'publish') {
    postsService.publish(id)
  } else if (action === 'unpublish') {
    postsService.unpublish(id)
  }

  return {
    success: true
  }
})
```

**验证：** 使用以下 curl 命令测试 API

```bash
# 创建文章
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"测试文章","content":"# Hello\n\n这是测试内容","status":"draft"}'

# 获取文章列表
curl http://localhost:3000/api/posts

# 获取单篇文章
curl http://localhost:3000/api/posts/1

# 更新文章
curl -X PUT http://localhost:3000/api/posts/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"更新后的标题"}'

# 发布文章
curl -X POST http://localhost:3000/api/posts/1/publish \
  -H "Content-Type: application/json" \
  -d '{"action":"publish"}'
```

---

### 第五步：创建前端编辑器组件

**新建文件：`app/components/MarkdownEditor.vue`**

```vue
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Editor } from '@bytemd/vue-next'
import gfm from '@bytemd/plugin-gfm'
import highlight from '@bytemd/plugin-highlight'
import 'bytemd/dist/index.css'
import 'highlight.js/styles/github.css'

interface Props {
  modelValue: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '开始编写你的文章...'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const plugins = [gfm(), highlight()]

const handleChange = (value: string) => {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="markdown-editor">
    <Editor
      :value="modelValue"
      :plugins="plugins"
      :placeholder="placeholder"
      @change="handleChange"
    />
  </div>
</template>

<style lang="scss">
.markdown-editor {
  height: 100%;

  .bytemd {
    height: 100%;
    border-radius: 8px;
    overflow: hidden;
  }
}
</style>
```

---

### 第六步：创建文章编辑/发布页面

**新建文件：`app/pages/admin/new.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const formData = ref({
  title: '',
  content: '',
  summary: '',
  category: '',
  tags: '',
  status: 'draft' as 'draft' | 'published'
})

const loading = ref(false)

const handleSubmit = async (publish: boolean = false) => {
  loading.value = true

  try {
    const response = await $fetch('/api/posts', {
      method: 'POST',
      body: {
        title: formData.value.title,
        content: formData.value.content,
        summary: formData.value.summary,
        category: formData.value.category,
        tags: JSON.stringify(
          formData.value.tags.split(',').map(t => t.trim()).filter(Boolean)
        ),
        status: publish ? 'published' : 'draft',
        published_at: publish ? new Date().toISOString() : null
      }
    })

    // 清空草稿
    localStorage.removeItem('post-draft')

    // 跳转到文章列表
    router.push('/admin/posts')
  } catch (error) {
    console.error('发布失败:', error)
    alert('发布失败，请重试')
  } finally {
    loading.value = false
  }
}

const handleSaveDraft = () => {
  handleSubmit(false)
}

const handlePublish = () => {
  handleSubmit(true)
}
</script>

<template>
  <div class="new-post-page">
    <h1>新建文章</h1>

    <div class="form-group">
      <label>标题</label>
      <input v-model="formData.title" type="text" placeholder="输入文章标题" />
    </div>

    <div class="form-group">
      <label>分类</label>
      <input v-model="formData.category" type="text" placeholder="输入分类" />
    </div>

    <div class="form-group">
      <label>标签（用逗号分隔）</label>
      <input v-model="formData.tags" type="text" placeholder="Nuxt, Vue, TypeScript" />
    </div>

    <div class="form-group">
      <label>摘要</label>
      <textarea v-model="formData.summary" rows="3" placeholder="输入文章摘要"></textarea>
    </div>

    <div class="form-group">
      <label>内容</label>
      <MarkdownEditor v-model="formData.content" />
    </div>

    <div class="actions">
      <button @click="handleSaveDraft" :disabled="loading">
        {{ loading ? '保存中...' : '保存草稿' }}
      </button>
      <button @click="handlePublish" class="primary" :disabled="loading">
        {{ loading ? '发布中...' : '发布文章' }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.new-post-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;

  h1 {
    margin-bottom: 20px;
  }

  .form-group {
    margin-bottom: 20px;

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }

    input,
    textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
  }

  .actions {
    display: flex;
    gap: 10px;

    button {
      padding: 10px 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;

      &:hover {
        background: #f5f5f5;
      }

      &.primary {
        background: #007bff;
        color: white;
        border-color: #007bff;

        &:hover {
          background: #0056b3;
        }
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }
}
</style>
```

---

### 第七步：创建文章列表页面

**新建文件：`app/pages/admin/posts/index.vue`**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Post {
  id: number
  title: string
  status: string
  category: string
  created_at: string
  updated_at: string
}

const posts = ref<Post[]>([])
const loading = ref(false)

const fetchPosts = async () => {
  loading.value = true
  try {
    const result = await $fetch('/api/posts') as any
    posts.value = result.data
  } catch (error) {
    console.error('获取文章列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (id: number) => {
  if (!confirm('确定要删除这篇文章吗？')) return

  try {
    await $fetch(`/api/posts/${id}`, { method: 'DELETE' })
    posts.value = posts.value.filter(p => p.id !== id)
  } catch (error) {
    console.error('删除失败:', error)
    alert('删除失败')
  }
}

const handlePublish = async (id: number, publish: boolean) => {
  try {
    await $fetch(`/api/posts/${id}/publish`, {
      method: 'POST',
      body: { action: publish ? 'publish' : 'unpublish' }
    })
    await fetchPosts()
  } catch (error) {
    console.error('操作失败:', error)
    alert('操作失败')
  }
}

onMounted(() => {
  fetchPosts()
})
</script>

<template>
  <div class="posts-page">
    <div class="header">
      <h1>文章管理</h1>
      <NuxtLink to="/admin/new" class="btn-primary">新建文章</NuxtLink>
    </div>

    <div v-if="loading">加载中...</div>

    <table v-else class="posts-table">
      <thead>
        <tr>
          <th>标题</th>
          <th>分类</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="post in posts" :key="post.id">
          <td>{{ post.title }}</td>
          <td>{{ post.category || '-' }}</td>
          <td>
            <span :class="['status-badge', post.status]">
              {{ post.status === 'published' ? '已发布' : '草稿' }}
            </span>
          </td>
          <td>{{ new Date(post.created_at).toLocaleDateString() }}</td>
          <td class="actions">
            <NuxtLink :to="`/admin/edit/${post.id}`">编辑</NuxtLink>
            <button v-if="post.status === 'draft'" @click="handlePublish(post.id, true)">
              发布
            </button>
            <button v-else @click="handlePublish(post.id, false)">
              撤回
            </button>
            <button @click="handleDelete(post.id)" class="danger">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
.posts-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .btn-primary {
      padding: 10px 20px;
      background: #007bff;
      color: white;
      border-radius: 4px;
      text-decoration: none;
    }
  }

  .posts-table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }

    th {
      background: #f5f5f5;
      font-weight: 600;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;

      &.published {
        background: #d4edda;
        color: #155724;
      }

      &.draft {
        background: #fff3cd;
        color: #856404;
      }
    }

    .actions {
      display: flex;
      gap: 8px;

      button,
      a {
        padding: 4px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 12px;
        text-decoration: none;

        &:hover {
          background: #f5f5f5;
        }

        &.danger {
          border-color: #dc3545;
          color: #dc3545;

          &:hover {
            background: #dc3545;
            color: white;
          }
        }
      }
    }
  }
}
</style>
```

---

### 第八步：创建文章详情页面

**新建文件：`app/pages/posts/[id].vue`**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const post = ref<any>(null)
const loading = ref(false)

const fetchPost = async () => {
  loading.value = true
  try {
    const result = await $fetch(`/api/posts/${route.params.id}`) as any
    post.value = result.data
  } catch (error) {
    console.error('获取文章失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPost()
})
</script>

<template>
  <div v-if="loading">加载中...</div>
  <article v-else-if="post" class="post-detail">
    <h1>{{ post.title }}</h1>
    <div class="meta">
      <span>{{ new Date(post.created_at).toLocaleDateString() }}</span>
      <span v-if="post.category">{{ post.category }}</span>
    </div>
    <div class="content" v-html="post.content"></div>
  </article>
</template>

<style lang="scss" scoped>
.post-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;

  h1 {
    font-size: 32px;
    margin-bottom: 10px;
  }

  .meta {
    color: #666;
    margin-bottom: 30px;
    font-size: 14px;

    span {
      margin-right: 15px;
    }
  }

  .content {
    line-height: 1.8;

    :deep(h2) {
      margin-top: 30px;
      margin-bottom: 15px;
    }

    :deep(p) {
      margin-bottom: 15px;
    }

    :deep(pre) {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
  }
}
</style>
```

---

## API 接口总结

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/posts` | 创建文章 |
| GET | `/api/posts` | 获取文章列表 |
| GET | `/api/posts/:id` | 获取单篇文章 |
| PUT | `/api/posts/:id` | 更新文章 |
| DELETE | `/api/posts/:id` | 删除文章 |
| POST | `/api/posts/:id/publish` | 发布/取消发布 |

---

## 验证检查清单

完成每一步后，验证以下内容：

- [ ] 依赖安装成功（`pnpm list` 查看）
- [ ] 数据库表结构更新成功
- [ ] Service 层逻辑正确（直接数据库操作）
- [ ] Controller 层 API 接口可访问（curl 测试）
- [ ] 编辑器组件渲染正常
- [ ] 可以创建和保存草稿
- [ ] 可以发布文章
- [ ] 文章列表正常显示
- [ ] 文章详情正常显示

---

## 常见问题

### Q1: ByteMD 在 Nuxt 中报错？

确保使用 `@bytemd/vue-next` 包，这是 Vue 3 兼容版本。

### Q2: 数据库字段不生效？

删除 `./data/blog.db` 文件，重启服务器让表结构重新创建。

### Q3: API 跨域问题？

Nuxt 开发模式下同源调用不会有跨域问题，确保使用 `$fetch` 而不是 `fetch`。

---

## 下一步扩展

完成基础功能后，你可以继续扩展：

- [ ] 图片上传功能
- [ ] 文章搜索
- [ ] 标签管理
- [ ] 用户认证
- [ ] 评论系统
