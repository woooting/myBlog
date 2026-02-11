# 项目日志

> ## ⚠️ 重要注意事项：Nuxt 4 自动导入机制
>
> **在 `app/` 目录下的所有文件中，永远不要从 `vue` 中导入任何类型、Hook 或 API！**
>
> ❌ **禁止的导入**（包括 `import type`）：
> ```typescript
> import { ref, computed, onMounted, watch } from 'vue'
> import type { Ref, ComputedRef } from 'vue'  // ❌ 连 import type 也不需要！
> ```
>
> ✅ **正确做法**：
> ```typescript
> // 所有 Vue API 和类型都是自动导入的，直接使用
> const count = ref(0)
> const doubled = computed(() => count.value * 2)
>
> onMounted(() => {
>   console.log('mounted')
> })
>
> // 类型也是自动导入的，无需任何 import
> function processValue(value: Ref<number>) {
>   // ...
> }
> ```
>
> **原因**：Nuxt 4 会自动导入所有 Vue 的 Composition API、响应式 API **和类型定义**，手动导入会导致：
> - 模块解析错误
> - 运行时冲突
> - 构建失败
>
> **自动导入的内容**：
> - **响应式 API**：`ref`, `computed`, `reactive`, `readonly` 等
> - **生命周期 Hook**：`onMounted`, `onBeforeUnmount`, `watch` 等
> - **类型定义**：`Ref`, `ComputedRef`, `Writable` 等（无需 import type！）
> - **Nuxt 专属 API**：`useRouter`, `useRoute`, `useNuxtApp` 等
>
> **唯一需要导入的**：
> - 第三方库的组件和工具（如 `@tiptap/vue-3`）
> - 相对路径的本地模块（如 `../utils/myUtil`）
> - 其他包的类型（如 `import type { SomeType } from 'some-library'`）

---

## 2025-02-03 - Fetch 封装总结

### 一、类型系统设计

#### 1. 响应类型 `ApiResponse<T>`
匹配后端统一响应格式，支持泛型推导：

```typescript
export interface ApiResponse<T = any> {
  success: boolean    // 业务状态码
  code: number        // HTTP 状态码
  message: string     // 提示消息
  data?: T           // 响应数据（可选）
  path?: string      // 请求路径
  stack?: string     // 错误堆栈（开发环境）
}
```

#### 2. 请求配置类型 `ApiRequestConfig`
支持所有 fetch 选项 + 自定义扩展：

```typescript
export interface ApiRequestConfig {
  method?: HttpMethod              // 请求方法
  headers?: Record<string, string> // 请求头
  params?: Record<string, any>     // URL 查询参数
  body?: any                       // 请求体
  timeout?: number                 // 超时时间（毫秒）
  signal?: AbortSignal            // 取消信号
  showToast?: boolean             // 是否显示提示
}
```

#### 3. 错误类型 `ApiError`
继承原生 Error，统一错误处理：

```typescript
export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
```

---

### 二、核心功能实现

#### 1. URL 参数拼接 `buildUrl()`
将查询参数拼接到 URL，自动处理特殊字符转义：

```typescript
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

**考虑的边界情况：**
- params 为 undefined/null → 直接返回原 URL
- 参数值为 undefined/null → 过滤掉
- 特殊字符转义 → URLSearchParams 自动处理

#### 2. 超时控制 `createTimeoutSignal()`
使用 AbortController + setTimeout 实现请求超时：

```typescript
function createTimeoutSignal(timeout?: number): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeout)
  return controller.signal
}
```

**实现原理：**
1. 创建 AbortController（遥控器）
2. 设置定时器，超时后调用 `controller.abort()`
3. 将 signal 传给 fetch，fetch 监听 abort 事件
4. abort 触发后 fetch 抛出 AbortError

#### 3. 请求体处理
GET 请求不带 body，其他方法才序列化：

```typescript
body: config.method !== 'GET' && config.body
  ? JSON.stringify(config.body)
  : undefined
```

#### 4. Signal 处理逻辑
处理手动取消和超时取消的优先级：

```typescript
let actualSignal: AbortSignal | undefined = config.signal

if (typeof config.timeout === 'number' && !config.signal) {
  // 只有传了 timeout 且没有 signal 时才创建超时信号
  actualSignal = createTimeoutSignal(config.timeout)
}
// 如果同时传了 signal 和 timeout，优先使用 signal（手动控制 > 自动超时）
```

---

### 三、响应处理流程

```
请求发送 → fetch → response.ok 检查 → 解析 JSON → success 检查 → 返回 data
                                      ↓                  ↓
                                   HTTP 错误          业务失败
                                      ↓                  ↓
                                抛出 ApiError      抛出 ApiError
```

#### 1. HTTP 状态码检查
```typescript
if (response.ok) {
  // 2xx 状态码，继续处理
} else {
  // 4xx/5xx 状态码，解析错误响应后抛出 ApiError
}
```

#### 2. 业务状态码检查
```typescript
if (res.success) {
  return res.data!  // 返回数据（非空断言）
} else {
  throw new ApiError(res.code, res.message, res.data)
}
```

---

### 四、错误处理

#### 错误类型分类

| 错误类型 | 检测方式 | 处理方式 |
|---------|---------|---------|
| **AbortError** | `error.name === 'AbortError'` | 转换为 ApiError(0, '请求已取消') |
| **TypeError** | 网络错误（断网、DNS 失败、CORS） | 转换为 ApiError(0, '网络请求失败') |
| **ApiError** | 已经是 ApiError，直接抛出 | 让调用者 catch 处理 |

```typescript
catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    throw new ApiError(0, '请求已取消')
  }
  throw new ApiError(0, '网络请求失败，请检查网络连接')
}
```

---

### 五、Toast 提示集成

#### 1. 配置
使用 `@nuxtjs/toast` 库，在 `nuxt.config.ts` 中配置：

```typescript
toast: {
  duration: 3000,
  position: 'top-right',
  theme: 'bubble',
}
```

#### 2. 显示时机

| 场景 | Toast 类型 | 消息来源 |
|------|-----------|---------|
| 请求成功 | success | `res.message \|\| '操作成功'` |
| 业务失败 (success: false) | error | `res.message \|\| '操作失败'` |
| HTTP 错误 (4xx/5xx) | error | `res.message \|\| '请求失败'` |
| 网络错误 | error | '网络请求失败，请检查网络连接' |
| 请求取消 | info | '请求已取消' |

#### 3. 服务端安全
```typescript
const nuxtApp = typeof window !== 'undefined' ? useNuxtApp() : null
const toast: any = nuxtApp?.$toast
```

---

### 六、边界情况处理

| 场景 | 处理方式 |
|------|----------|
| params 为空 | 提前返回原 URL |
| params 值为 null/undefined | 过滤掉该参数 |
| GET 请求带 body | 不设置 body（HTTP 规范） |
| timeout = 0 | 用 `typeof` 检查而非 truthy 判断 |
| 同时传 signal 和 timeout | signal 优先（手动控制 > 自动超时） |
| data 为 undefined | 使用非空断言 `!` |
| 网络断开 | catch 统一处理 |

---

### 七、API 设计原则

1. **类型安全**：泛型 + TypeScript 类型推导
2. **简洁易用**：合理的默认值（GET、JSON headers），最小化必填参数
3. **错误统一**：所有错误都转换为 ApiError
4. **可扩展**：支持 signal、自定义 headers、showToast
5. **防御性**：处理各种边界情况

---

### 八、完整代码结构

```
app/
├── utils/
│   └── api.types.ts        # 类型定义
├── composables/
│   └── useApi.ts           # 核心封装
└── api/
    └── posts.api.ts        # 业务 API 示例
```

---

### 九、使用示例

```typescript
import { request } from '~/composables/useApi'

// 基础用法
const posts = await request<Post[]>('/api/posts')

// 带参数
const list = await request<Post[]>('/api/posts', {
  params: { status: 'published', page: 1 }
})

// POST 请求
const newPost = await request<Post>('/api/posts', {
  method: 'POST',
  body: { title: '标题', content: '内容' },
  showToast: true,
})

// 带超时
const data = await request<Post>('/api/posts/1', {
  timeout: 5000,
})

// 错误处理
try {
  await request('/api/posts', { showToast: true })
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.code, error.message)
  }
}
```

---

### 十、关键学习点

1. **泛型设计**：`ApiResponse<T>` 让响应携带类型信息
2. **两层验证**：HTTP 状态码 + 业务状态码
3. **AbortController**：实现请求取消和超时控制的核心
4. **URLSearchParams**：自动处理 URL 参数拼接和转义
5. **类型断言 vs 非空断言**：`as T` vs `!` 的选择
6. **可选参数的 undefined 惯例**：`undefined` 等价于不传
7. **模块作用域 vs 闭包**：同文件函数可以直接互相调用
8. **falsy 的陷阱**：`0` 是 falsy 但可能是有效值

---

**Created**: 2025-02-03
**Status**: ✅ 完成并测试

---

## 2025-02-03 - Node.js 升级到 24.5.0 相关问题修复

### 问题一：better-sqlite3 编译失败

#### 错误信息
```
gyp ERR! find VS
gyp ERR! find VS could not find a version of Visual Studio 2017 or newer to use
```

#### 根本原因
1. **node-gyp 依赖**：`better-sqlite3` 是原生 C++ 模块，需要编译
2. **VS 注册缺失**：Visual Studio 2022 安装在 `D:\visualStudio`，但未在注册表中正确注册
3. **预编译超时**：`prebuild-install` 下载超时，回退到本地编译

#### 解决方案

**1. 配置 pnpm 使用 VS 2022**
```bash
pnpm config set msvs_version 2022
```

**2. 重装依赖**
```bash
pnpm install --frozen-lockfile
```

**3. 后续若需手动编译**
- 使用批处理脚本 `.\rebuild-native.bat`
- 或手动运行：
```bash
call "D:\visualStudio\VC\Auxiliary\Build\vcvars64.bat"
pnpm rebuild better-sqlite3
```

#### 验证结果
- ✅ `better-sqlite3` 加载成功
- ✅ 开发服务器正常启动
- ✅ 数据库初始化正常

---

### 问题二：TypeScript 找不到 `nitro` 配置类型

#### 错误信息
```
对象字面量只能指定已知属性，并且"nitro"不在类型"InputConfig<NuxtConfig, ConfigLayerMeta>"中。
```

#### 根本原因
升级 Node 版本后，`.nuxt` 目录被清理，Nuxt 自动生成的类型定义文件丢失。

#### 解决方案
```bash
pnpm nuxi prepare
```

#### 生成的类型文件
```
.nuxt/
├── tsconfig.json           # 主配置（app 环境继承）
├── tsconfig.app.json       # App 环境
├── tsconfig.server.json    # Server 环境（Nitro）
├── tsconfig.node.json      # Node 环境（nuxt.config.ts 用）
└── tsconfig.shared.json    # 共享配置
```

#### 如果错误仍存在
在 VS Code 中重新加载 TypeScript 语言服务器：
```
Ctrl+Shift+P → TypeScript: Restart TS Server
```

---

### 问题三：Vite 依赖解析警告（未完全解决）

#### 警告信息
```
WARN Failed to resolve dependency: @nuxtjs/mdc > remark-gfm, present in client 'optimizeDeps.include'
WARN Failed to resolve dependency: @nuxtjs/mdc > remark-emoji, present in client 'optimizeDeps.include'
...
```

#### 根本原因
- `@nuxt/content` 内部配置了 `optimizeDeps.include`
- 这些 remark/rehype 插件只在服务端使用
- 客户端构建时尝试解析但找不到

#### 尝试的解决方案
在 `nuxt.config.ts` 中添加：
```typescript
vite: {
  optimizeDeps: {
    noDiscovery: true,
  },
},
hooks: {
  'vite:extendConfig': (config) => {
    if (config.optimizeDeps?.include) {
      const serverOnlyDeps = ['remark-gfm', 'remark-emoji', ...]
      config.optimizeDeps.include = config.optimizeDeps.include.filter(
        (dep: string) => !serverOnlyDeps.some(d => dep === d || dep.startsWith('@nuxtjs/mdc > '))
      )
    }
  },
}
```

#### 当前状态
⚠️ 警告仍然存在，但不影响功能使用

---

### 经验总结

1. **升级 Node 后必须做的事**：
   - 重新生成类型：`pnpm nuxi prepare`
   - 重装依赖：`pnpm install`

2. **原生模块编译**：
   - 优先使用预编译二进制（`prebuild-install`）
   - 失败时需要本地编译环境（VS + C++ 工作负载）

3. **`.nuxt` 目录的重要性**：
   - 包含所有自动生成的类型定义
   - 每次 `nuxt dev` 或 `nuxi prepare` 重新生成
   - 不应手动修改

4. **node-gyp 的 VS 版本对应**：
   | Node 版本 | 最低 VS 版本 |
   |-----------|-------------|
   | Node 18+ | VS 2019 |
   | Node 22+ | VS 2022 |

---

**Created**: 2025-02-03
**Status**: ✅ better-sqlite3 编译成功 / TypeScript 类型正常 / ⚠️ Vite 警告待后续优化

---

## 2025-02-04 - 响应式图片卡片：动态类名模式

### 一、问题背景

内容平台（小红书、贴吧等）需要展示用户上传的图片，这些图片尺寸不一，但在卡片展示时需要保持统一比例且完全响应式。

**核心矛盾**：
- 用户上传：任意尺寸
- 卡片展示：固定比例、响应式适配

---

### 二、核心技术

#### 1. `aspect-ratio` 属性

**作用**：定义容器的宽高比，高度自动计算

```scss
aspect-ratio: 宽 / 高;

// 示例
aspect-ratio: 1 / 1;      // 正方形
aspect-ratio: 16 / 9;     // 宽屏
aspect-ratio: 4 / 5;      // 小红书竖版
```

**工作原理**：
```
容器宽度：200px
aspect-ratio: 16 / 9
↓
自动计算高度：200 × (9/16) = 112.5px

容器宽度：100px（响应式缩小）
aspect-ratio: 16 / 9
↓
自动计算高度：100 × (9/16) = 56.25px
```

#### 2. `object-fit` 属性

**作用**：控制图片如何填充容器

| 值 | 效果 | 使用场景 |
|---|------|---------|
| `cover` | 保持比例，裁剪多余 | ⭐ 卡片封面（最常用） |
| `contain` | 完整显示，可能留白 | 需要完整图片时 |
| `fill` | 强制拉伸（变形） | 几乎不用 |

```scss
img {
  width: 100%;
  height: 100%;
  object-fit: cover;  // 保持比例填满，多余裁掉
}
```

---

### 三、Vue 动态类名模式

#### 数据流向

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  使用组件    │  →   │   组件内部    │  →   │    CSS      │
│             │      │              │      │             │
│ aspectRatio=│      │ :class="     │      │ .aspect-    │
│  "square"   │      │   `aspect-${ │      │   square {} │
└─────────────┘      └──────────────┘      └─────────────┘
      ↓                   ↓                      ↓
   传入 "square"      生成类名              应用对应样式
                      "aspect-square"
```

#### 模板结构

**Props 定义**：
```typescript
aspectRatio?: 'square' | 'portrait' | 'landscape' | 'story'
```

**动态类名绑定**：
```vue
<div :class="{
  [`aspect-${aspectRatio}`]: aspectRatio
}">
```

**CSS 匹配**：
```scss
&.aspect-square    { aspect-ratio: 1 / 1; }
&.aspect-portrait  { aspect-ratio: 3 / 4; }
&.aspect-landscape { aspect-ratio: 16 / 9; }
&.aspect-story     { aspect-ratio: 9 / 16; }
```

---

### 四、关键设计点

#### 1. 固定比例 vs 固定尺寸

```
❌ 错误：固定像素（不响应式）
width: 200px;
height: 200px;

✅ 正确：固定比例（响应式）
width: 100%;              // 宽度自适应
aspect-ratio: 1 / 1;      // 高度按比例计算
```

#### 2. 模板字符串类名

```typescript
// 为什么用模板字符串？
// 因为类名有共同前缀和可变后缀

// 不推荐：写 4 个独立的类绑定
:class="{
  'aspect-square': aspectRatio === 'square',
  'aspect-portrait': aspectRatio === 'portrait',
  'aspect-landscape': aspectRatio === 'landscape',
  'aspect-story': aspectRatio === 'story',
}"

// ✅ 推荐：用模板字符串
:class="{
  [`aspect-${aspectRatio}`]: aspectRatio,
}"
```

#### 3. SCSS 的 `&` 嵌套

```scss
.image-card {
  &.aspect-square { }  // 编译为 .image-card.aspect-square（同时满足）
  .aspect-square { }    // 编译为 .image-card .aspect-square（后代选择器）
}
```

---

### 五、响应式布局方案

#### 方案 A：Grid 自适应（推荐）

```scss
gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
```

**效果**：根据容器宽度自动计算列数

| 容器宽度 | 列数 | 单列宽度 |
|---------|-----|---------|
| 1200px | 5列 | 240px |
| 768px | 3列 | 256px |
| 375px | 1列 | 375px |

#### 方案 B：媒体查询断点

```scss
.gallery {
  grid-template-columns: 1fr;  // 手机

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);  // 平板
  }
}
```

---

### 六、其他动态类名模式

#### 模式 A：条件类名

```vue
:class="{
  active: isActive,
  disabled: isDisabled,
}"
```

#### 模式 B：动态样式

```vue
:style="{
  fontSize: size + 'px',
  color: themeColor,
}"
```

#### 模式 C：数组组合

```vue
:class="[
  'base-class',
  isActive && 'active',
  variant === 'primary' && 'btn-primary',
]"
```

---

### 七、核心学习点

1. **`aspect-ratio` 的本质**：告诉浏览器"宽度 × 比例 = 高度"，自动计算
2. **`object-fit: cover` 的本质**：和 `background-size` 一样，保持比例裁剪填充
3. **动态类名的本质**：Vue 把 JS 值转成 HTML class，CSS 按常规匹配
4. **模板字符串的优势**：处理"前缀 + 变量"模式的简洁方式
5. **响应式的秘诀**：宽度用 % / fr / vw 等相对单位，高度通过 aspect-ratio 自动计算

---

`★ Insight ─────────────────────────────────────`
- **固定比例 ≠ 固定尺寸**：固定的是"宽高比"这个关系，不是绝对像素值
- **响应式的核心**：宽度自适应 + 比例固定 = 高度自动跟随
- **Vue 动态类名只是映射**：数据 → HTML 属性 → CSS 选择器，三层独立运作
`─────────────────────────────────────────────────`

---

**Created**: 2025-02-04
**Status**: ✅ 完成组件实现

---

## 2025-02-04 - 响应式链断裂：Flex 容器的宽度计算陷阱

### 一、问题背景

实现 Grid 自适应卡片布局时，发现 `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))` 不生效。

**现象**：调整浏览器窗口宽度，卡片始终显示 2 列，不会自动变成 1 列。

---

### 二、核心原理：元素的宽度计算规则

#### 关键区分

| 元素类型 | `width: auto` 的行为 | 受子元素影响？ |
|---------|---------------------|--------------|
| **普通块级** | 占满父容器可用宽度 | ❌ 否 |
| **Flex 容器** | 收缩适应内容 | ✅ 是 |
| **Grid 容器** | 收缩适应内容 | ✅ 是 |

#### 一句话总结

```
普通块级 = 父定子从（父容器决定宽度，子元素跟随）
Flex/Grid = 子定父从（子元素决定宽度，父容器跟随）
```

#### 代码示例

**普通块级元素**：
```scss
.parent {
  width: auto;  // 默认
  // 占满父容器，不受子元素影响
}

.child {
  width: 2000px;  // 会溢出，但不会撑大 .parent
}
```

**Flex 容器**：
```scss
.parent {
  display: flex;
  width: auto;  // 默认
  // 收缩适应内容！
}

.child {
  width: 2000px;  // .parent 也变成 2000px
}
```

---

### 三、断链分析

#### DOM 结构

```
.content (width: 100%, max-width: 1200px)
    ↓
.pagerouter (flex: 1, 普通块级)
    ↓
.index-container (display: flex, width: auto) ← Flex 容器
    ↓
轮播图 (width: 695px) ← 固定宽度锚点
```

#### 断链过程

```
1. .pagerouter 设置 flex: 1，想占满 .content 的剩余空间
2. 但 .pagerouter 内部的 .index-container 是 Flex 容器
3. Flex 容器的 width: auto = 被**子元素撑开**
4. 轮播图固定宽度 695px
5. .index-container 被撑开到 695px
6. .pagerouter 宽度被迫至少是 695px（被子容器限制）
7. 窗口宽度变化时，.pagerouter 宽度不变（被 695px 锚定）
8. .card-area 的 Grid 容器宽度不变
9. auto-fit 认为宽度始终够用，始终显示 2 列
```

#### 图解

```
┌─────────────────────────────────────┐
│  .pagerouter (flex: 1)              │  ← 想占满剩余空间
│  ┌───────────────────────────────┐  │
│  │  .index-container (flex)      │  │  ← 被内容撑开
│  │  ┌─────────────────────────┐  │  │
│  │  │  轮播图 (width: 695px)  │  │  │  ← 固定宽度锚点
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
       固定 695px，响应式链断开
```

---

### 四、解决方案

#### 修复固定宽度

```html
<!-- ❌ 之前 -->
<div style="width: 695px; margin: 0 auto">

<!-- ✅ 修复后 -->
<div style="width: 100%; max-width: 695px; margin: 0 auto">
```

#### 修复后的响应式链

```
窗口宽度变化
    ↓
.content (width: 100%, max-width: 1200px) ← 跟随窗口
    ↓
.pagerouter (flex: 1) ← 跟随 .content
    ↓
.index-container (display: flex) ← 跟随 .pagerouter
    ↓
轮播图 (width: 100%, max-width: 695px) ← 跟随 .index-container
    ↓
.card-area (width: 100%) ← 跟随 .index-container
    ↓
Grid auto-fit 生效！✅
```

---

### 五、核心学习点

1. **不是所有层级都受影响**：只有 Flex/Grid 容器会受子元素宽度影响，普通块级不会
2. **`flex: 1` 的限制**：只能占满父容器的"剩余空间"，但如果内部 Flex 容器被子元素限制，会被撑开
3. **固定宽度是锚点**：响应式链中任何一级的固定宽度都会成为最小宽度限制
4. **Flex 容器的特殊性**：`width: auto` 时收缩适应内容，而不是像普通块级那样占满父容器
5. **响应式的本质**：每一级都要说"我要跟随上级"，任何一级说"我要固定"，链路就断了

---

`★ Insight ─────────────────────────────────────`
- **响应式链的传递**：普通块级向下传递宽度，Flex/Grid 向上被宽度影响，方向相反
- **固定宽度的危害**：就像水管中的堵塞物，一旦出现，整个下游都失去响应能力
- **`flex: 1` 不是万能**：它能占满剩余空间，但无法突破内部容器的最小宽度限制
- **Grid auto-fit 的前提**：容器宽度必须能响应式变化，否则永远认为"空间够用"
`─────────────────────────────────────────────────`

---

**Created**: 2025-02-04
**Status**: ✅ 问题已解决

---

## 2025-02-04 - CSS Column 瀑布流布局实现

### 一、需求背景

博客首页需要展示文章列表，要求：
- **瀑布流布局**：不同高度的卡片错落排列
- **高度自适应**：卡片高度根据图片内容自动调整
- **完全响应式**：桌面 2 列、平板/手机 1 列
- **最小尺寸限制**：卡片不能太小，保证可读性

---

### 二、方案对比

| 方案 | 代码量 | 性能 | 顺序问题 | 推荐场景 |
|------|--------|------|----------|----------|
| **CSS Column** | ⭐⭐⭐⭐⭐ 极简 | ⭐⭐⭐⭐⭐ 好 | 垂直优先 | ✅ 快速实现、中小量数据 |
| **CSS Grid** | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐ 好 | 水平优先 | 规则网格 |
| **JS 绝对定位** | ⭐⭐ 复杂 | ⭐⭐⭐ 一般 | 水平优先 | 需要精确控制 |
| **虚拟瀑布流** | ⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 优秀 | 水平优先 | 大量数据 |

**选择方案**：CSS Column
- 纯 CSS 实现，无需 JavaScript 计算
- 代码简洁，易维护
- 性能好，浏览器原生渲染
- 对于博客场景（< 100 个元素）完全够用

---

### 三、核心技术原理

#### 1. CSS Column 布局机制

```scss
.card-area {
  column-count: 2;  // 分成 2 列
  column-gap: 10px; // 列间距
}
```

**元素流向**：从上到下，从左到右

```
第 1 列        第 2 列
┌───────┐     ┌───────┐
│  卡片1 │     │  卡片4 │
│  高200 │     │  高280 │
├───────┤     ├───────┤
│  卡片2 │     │  卡片5 │
│  高350 │     │  高180 │
├───────┤     ├───────┤
│  卡片3 │     │  卡片6 │
│  高220 │     │  高300 │
└───────┘     └───────┘
```

#### 2. 关键属性解析

| 属性 | 作用 | 必要性 |
|------|------|--------|
| `column-count: 2` | 创建 2 个列盒子 | ⭐ 必需 |
| `column-gap: 10px` | 列之间的间距 | ⭐ 必需 |
| `break-inside: avoid` | 防止元素被拆分到两列 | ⭐⭐⭐ 核心 |
| `display: inline-block` | 让元素参与列布局 | ⭐ 必需 |

**`break-inside: avoid` 的作用**：

```
没有 break-inside: avoid          有 break-inside: avoid
┌───────┐ ┌───────┐              ┌───────┐ ┌───────┐
│ 卡片上 │ │       │              │ 完整  │ │       │
├───────┤ │       │              │ 卡片  │ │       │
│ 卡片下 │ │       │              └───────┘ │       │
└───────┘ │       │              ┌───────┐ │       │
          │       │              │       │ │       │
❌ 元素被拆分了                  ✅ 元素保持完整
```

---

### 四、实现过程

#### 第一版：固定高度占位

```vue
<div class="card-item" :style="{ '--img-height': getRandomHeight() + 'px' }">
  <div class="img-area"></div>
</div>
```

```scss
.img-area {
  height: var(--img-height, 200px);  // 随机高度
  background: linear-gradient(...);
}
```

**问题**：未来有真实图片时，随机高度与实际不符

---

#### 第二版：真实图片自适应

```vue
<div class="img-area">
  <img :src="item.image" :alt="item.title" loading="lazy" />
</div>
```

```scss
.img-area {
  width: 100%;
  // ❌ 不设置固定高度

  img {
    width: 100%;
    height: auto;  // ✅ 高度自适应，保持图片原始比例
    display: block;
    object-fit: cover;
  }
}
```

**工作原理**：

```
1. 图片加载完成
   ↓
2. 浏览器读取图片原始尺寸（如 400x300）
   ↓
3. width: 100% → 填满容器宽度
   ↓
4. height: auto → 按比例计算高度
   ↓
5. img 撑开 .img-area
   ↓
6. .img-area 撑开 .card-item
   ↓
7. Column 自动重新布局
```

---

### 五、完整代码实现

#### HTML 结构

```vue
<div class="index-container">
  <!-- 轮播图区域 -->
  <div class="carousel-wrapper">
    <CarouselSwiper :items="carouselItems" :autoplay-delay="5000" />
  </div>

  <!-- 卡片列表 -->
  <div class="card-area">
    <div class="card-item" v-for="item in mockCards" :key="item.id">
      <div class="img-area">
        <img :src="item.image" :alt="item.title" loading="lazy" />
      </div>
      <div class="text-area">
        <h3 class="text-ellipsis">{{ item.title }}</h3>
        <p class="text-clamp-3">{{ item.content }}</p>
      </div>
    </div>
  </div>
</div>
```

#### 样式实现

```scss
.index-container {
  width: 100%;
  display: flex;
  flex-direction: column;  // 纵向排列：轮播图在上，卡片区在下

  .card-area {
    width: 100%;
    // 瀑布流核心
    column-count: 2;        // 分成 2 列
    column-gap: 10px;       // 列间距

    .card-item {
      width: 100%;
      min-width: 280px;     // 最小宽度限制
      min-height: 200px;    // 最小高度限制
      break-inside: avoid;  // 防止跨列断裂
      display: inline-block;
      margin-bottom: 10px;

      .img-area {
        width: 100%;

        img {
          width: 100%;
          height: auto;  // 关键：高度自适应
          object-fit: cover;
        }
      }
    }
  }
}

// 响应式：不同屏幕调整列数
@media (max-width: 768px) {
  .index-container .card-area {
    column-count: 1;  // 手机单列
  }
}
```

---

### 六、层级设计原则

#### 正确的层级职责

```
index-container (Flex 纵向)
    ├─ carousel-wrapper (普通流)
    └─ card-area (Column 横向)
           └─ card-item (参与列布局)
```

| 元素 | 职责 | 布局方式 |
|------|------|----------|
| `index-container` | 容器编排 | Flex 纵向 |
| `carousel-wrapper` | 轮播展示 | 默认流 |
| `card-area` | 瀑布流 | Column 多列 |

**为什么不在 `index-container` 上开启 column？**

```scss
// ❌ 错误：轮播图也会被分列
.index-container {
  column-count: 2;
}

// ✅ 正确：只有卡片区参与瀑布流
.card-area {
  column-count: 2;
}
```

---

### 七、响应式实现

```scss
// 桌面：2 列
.card-area {
  column-count: 2;
}

// 平板/手机：1 列
@media (max-width: 768px) {
  .card-area {
    column-count: 1;
  }
}
```

**响应式原理**：

```
桌面 (1200px)              手机 (375px)
┌────────┬────────┐        ┌─────────────┐
│   1    │   4    │        │      1      │
├────────┼────────┤        ├─────────────┤
│   2    │   5    │        │      2      │
└────────┴────────┘        └─────────────┘
column-count: 2           column-count: 1
```

---

### 八、遇到的问题与解决

#### 问题 1：aspectRatio 传入无效

**现象**：给 ImageCard 组件传不同的 `aspectRatio`，但高度不变

**原因**：`.card-item` 设置了固定高度 `height: 250px`，覆盖了 `aspect-ratio`

**解决**：移除固定高度

```scss
// ❌ 之前
.card-item {
  height: 250px;
}

// ✅ 修复后
.card-item {
  // 移除固定高度，让内容撑开
}
```

---

#### 问题 2：本地图片路径加载失败

**现象**：`src="../assets/img/img1.jpg"` 图片不显示

**原因**：`assets/` 目录需要 Vite 处理，不能用相对路径

**解决**：将图片移到 `public/` 目录

```vue
<!-- ❌ 之前 -->
<ImageCard src="../assets/img/img1.jpg" />

<!-- ✅ 修复后 -->
<ImageCard src="/image/img1.jpg" />
```

**Nuxt 资源路径规则**：

| 位置 | 访问方式 | 用途 |
|------|----------|------|
| `public/` | `/image/img1.jpg` | 静态文件，直接访问 |
| `assets/` | `~/assets/img1.jpg` | 需要构建处理 |

---

#### 问题 3：随机高度无法适应真实图片

**现象**：用 `getRandomHeight()` 模拟不同高度，但未来有真实图片时会失效

**原因**：随机高度是假数据，与实际图片尺寸无关

**解决**：使用真实图片 + `height: auto`

```vue
<!-- ❌ 之前 -->
<div :style="{ '--img-height': getRandomHeight() + 'px' }">
  <div class="img-area"></div>
</div>

<!-- ✅ 修复后 -->
<div class="img-area">
  <img :src="item.image" loading="lazy" />
</div>
```

---

### 九、CSS Column 的优缺点

#### 优点

✅ **实现简单**：只需 3 个 CSS 属性
✅ **性能好**：浏览器原生渲染，无需 JS 计算
✅ **自动响应式**：修改 `column-count` 即可
✅ **内容自适应**：卡片高度自动跟随内容

#### 缺点

⚠️ **顺序问题**：元素按"先填满第 1 列，再填第 2 列"排列，不是水平顺序

```
CSS Column（垂直优先）        理想瀑布流（水平优先）
1   4   7                      1   2   3
2   5   8                      4   5   6
3   6   9                      7   8   9
```

⚠️ **不适合大量数据**：所有元素都在 DOM 中，无虚拟滚动

#### 适用场景

| 场景 | 是否适合 |
|------|----------|
| 博客文章列表 | ✅ 适合 |
| 图片展示 | ✅ 适合 |
| 电商商品 | ✅ 适合 |
| 需要水平顺序 | ❌ 不适合，用 JS 方案 |
| 大量数据 (>500) | ❌ 不适合，用虚拟滚动 |

---

### 十、核心学习点

1. **CSS Column 的本质**：把容器变成多列报纸排版，子元素按垂直优先顺序填充
2. **`break-inside` 的必要性**：类似打印的"避免分页"，确保卡片不被列边界截断
3. **内容自适应机制**：`height: auto` + 图片原始比例 → 自动撑开容器
4. **层级职责分离**：外层 Flex 控制整体，内层 Column 控制局部
5. **响应式的简洁性**：只需修改 `column-count`，比重新计算 Grid 简单
6. **`object-fit: cover`**：保持图片比例，多余部分裁剪
7. **`loading="lazy"`**：瀑布流必备，避免一次性加载所有图片

---

### 十一、未来优化方向

#### 1. 添加骨架屏

```vue
<div class="card-item" v-if="loading">
  <div class="skeleton"></div>
</div>
```

#### 2. 图片加载优化

```vue
<img
  :src="item.image"
  :width="400"
  :height="item.height"
  loading="lazy"
  decoding="async"
/>
```

#### 3. 大数据量时切换到虚拟瀑布流

使用 `vue-virtual-waterfall` 等库实现虚拟滚动。

---

`★ Insight ─────────────────────────────────────`
- **CSS Column vs Grid**：Column 的元素是"先填满第 1 列，再填第 2 列"，Grid dense 则会智能填充空位但支持不完善
- **内容驱动布局**：Column 和 Flexbox 都是内容驱动的，容器高度自动根据子元素调整
- **最小宽度的意义**：`minmax(300px, 1fr)` 确保卡片不会太窄，同时在不同屏幕下自动调整列数
- **性能优先**：纯 CSS 方案无需 JS 计算位置，浏览器原生渲染，性能最佳
`─────────────────────────────────────────────────`

---

**Created**: 2025-02-04
**Status**: ✅ 完成并测试

---

## 2025-02-04 - TipTap 编辑器 SSR 构建错误修复

### 一、问题背景

在 Nuxt 4 项目中集成 TipTap 富文本编辑器，启动开发服务器后访问 `/admin` 页面报错：

#### 错误信息

```
ERROR  [request error] [unhandled] [GET] http://localhost:3000/_nuxt/
```

```
Error: Codegen node is missing for element/if/for node. Apply appropriate transforms first.
```

---

### 二、问题分析

#### 问题 1：TipTap SSR 构建失败（404 错误）

**根本原因**：
- TipTap 是**纯客户端库**，依赖浏览器 DOM 环境
- Nuxt 默认会对所有依赖进行 SSR 构建
- TipTap 在服务端构建时失败，导致客户端 chunk 加载失败（404）

**错误流程**：

```
Nuxt 构建 → 尝试 SSR 处理 TipTap → 失败
    ↓
客户端请求 /_nuxt/ chunk
    ↓
服务端返回 404（chunk 不存在）
```

#### 问题 2：Suspense fallback 语法错误（Codegen 错误）

**错误代码**：
```vue
<template>
  <div>
    <MarkDownEditor v-model="content" />
    <template #fallback>  <!-- ❌ 语法错误 -->
      <p>正在加载编辑器...</p>
    </template>
  </div>
</template>
```

**根本原因**：
- `<template #fallback>` 必须是 `<Suspense>` 或 `<ClientOnly>` 组件的直接子元素
- 不能作为普通 `<div>` 的子元素

**Vue 编译器报错含义**：
```
"Codegen node is missing" → 编译器在生成渲染函数时，
发现某个节点（这里的 #fallback）没有被正确的转换器处理
```

---

### 三、解决方案

#### 解决方案 1：配置 SSR 跳过 TipTap

**修改 `nuxt.config.ts`**：

```typescript
export default defineNuxtConfig({
  // 新增：跳过 TipTap 相关包的 SSR 处理
  ssr: {
    noExternal: [
      '@tiptap/vue-3',
      '@tiptap/starter-kit',
      '@tiptap/extension-placeholder',
      '@tiptap/extension-link',
      '@tiptap/extension-image',
      '@tiptap/extension-code-block-lowlight',
      '@tiptap/pm',
      'lowlight',
    ],
  },
  vite: {
    optimizeDeps: {
      noDiscovery: true,
      // 新增：明确包含 TipTap 用于客户端预构建
      include: [
        '@tiptap/vue-3',
        '@tiptap/starter-kit',
        '@tiptap/extension-placeholder',
        '@tiptap/extension-link',
        '@tiptap/extension-image',
        '@tiptap/extension-code-block-lowlight',
        'lowlight',
      ],
    },
  },
})
```

**配置说明**：

| 配置项 | 作用 | 必要性 |
|--------|------|--------|
| `ssr.noExternal` | 告诉 Nuxt 这些包**不参与 SSR**，直接标记为 external | ⭐⭐⭐ 核心 |
| `vite.optimizeDeps.include` | 明确告诉 Vite 这些包需要在客户端预构建 | ⭐⭐ 推荐 |

---

#### 解决方案 2：修复 Suspense fallback 语法

**修复 `app/pages/admin/index.vue`**：

```vue
<!-- ❌ 错误用法 -->
<template>
  <div>
    <MarkDownEditor v-model="content" />
    <template #fallback>
      <p>正在加载编辑器...</p>
    </template>
  </div>
</template>

<!-- ✅ 正确用法：直接使用（.client.vue 已处理） -->
<template>
  <div>
    <MarkDownEditor v-model="content" />
  </div>
</template>

<!-- 或者：使用 ClientOnly 包裹 -->
<template>
  <div>
    <ClientOnly>
      <MarkDownEditor v-model="content" />
      <template #fallback>
        <p>正在加载编辑器...</p>
      </template>
    </ClientOnly>
  </div>
</template>
```

---

### 四、工作原理

#### 1. SSR 构建流程

```
┌─────────────────────────────────────────────────────┐
│  Nuxt 构建流程                                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  普通包（如 lodash）                                │
│  ↓                                                  │
│  SSR 构建 → 生成服务端 bundle                       │
│  ↓                                                  │
│  客户端构建 → 生成客户端 bundle                      │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  TipTap（配置 ssr.noExternal 后）                   │
│  ↓                                                  │
│  跳过 SSR → 不生成服务端 bundle                      │
│  ↓                                                  │
│  客户端构建 → 生成客户端 bundle                      │
│  ↓                                                  │
│  .client.vue 组件 → 仅在客户端 hydration 时加载      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 2. `.client.vue` 后缀的作用

| 特性 | `.client.vue` | 普通 `.vue` |
|------|--------------|-------------|
| **SSR 渲染** | ❌ 不渲染 | ✅ 渲染 |
| ** hydration** | 客户端加载 | 客户端激活 |
| **用途** | 纯客户端组件 | 通用组件 |
| **加载方式** | 异步组件 | 同步组件 |

**代码层面**：

```typescript
// Nuxt 自动将 .client.vue 组件转换为：
const MarkDownEditor = defineAsyncComponent(() =>
  import('./components/MarkDownEditor.client.vue')
)
```

---

### 五、纯客户端库的处理清单

在 Nuxt 4 中使用纯客户端库时，需要检查以下清单：

| 检查项 | TipTap 情况 | 处理方式 |
|--------|------------|----------|
| **是否依赖 DOM** | ✅ 是（ProseMirror） | 配置 `ssr.noExternal` |
| **组件后缀** | ✅ `.client.vue` | 已处理 |
| **Vite 优化配置** | ❌ 未配置 | 添加 `optimizeDeps.include` |
| **fallback 使用** | ❌ 语法错误 | 移除或用 `ClientOnly` |

**其他常见的纯客户端库**：

| 库名 | 用途 | 需要配置 |
|------|------|----------|
| `@tiptap/*` | 富文本编辑器 | ✅ `ssr.noExternal` |
| `swiper` | 轮播图 | ⚠️ 通常需要 |
| `canvas-confetti` | 庆祝动画 | ✅ `ssr.noExternal` |
| `monaco-editor` | 代码编辑器 | ✅ `ssr.noExternal` |

---

### 六、核心学习点

1. **`ssr.noExternal` 的本质**：告诉 Nuxt "这个包不要尝试 SSR，直接当作客户端包处理"
2. **`.client.vue` vs `ClientOnly`**：
   - `.client.vue`：组件级别的声明，整个组件只在客户端加载
   - `ClientOnly`：使用级别的包裹，可以有 fallback
3. **Vue 插槽的位置限制**：具名插槽必须在支持插槽的组件内部，不能随意放置
4. **404 错误的连锁反应**：SSR 构建失败 → chunk 不存在 → 客户端请求 404
5. **Vite optimizeDeps 的作用**：预构建能提升开发体验，但对于纯客户端库不是必需的

---

`★ Insight ─────────────────────────────────────`
- **TipTap 的 DOM 依赖**：TipTap 基于 ProseMirror，ProseMirror 直接操作浏览器 DOM，这是无法在 Node.js 环境中模拟的
- **配置的级联关系**：`ssr.noExternal` 解决构建问题，`optimizeDeps.include` 优化开发体验，两者配合但前者是必需的
- **错误信息的解读**：404 表示资源不存在，Codegen 错误表示模板编译失败，两者是不同层级的问题
`─────────────────────────────────────────────────`

---

### 七、验证步骤

1. **重启开发服务器**：
   ```bash
   pnpm dev
   ```

2. **访问 `/admin` 页面**：
   - ✅ 页面正常加载
   - ✅ 编辑器显示
   - ✅ 工具栏功能正常

3. **检查控制台**：
   - ✅ 无 404 错误
   - ✅ 无 Codegen 错误

---

**Created**: 2025-02-04
**Status**: ✅ 问题已解决

---

## 2025-02-07 - TypeScript 项目路径别名配置：双重配置原则

### 一、问题背景

在 Nuxt 4 + TypeScript 项目中配置路径别名 `@app` 时，发现仅在 `tsconfig.json` 中配置后，运行时仍然报错找不到模块。

#### 错误信息

```
Cannot find package '@app/api/posts.api' imported from 'D:/gitProject/nuxt-4/myBlog/app/pages/index.vue'
```

---

### 二、核心原理：双重配置的必要性

#### 两个配置文件的不同职责

| 配置文件 | 作用范围 | 生效时机 | 职责 |
|---------|---------|----------|------|
| **tsconfig.json** | TypeScript 编译器 | 编译时/IDE 智能提示 | 类型检查、路径映射、跳转定义 |
| **框架配置 (nuxt.config.ts)** | 运行时模块解析 | 运行时/构建时 | 实际文件加载、Vite/Webpack 解析 |

#### 一句话总结

```
tsconfig.json     → 告诉编辑器"这个路径指向哪里"
框架配置 (nuxt.config.ts)  → 告诉运行时"这个路径指向哪里"
```

---

### 三、配置示例

#### Nuxt 4 项目

**1. tsconfig.json（项目根目录）**

```json
{
  "extends": "./.nuxt/tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@app/*": ["./app/*"],
      "@server/*": ["./server/*"]
    }
  }
}
```

**2. nuxt.config.ts**

```typescript
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  // 前端路径别名（app 目录）
  alias: {
    '@app': fileURLToPath(new URL('./app', import.meta.url)),
  },
  // Nitro 服务器配置
  nitro: {
    // Server 端路径别名
    alias: {
      '@server': fileURLToPath(new URL('./server', import.meta.url)),
    },
  },
})
```

---

### 四、配置缺失的后果

#### 只配置 tsconfig.json

| 场景 | 结果 |
|------|------|
| IDE 智能提示 | ✅ 正常工作 |
| 类型检查 | ✅ 正常工作 |
| 跳转定义 | ✅ 正常工作 |
| **运行时加载** | ❌ **报错找不到模块** |

#### 只配置框架 config

| 场景 | 结果 |
|------|------|
| IDE 智能提示 | ❌ 无法识别 |
| 类型检查 | ❌ 报错 |
| 跳转定义 | ❌ 无法跳转 |
| **运行时加载** | ✅ 正常工作 |

---

### 五、为什么需要两份配置？

#### TypeScript 编译器的独立性

```
TypeScript 编译器（tsc）
    ↓
只读取 tsconfig.json
    ↓
不关心你用什么框架（Nuxt/Vite/Webpack）
    ↓
只负责类型检查和编译
```

#### 框架构建工具的独立性

```
Vite/Webpack（构建工具）
    ↓
只读取框架配置文件
    ↓
不关心 tsconfig.json（除非特殊配置）
    ↓
只负责模块解析和打包
```

#### 两者的关系

```
开发流程：
┌─────────────────┐
│  编写代码        │
│  import '@app/  │
│       api'      │
└────────┬────────┘
         ↓
    ┌──────────────────────────┐
    │                          │
    ↓                          ↓
┌─────────────┐          ┌─────────────┐
│ TypeScript  │          │   Vite      │
│ 编译器       │          │   构建      │
│             │          │             │
│ tsconfig    │          │ nuxt.config │
│ paths 配置   │          │ alias 配置   │
└─────────────┘          └─────────────┘
    ↓                          ↓
类型检查通过               运行时正常加载
```

---

### 六、其他框架的配置方式

#### Vite 项目

**tsconfig.json**：
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**vite.config.ts**：
```typescript
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

#### Webpack 项目

**tsconfig.json**：
```json
{
  "compilerOptions": {
    "paths": {
      "@src/*": ["./src/*"]
    }
  }
}
```

**webpack.config.js**：
```javascript
const path = require('path')

module.exports = {
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src')
    }
  }
}
```

---

### 七、核心学习点

1. **tsconfig.json ≠ 运行时配置**：它只影响 TypeScript 编译器和 IDE，不影响实际模块加载
2. **框架配置是必需的**：无论是否使用 TypeScript，都需要在框架配置中设置路径别名
3. **fileURLToPath 的作用**：将 `file://` 协议的 URL 转换为操作系统的绝对路径，确保跨平台兼容性
4. **路径一致性原则**：tsconfig 和框架配置中的路径必须保持一致，否则会出现"开发时正常、运行时报错"的情况

---

### 八、调试清单

当路径别名不工作时，按以下顺序检查：

| 检查项 | 命令/方式 | 预期结果 |
|--------|----------|----------|
| **1. tsconfig 配置** | 查看 `compilerOptions.paths` | ✅ 路径映射存在 |
| **2. 框架配置** | 查看 `nuxt.config.ts` 或 `vite.config.ts` | ✅ alias 配置存在 |
| **3. 路径一致性** | 对比两份配置的路径 | ✅ 完全一致 |
| **4. 重启服务器** | 修改配置后重启 | ✅ 配置生效 |
| **5. IDE 缓存** | 重新加载 TS 服务器 | ✅ 智能提示正常 |

---

`★ Insight ─────────────────────────────────────`
- **配置分离原则**：TypeScript 配置服务于类型系统，框架配置服务于运行时，两者职责分离但需要保持一致
- **fileURLToPath 的必要性**：直接使用字符串路径（如 `'./app'`）在不同操作系统下可能出问题，使用 `fileURLToPath` 确保跨平台兼容
- **IDE vs 运行时**：IDE 只看 tsconfig，运行时只看框架配置，两边都要配置才能实现完整的开发体验
`─────────────────────────────────────────────────`

---

**Created**: 2025-02-07
**Status**: ✅ 记录完成

---

## 2025-02-07 - TipTap 编辑器刷新后空白：父子组件 Loading 方案

### 一、问题背景

TipTap 富文本编辑器页面刷新后，编辑器组件消失，页面显示空白区域。即使添加 loading 占位符，也无法在正确的时机显示。

#### 错误现象

- 刷新页面后看到空白区域
- 在弱网测试下（3G），loading 始终不显示
- 编辑器创建完成后 loading 才出现，但立即消失

---

### 二、问题分析

#### 尝试方案 1：子组件内部 Loading（失败）

**实现代码**：
```vue
<!-- MarkDownEditor.client.vue -->
<template>
  <div v-if="!editor" class="editor-loading">
    <div class="loading-spinner"></div>
    <p>编辑器加载中...</p>
  </div>
</template>

<script setup>
const isEditorReady = ref(false)

const editor = useEditor({
  onCreate: () => {
    isEditorReady.value = true
  }
})
</script>
```

**失败原因**：
1. `useEditor` 返回的 `editor` ref 在组件首次渲染时可能还没有正确的响应式追踪
2. `v-if="!editor"` 条件判断的时机不可靠
3. `isEditorReady` 虽然能工作，但 loading 在编辑器初始化完成后才消失，时序不对

#### 尝试方案 2：人为延迟显示（失败）

```typescript
const showLoading = ref(true)

watch(
  () => editor.value,
  (ed) => {
    if (ed && !editorReadyTime.value) {
      editorReadyTime.value = Date.now()
      setTimeout(() => {
        showLoading.value = false
      }, 800)
    }
  }
)
```

**失败原因**：人为延迟治标不治本，且在快速网络下用户体验差。

---

### 三、最终方案：父子组件通信

#### 核心思路

利用父子组件的挂载时序差异：
- 父组件先挂载 → 立即显示 loading
- 子组件后挂载 → 初始化编辑器（需要时间）
- 编辑器就绪 → 子组件通知父组件
- 父组件隐藏 loading

#### 执行流程

```
页面刷新
    ↓
父组件 setup → isLoadingEditor = true → 显示 loading ✅
    ↓
父组件渲染，子组件开始挂载（v-show 确保子组件渲染）
    ↓
子组件 mounted（编辑器还在初始化中）→ loading 仍然显示 ✅
    ↓
[编辑器初始化中... 弱网时可能需要几秒] → loading 覆盖空白期 ✅
    ↓
编辑器 onCreate → emit('ready') → 父组件收到
    ↓
父组件 → isLoadingEditor = false → 隐藏 loading，显示编辑器 ✅
```

---

### 四、实现代码

#### 父组件 `editor.vue`

```vue
<template>
  <div style="min-height: 500px;">
    <!-- Loading 占位 -->
    <div v-show="isLoadingEditor" class="editor-loading-wrapper">
      <div class="loading-spinner"></div>
      <p>编辑器加载中...</p>
    </div>

    <!-- 编辑器组件 -->
    <MarkDownEditor v-show="!isLoadingEditor" v-model="form.content" @ready="onEditorReady" />
  </div>
</template>

<script setup lang="ts">
const form = ref({
  title: '',
  content: '',
})

// 编辑器 loading 状态
const isLoadingEditor = ref(true)

// 编辑器准备就绪
const onEditorReady = () => {
  isLoadingEditor.value = false
}

definePageMeta({
  layout: 'admin',
})
</script>

<style lang="scss" scoped>
.editor-loading-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  gap: 1rem;

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color, #e0e0e0);
    border-top-color: var(--primary-color, #1890ff);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  p {
    font-size: 14px;
    color: var(--text-secondary, #666);
    margin: 0;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
```

#### 子组件 `MarkDownEditor.client.vue`

```vue
<script setup lang="ts">
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'ready': []  // 新增 ready 事件
}>()

const editor = useEditor({
  content: '',
  extensions: [...],
  onCreate: ({ editor: ed }) => {
    // 通知父组件编辑器已就绪
    emit('ready')  // 关键：编辑器创建完成后通知父组件

    // 设置初始内容
    const initialValue = props.modelValue || ''
    if (initialValue) {
      ed.commands.setContent(initialValue)
    }

    checkAndShowDraftOption()
  },
})
</script>
```

---

### 五、关键设计点

#### 1. 使用 `v-show` 而非 `v-if`

```vue
<!-- ❌ 错误：v-if 会导致子组件不渲染 -->
<div v-if="isLoadingEditor" class="loading">...</div>
<MarkDownEditor v-else v-model="content" @ready="onEditorReady" />

<!-- ✅ 正确：v-show 让子组件始终渲染 -->
<div v-show="isLoadingEditor" class="loading">...</div>
<MarkDownEditor v-show="!isLoadingEditor" v-model="content" @ready="onEditorReady" />
```

**原因**：
- `v-if="false"` 时子组件不存在于 DOM，无法触发 `onCreate`
- `v-show` 只是视觉隐藏（`display: none`），子组件仍然正常渲染

#### 2. 父子组件挂载时序

| 时机 | 父组件状态 | 子组件状态 | 用户看到 |
|------|----------|----------|----------|
| 页面刷新 | setup 执行 | 未开始 | - |
| 父组件渲染 | `isLoadingEditor = true` | 未挂载 | loading ✅ |
| 子组件挂载 | 等待事件 | mounted，编辑器初始化中 | loading ✅ |
| 编辑器就绪 | 等待事件 | onCreate 触发 | loading ✅ |
| 收到事件 | `isLoadingEditor = false` | 完成 | 编辑器 ✅ |

#### 3. 时序保证

```
父组件 setup 执行
    ↓
isLoadingEditor = ref(true)  ← 立即响应式更新
    ↓
模板渲染，v-show="true"      ← loading 立即可见
    ↓
子组件渲染、挂载
    ↓
编辑器初始化（异步）        ← 用户看到 loading，无空白
    ↓
onCreate 触发
    ↓
emit('ready')
    ↓
父组件 onEditorReady
    ↓
isLoadingEditor.value = false ← loading 消失，编辑器显示
```

---

### 六、核心学习点

1. **`v-if` vs `v-show` 的选择**：
   - `v-if`：条件渲染，false 时元素不存在于 DOM
   - `v-show`：条件显示，false 时元素仍在 DOM，只是 `display: none`
   - 需要子组件触发事件时，必须用 `v-show`

2. **Vue 3 父子组件挂载顺序**：
   ```
   父组件 beforeMount
   父组件模板渲染，遇到子组件
   子组件 setup
   子组件 beforeMount
   子组件 mounted  ← 先触发
   父组件 mounted  ← 后触发
   ```

3. **响应式更新的时机**：
   - `ref(true)` 在 setup 执行时立即响应式更新
   - 模板中的 `v-show` 会立即反映这个变化
   - 不需要等待 `onMounted` 或其他生命周期

4. **父子组件通信的优势**：
   - 职责分离：父组件控制 loading，子组件专注编辑器
   - 时序清晰：利用组件挂载顺序，loading 覆盖初始化空白期
   - 易于维护：各自独立，逻辑清晰

5. **TipTap 编辑器初始化时机**：
   - `useEditor` 同步调用，但编辑器实际初始化是异步的
   - `onCreate` 回调在编辑器 DOM 完全渲染后触发
   - 弱网环境下初始化时间可能长达几秒

---

### 七、其他场景应用

这种父子组件 Loading 方案适用于：

| 场景 | 适用性 |
|------|--------|
| 大型图表库（ECharts） | ✅ 适合 |
| 富文本编辑器（TipTap、Quill） | ✅ 适合 |
| 地图组件（Leaflet、Mapbox） | ✅ 适合 |
| 视频播放器 | ✅ 适合 |
| 轻量组件（按钮、输入框） | ❌ 过度设计 |

---

`★ Insight ─────────────────────────────────────`
- **组件挂载顺序的利用**：父子组件的挂载时序差异是天然的加载状态管理机制
- **`v-show` 的必要性**：当子组件需要触发事件时，必须确保其在 DOM 中存在
- **编辑器初始化的异步性**：`useEditor` 虽然是同步调用，但实际初始化（DOM 绑定、扩展加载）是异步的
- **Loading 的真正作用**：不是装饰，而是覆盖异步初始化期间的空白，提升用户体验
`─────────────────────────────────────────────────`

---

**Created**: 2025-02-07
**Status**: ✅ 问题已解决

---

## 2025-02-10 - TipTap 编辑器 Base64 图片恢复失败：JSON vs HTML 序列化

### 一、问题背景

在 TipTap 富文本编辑器中插入 Base64 图片后，刷新页面并点击"恢复草稿"，图片丢失无法恢复，但文字内容能正常恢复。

#### 错误现象

- 插入 Base64 图片后刷新页面
- 点击"恢复草稿"按钮
- 文字内容正常恢复
- **图片完全消失**

---

### 二、问题排查过程

#### 排查方向 1：localStorage 容量限制（❌ 排除）

**假设**：Base64 图片太大，超出 localStorage 容量

**验证**：
```
单张 1MB 图片 → Base64 后 ~1.3MB
localStorage 限制：5-10MB
✅ 容量足够，不是存储问题
```

**结论**：单张小图不会超出限制，容量问题排除

---

#### 排查方向 2：Markdown 扩展过滤图片（❌ 排除）

**假设**：Markdown 扩展在 `setContent()` 时将 HTML 转为 Markdown 再转回 HTML，Base64 data URI 被过滤

**验证**：临时禁用 Markdown 扩展后测试

**结果**：禁用后图片依然无法恢复

**结论**：不是 Markdown 扩展的问题

---

#### 排查方向 3：缺少基础 Image 扩展（❌ 部分正确）

**发现**：编辑器只配置了 `ImageResize`，没有配置基础的 `Image` 扩展

```typescript
extensions: [
  // Image,  ← 缺少基础扩展！
  ImageResize.configure({ inline: true }),
]
```

**修复**：添加 `Image` 扩展

```typescript
extensions: [
  Image,  // ← 添加基础 Image 扩展
  ImageResize.configure({ inline: true }),
]
```

**结果**：添加后扩展列表显示 `'image'` 和 `'imageResize'` 都已加载，但图片依然无法恢复

**结论**：Image 扩展是必需的，但不是根本原因

---

#### 排查方向 4：HTML 解析器问题（✅ 确认）

**调试日志**：
```
1. localStorage 原始数据包含 <img>: true ✓
2. JSON.parse 后包含 <img>: true ✓
3. 恢复后编辑器 HTML 包含 <img>: false ✗
4. JSON 中是否有 image 节点: false ✗
```

**关键发现**：数据流在 `setContent()` 调用后断裂

```
localStorage → JSON.parse → 包含图片 ✓
    ↓
editor.commands.setContent(html)
    ↓
HTML 解析器处理
    ↓
编辑器内容 → 图片丢失 ✗
```

**根因**：TipTap 的 HTML 解析器在处理包含超长 Base64 data URI 的 `<img>` 标签时失败，图片节点被丢弃。

---

### 三、最终解决方案

#### 核心思路

不使用 HTML 格式存储，改用 TipTap 的**原生 JSON 格式**：

| 方案 | 存储格式 | 恢复方式 | 问题 |
|------|----------|----------|------|
| ❌ 之前 | `getHTML()` 返回 HTML 字符串 | `setContent(html)` 需要 HTML 解析 | Base64 图片解析失败 |
| ✅ 现在 | `getJSON()` 返回 JSON 对象 | `setContent(json)` 直接使用 | 图片完整保留 |

#### 实现代码

**修改 `useAutoSave` 的 `getValue` 和 `setValue`**：

```typescript
// ❌ 之前：使用 HTML 格式
const autoSave = useAutoSave<string>({
  getValue: () => editor.value?.getHTML() || '',
  setValue: (value) => {
    editor.value?.commands.setContent(value)
  },
})

// ✅ 现在：使用 JSON 格式
const autoSave = useAutoSave<any>({
  getValue: () => {
    if (!editor.value) return ''
    return editor.value.getJSON()  // ← TipTap 原生格式
  },
  setValue: (value) => {
    if (!editor.value || !value) return
    editor.value.commands.setContent(value, false)  // ← 直接使用 JSON
  },
})
```

#### JSON 格式示例

**存储的数据结构**：
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "文字内容"
        },
        {
          "type": "image",
          "attrs": {
            "src": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCE...",
            "alt": "图片描述",
            "width": 800,
            "height": 600
          }
        }
      ]
    }
  ]
}
```

---

### 四、为什么 JSON 格式能解决问题？

#### 1. 避免 HTML 解析

```
HTML 格式路径：
getHTML() → 生成 HTML 字符串 → localStorage
    ↓
恢复时：localStorage → HTML 字符串 → HTML 解析器 → TipTap 节点
    ↓
问题：HTML 解析器无法正确处理超长 Base64 data URI

JSON 格式路径：
getJSON() → 生成 JSON 对象 → localStorage
    ↓
恢复时：localStorage → JSON 对象 → TipTap 节点
    ↓
解决：直接使用 TipTap 原生格式，无需解析
```

#### 2. 数据完整性

| 格式 | Base64 图片处理 |
|------|-----------------|
| **HTML** | 字符串形式，依赖 HTML 解析器 |
| **JSON** | 对象属性形式，直接读取 `attrs.src` |

---

### 五、完整代码修改

#### `app/components/MarkDownEditor.client.vue`

```typescript
// 自动保存功能 - 使用 JSON 格式
const autoSave = useAutoSave<any>({
  storageKey: props.storageKey || 'markdown-editor-draft',
  getValue: () => {
    if (!editor.value) return ''
    return editor.value.getJSON()
  },
  setValue: (value) => {
    if (!editor.value || !value) return
    editor.value.commands.setContent(value, false)
  },
  delay: 1000,
  isEmpty: (json) => {
    if (!json || typeof json !== 'object') return true
    if (json.type === 'doc' && (!json.content || json.content.length === 0)) return true
    if (json.type === 'doc' && json.content.length === 1) {
      const first = json.content[0]
      if (first.type === 'paragraph' && (!first.content || first.content.length === 0)) return true
    }
    return false
  },
})

// 检查草稿
const checkAndShowDraftOption = () => {
  if (props.modelValue) return
  if (editor.value && !editor.value.isEmpty) return

  const draft = autoSave.getDraft()
  if (draft && typeof draft === 'object' && draft.type === 'doc') {
    showRestoreDraft.value = true
  }
}

// 页面卸载时保存
onBeforeUnmount(() => {
  if (editor.value) {
    const json = editor.value.getJSON()
    const key = props.storageKey || 'markdown-editor-draft'
    localStorage.setItem(key, JSON.stringify(json))
  }
  editor.value?.destroy()
})
```

---

### 六、核心学习点

1. **`getHTML()` vs `getJSON()` 的本质区别**：
   - `getHTML()`：序列化为 HTML 字符串，需要解析器反序列化
   - `getJSON()`：返回 TipTap 的原生文档结构，可直接使用

2. **序列化不对称性**：
   - 某些数据的序列化和反序列化不是完美的逆运算
   - Base64 data URI 在 HTML 解析过程中可能被修改或丢弃

3. **编辑器原生格式的优势**：
   - 完整保留所有节点属性
   - 避免第三方解析器的限制
   - 性能更好（无需字符串解析）

4. **存储格式选择原则**：
   - 需要跨编辑器兼容 → HTML
   - 需要完整数据保留 → JSON
   - 需要人类可读 → HTML
   - 需要最小体积 → JSON

---

### 七、其他相关发现

#### 必需的扩展配置

确保编辑器同时配置基础扩展和增强扩展：

```typescript
extensions: [
  Image,          // ← 基础扩展：解析 HTML 中的 <img> 标签
  ImageResize,    // ← 增强扩展：提供调整大小功能
]
```

#### 扩展加载顺序验证

```typescript
// 检查扩展是否正确加载
const extensions = editor.value.extensionManager.extensions.map(e => e.name)
// 应包含：'image', 'imageResize', 'markdown' 等
```

---

`★ Insight ─────────────────────────────────────`
- **HTML 解析器的局限性**：通用 HTML 解析器无法完美处理所有边界情况（如超长 data URI）
- **原生格式的可靠性**：使用编辑器的原生序列化格式（JSON）比通用格式（HTML）更可靠
- **数据完整性的权衡**：JSON 格式虽然人类不可读，但能完整保留所有数据，对于复杂内容（如 Base64 图片）是更好的选择
`─────────────────────────────────────────────────`

---

**Created**: 2025-02-10
**Status**: ✅ 问题已解决

---