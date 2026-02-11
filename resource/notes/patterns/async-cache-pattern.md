# 响应式缓存模式

> **模式名称**: 响应式缓存（Async Cache Pattern）
> **适用场景**: 异步数据初始化 + 同步 API 需求
> **难度**: ⭐⭐⭐

---

## 📋 问题场景

### 核心矛盾

```
异步数据源（如 IndexedDB、网络请求）
    ↓
需要等待加载
    ↓
组件期望同步调用
    ↓
❌ 时序问题：调用时数据未准备好
```

### 典型表现

- 刷新页面后，"恢复草稿"按钮不显示
- 数据加载慢时，界面闪烁或空白
- `getDraft()` 返回 `undefined`，但几秒后才有数据

---

## ✅ 解决方案

### 模式结构

```
┌─────────────────────────────────────────────┐
│          消费方（同步调用）              │
│  Component / Composable 调用者           │
│    ↓                                     │
│  getData(): T           ← 期望立即返回   │
│  hasData(): boolean                    │
└─────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────┐
│         缓存层（Ref + 就绪信号）         │
│  Cache Provider                          │
│    ↓ 维护                                  │
│  cache: Ref<T | null>   ← 内存缓存      │
│  isReady: Ref<boolean>      ← 就绪标志     │
└─────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────┐
│         数据源（异步）                     │
│  IndexedDB / HTTP / WebSocket            │
│    ↓                                     │
│  async loadData(): Promise<T>             │
└─────────────────────────────────────────────┘
```

### 代码模板

```typescript
// ===== 缓存提供方 =====
export function useAsyncCache<T>(options: {
  load: () => Promise<T>
  isEmpty?: (value: T) => boolean
}) {
  const cache = ref<T | null>(null)
  const isReady = ref(false)

  // 1. 异步初始化
  onMounted(async () => {
    try {
      const data = await options.load()
      if (options.isEmpty && options.isEmpty(data)) {
        cache.value = null
      } else {
        cache.value = data
      }
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      isReady.value = true  // ← 关键：发出就绪信号
    }
  })

  // 2. 同步读取（从缓存）
  const getData = (): T | null => {
    return cache.value
  }

  // 3. 条件检查（依赖就绪状态）
  const hasData = computed(() => {
    return isReady.value && cache.value !== null
  })

  // 4. 异步更新（更新缓存）
  const updateCache = async (newValue: T) => {
    cache.value = newValue
    // 可选：同时写回数据源
    // await saveToSource(newValue)
  }

  return {
    getData,
    hasData,
    updateCache,
    isReady  // 暴露就绪状态
  }
}
```

---

## 💡 使用示例

### IndexedDB 缓存

```typescript
const draftCache = useAsyncCache({
  load: () => draftDB.get('markdown-editor-draft'),
  isEmpty: (json) => json.type === 'doc' && !json.content?.length
})
```

### 网络请求缓存

```typescript
const userCache = useAsyncCache({
  load: () => fetchUser(userId),
  isEmpty: (user) => !user.id
})
```

### 配置加载缓存

```typescript
const configCache = useAsyncCache({
  load: () => loadConfig(),
  isEmpty: (config) => Object.keys(config).length === 0
})
```

---

## 🎯 核心要点

### 必需元素

1. **缓存 Ref**: 存储数据的响应式引用
2. **就绪 Ref**: 标记数据是否已加载
3. **异步加载**: 在 `onMounted` 或 watch 中初始化
4. **同步读取**: `getData` 直接返回 cache.value
5. **条件检查**: `hasData` 依赖 `isReady`

### 设计原则

- **单一职责**: 缓存提供方只管理缓存状态
- **接口简单**: 消费方只需调用 `getData()`
- **状态可追踪**: 通过 `isReady` 让外部知道何时可用
- **错误处理**: 初始化失败时 `isReady` 仍设为 `true`，避免永久等待

### 变体模式

| 模式 | 差异 | 使用场景 |
|------|--------|----------|
| **基础模式** | 无就绪检查 | 数据肯定准备好，无需等待 |
| **就绪信号** | 有 `isReady` | 异步加载，需要通知时机 |
| **双缓冲** | 有新旧两缓存 | 平滑过渡，避免加载闪烁 |

---

## 🔗 相关模式

- [[单例模式]] - 数据库连接复用
- [[观察者模式]] - 事件驱动的数据更新
- [[防抖模式]] - 减少频繁写入

---

**Created**: 2025-02-11
**Status**: ✅ 完成总结
