# Fetch 封装学习指南

> 学习目标：使用原生 Fetch API 封装一个类型安全、功能完善的 HTTP 请求库

## 目录

1. [前置知识](#前置知识)
2. [后端响应格式](#后端响应格式)
3. [设计目标](#设计目标)
4. [实现步骤](#实现步骤)
5. [类型定义](#类型定义)
6. [核心封装](#核心封装)
7. [使用示例](#使用示例)

---

## 前置知识

### Fetch API 基础

```typescript
// Fetch 的基本用法
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})

const result = await response.json()
```

### Fetch 的特点

| 特点 | 说明 |
|------|------|
| **返回 Promise** | 支持 async/await |
| **基于 Stream** | response.json() 也是异步的 |
| **状态码处理** | 4xx/5xx 不会抛异常，需要手动检查 |
| **默认不带 Cookie** | 需要设置 `credentials: 'include'` |

---

## 后端响应格式

项目后端使用**统一响应格式**（参考 `server/utils/response.ts`）：

```typescript
// 成功响应
{
  success: true,
  code: 200,
  message: "操作成功",
  data: { ... }
}

// 错误响应
{
  success: false,
  code: 404,
  message: "文章不存在",
  path: "/api/posts/1",
  stack: "..."  // 仅开发环境
}
```

---

## 设计目标

### 功能需求

1. ✅ 统一处理请求/响应格式
2. ✅ 自动处理错误（根据 success 字段）
3. ✅ 类型安全（TypeScript 泛型）
4. ✅ 支持请求拦截器（添加 token、处理参数）
5. ✅ 支持响应拦截器（统一错误处理）
6. ✅ 超时控制
7. ✅ 请求取消

### 文件结构

```
app/
├── composables/
│   └── useApi.ts          # 核心封装（你需要实现）
├── utils/
│   └── api.types.ts       # 类型定义
└── api/
    └── posts.api.ts       # 具体业务 API
```

---

## 实现步骤

### 步骤 1：定义类型系统

创建 `app/utils/api.types.ts`：

```typescript
// 请求方法类型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// 后端统一响应格式
export interface ApiResponse<T = any> {
  success: boolean
  code: number
  message: string
  data: T
  path?: string
  stack?: string  // 仅开发环境
}

// 请求配置
export interface ApiRequestConfig {
  method?: HttpMethod
  headers?: Record<string, string>
  params?: Record<string, any>
  body?: any
  timeout?: number  // 毫秒
  signal?: AbortSignal
}

// 错误类
export class ApiError extends Error {
  constructor(
    public code: number,
    public message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
```

### 步骤 2：核心封装框架

创建 `app/composables/useApi.ts`：

```typescript
import type { ApiRequestConfig, ApiResponse, ApiError } from '~/utils/api.types'

// TODO(human): 实现核心请求函数
// 提示：
// 1. 使用 fetch 发送请求
// 2. 处理 URL 参数拼接
// 3. 添加超时控制
// 4. 根据 success 字段判断成功/失败
// 5. 失败时抛出 ApiError

async function request<T>(
  url: string,
  config: ApiRequestConfig = {}
): Promise<T> {
  // TODO(human): 实现请求逻辑

  // 参考思路：
  // 1. 处理 URL 参数（params）
  // 2. 设置默认 headers
  // 3. 处理超时（AbortController + setTimeout）
  // 4. 发送 fetch 请求
  // 5. 检查 response.ok
  // 6. 解析 JSON
  // 7. 根据 success 字段返回或抛错
}
```

### 步骤 3：实现 URL 参数拼接

```typescript
// 辅助函数：拼接 URL 参数
function buildUrl(url: string, params?: Record<string, any>): string {
  if (!params) return url

  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `${url}?${queryString}` : url
}
```

### 步骤 4：实现超时控制

```typescript
// 辅助函数：创建超时信号
function createTimeoutSignal(timeout: number): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeout)
  return controller.signal
}
```

### 步骤 5：实现核心请求函数

```typescript
async function request<T>(
  url: string,
  config: ApiRequestConfig = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    params,
    body,
    timeout = 10000,
    signal
  } = config

  // 1. 构建 URL
  const fullUrl = buildUrl(url, params)

  // 2. 处理请求头
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers
  }

  // 3. 处理请求体
  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
    signal: timeout ? createTimeoutSignal(timeout) : signal
  }

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body)
  }

  // 4. 发送请求
  let response: Response
  try {
    response = await fetch(fullUrl, requestInit)
  } catch (error) {
    // TODO(human): 处理网络错误和超时
    throw new ApiError(0, '网络请求失败')
  }

  // 5. 检查 HTTP 状态码
  if (!response.ok) {
    // TODO(human): 处理 HTTP 错误（4xx, 5xx）
    throw new ApiError(response.status, '请求失败')
  }

  // 6. 解析响应
  const result: ApiResponse<T> = await response.json()

  // 7. 检查业务状态码
  if (!result.success) {
    // TODO(human): 根据 result.code 抛出业务错误
    throw new ApiError(result.code, result.message)
  }

  return result.data
}
```

---

## 使用示例

### 基础用法

```typescript
// GET 请求
const posts = await request<Post[]>('/api/posts')

// POST 请求
const newPost = await request<Post>('/api/posts', {
  method: 'POST',
  body: { title: '标题', content: '内容' }
})

// 带参数的 GET
const post = await request<Post>('/api/posts/1')

// 带查询参数
const list = await request<Post[]>('/api/posts', {
  params: { status: 'published', page: 1 }
})
```

### 在 Vue 组件中使用

```vue
<script setup lang="ts">
import { request } from '~/composables/useApi'

interface Post {
  id: number
  title: string
  content: string
}

const posts = ref<Post[]>([])
const error = ref<string | null>(null)

async function fetchPosts() {
  try {
    posts.value = await request<Post[]>('/api/posts')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '未知错误'
  }
}

onMounted(() => fetchPosts())
</script>
```

### 创建 API 模块

```typescript
// app/api/posts.api.ts
import { request } from '~/composables/useApi'

export const postsApi = {
  // 获取文章列表
  getList: (params?: { status?: string; page?: number }) =>
    request<Post[]>('/api/posts', { params }),

  // 获取单篇文章
  getById: (id: number) =>
    request<Post>(`/api/posts/${id}`),

  // 创建文章
  create: (data: CreatePostDto) =>
    request<Post>('/api/posts', {
      method: 'POST',
      body: data
    }),

  // 更新文章
  update: (id: number, data: UpdatePostDto) =>
    request<Post>(`/api/posts/${id}`, {
      method: 'PUT',
      body: data
    }),

  // 删除文章
  delete: (id: number) =>
    request<void>(`/api/posts/${id}`, {
      method: 'DELETE'
    })
}
```

---

## 进阶挑战

完成基础封装后，可以尝试实现：

1. **请求拦截器**：自动添加 Token
2. **响应拦截器**：统一错误提示
3. **重试机制**：失败自动重试
4. **请求缓存**：相同的 GET 请求缓存结果
5. **请求取消**：组件卸载时取消未完成的请求

---

## 你的任务

### 第一阶段：核心功能

**文件位置**：`app/utils/api.types.ts`

1. 定义 `ApiResponse`、`ApiRequestConfig`、`ApiError` 类型

**文件位置**：`app/composables/useApi.ts`

2. 实现 `buildUrl` 函数（URL 参数拼接）
3. 实现 `createTimeoutSignal` 函数（超时控制）
4. 实现 `request` 核心函数

### 第二阶段：完善功能

5. 添加请求拦截器支持
6. 添加响应拦截器支持
7. 添加全局错误处理

---

## 参考资源

- [MDN - Fetch API](https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API)
- [MDN - AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController)
- [TypeScript 泛型](https://www.typescriptlang.org/docs/handbook/2/generics.html)

---

**Created**: 2025-02-03
**Status**: 🚧 进行中
