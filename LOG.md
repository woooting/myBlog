# 项目日志

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
