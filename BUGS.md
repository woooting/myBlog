# Bug 修复记录

## Nitro 错误处理：hook vs onError 的区别

### 问题背景
在 Nitro 中有两种处理错误的方式，容易混淆导致选错。

### 两者的区别

| 方式 | 用途 | 适用场景 |
|------|------|------------------|
| `nitroApp.hooks.hook('error')` | **观察**错误（监听器模式） | 日志记录、上报监控、清理资源等副作用 |
| `nitroApp.h3App.options.onError` | **处理**错误（处理器模式） | 修改错误响应格式、完全接管响应 |

### 核心差异

**`hooks.hook('error')` - 观察者模式**
```typescript
// ❌ 不适合在这里修改响应
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', async (error, { event }) => {
    // ✅ 适合做这些事
    console.error('[Error]', error)
    await sentryCapture(error)
    cleanupTempFiles()
  })
})
```
- 本质是订阅者模式，类似于事件监听器
- 用于执行"副作用"（日志、监控等）
- 无法优雅地中断或修改响应
- 可能与 Nitro 内置处理逻辑冲突

**`h3App.options.onError` - 处理器模式**
```typescript
// ✅ 适合在这里修改响应
export default defineNitroPlugin((nitroApp) => {
  nitroApp.h3App.options.onError = (error, event) => {
    // 完全接管错误响应
    const response = {
      success: false,
      code: error.statusCode || 500,
      message: error.message,
    }
    event.node.res.setHeader('Content-Type', 'application/json')
    event.node.res.end(JSON.stringify(response))
  }
})
```
- 本质是处理器替换，是 H3 渲染响应的最终出口
- 完全控制错误响应格式
- 阻断 Nitro 默认的错误处理

### 类比理解
- `hook('error')` ≈ Node.js 的 `uncaughtException` 监听器（观察）
- `h3App.options.onError` ≈ Express 的错误中间件（处理）

### 注意事项
使用 `h3App.options.onError` 时建议检查响应是否已发送：
```typescript
if (event.node.res.headersSent) {
  return
}
```

### 日期
2025-02-03

---

## TypeScript 找不到 defineNitroPlugin / defineNuxtConfig（Nuxt 4 多环境冲突）

### 问题描述
TypeScript 报错找不到 `defineNitroPlugin` 或 `defineNuxtConfig`，无法同时满足两种类型环境：
- **不添加 `include`** → `server/` 目录找不到 `defineNitroPlugin` 等 Nitro API
- **添加 `include`** → `nuxt.config.ts` 找不到 `defineNuxtConfig` 等 Nuxt 配置 API

### 根本原因
Nuxt 4 使用 **三环境类型系统**，每个环境有独立的 tsconfig 和全局类型：
- **app 环境**：`app/` 目录，Vue 组件、composables 等
- **server 环境**：`server/` 目录，Nitro 插件、API 路由等
- **node 环境**：`nuxt.config.ts`，构建配置文件

单个 `tsconfig.json` 无法同时为 `nuxt.config.ts`（需要 node 环境）和 `server/`（需要 server 环境）提供正确的类型。

### 修复方法（推荐）
利用 VS Code 的**自动选择机制**，在 `server/` 目录创建独立的 `tsconfig.json`：

**`/tsconfig.json`**（根配置，用于 app 端和 nuxt.config.ts）：
```json
{
  "extends": "./.nuxt/tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@server/*": ["./server/*"],
      "@app/*": ["./app/*"]
    }
  }
}
```

**`/server/tsconfig.json`**（Server 配置）：
```json
{
  "extends": "../.nuxt/tsconfig.server.json",
  "include": ["../.nuxt/types/**/*.d.ts"],
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "outDir": "../.tsbuild/server"
  }
}
```

### 工作原理
VS Code 打开文件时会向上查找最近的 `tsconfig.json`：
- `nuxt.config.ts` → 使用 `/tsconfig.json` → 获得 `defineNuxtConfig`
- `server/api/*.ts` → 使用 `/server/tsconfig.json` → 获得 `defineNitroPlugin`

### Nuxt 4 生成的类型配置文件

| 文件 | 用途 | 包含内容 |
|------|------|----------|
| `.nuxt/tsconfig.json` | App 环境 | Vue、路由、组件等 |
| `.nuxt/tsconfig.server.json` | Server 环境 | Nitro、H3、server imports |
| `.nuxt/tsconfig.node.json` | Node 环境 | `defineNuxtConfig`、构建配置 |

### 后续操作
修改后重新加载 TypeScript 语言服务器：
- VS Code: `Ctrl+Shift+P` → `TypeScript: Restart TS Server`

### 相关文件位置
- Server 类型：`.nuxt/types/nitro-imports.d.ts`
- Node 类型：`.nuxt/nuxt.node.d.ts`（引用 `nuxt` 包的全局类型）

### 日期
2025-02-02（更新：2025-02-03）
