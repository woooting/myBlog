# 单例模式（Singleton Pattern）

> **模式名称**: 单例模式
> **适用场景**: 资源复用、全局配置、状态管理
> **难度**: ⭐⭐

---

## 📋 问题场景

### 核心问题

```
频繁创建/销毁昂贵资源
    ↓
性能损耗、资源浪费
```

### 典型表现

- 每次操作都创建新的数据库连接
- 全局配置对象被重复初始化
- 事件监听器被多次注册

---

## ✅ 解决方案

### 基础实现

```typescript
class Database {
  private static instance: Database | null = null

  private constructor() {
    // 私有构造函数，防止外部 new
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }
}
```

### TypeScript 单例（推荐）

```typescript
// 方法 1: 模块级单例（最简洁）
let instance: MyDatabase | null = null

export function getDatabase(): MyDatabase {
  if (!instance) {
    instance = new MyDatabase()
  }
  return instance
}
```

### Promise 单例（本项目应用）

```typescript
// 用于异步资源（如数据库连接）
let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null

export function getDB(): Promise<IDBPDatabase<MyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 初始化逻辑
      }
    })
  }
  return dbPromise  // 返回同一个 Promise
}
```

---

## 💡 使用场景

### 数据库连接

```typescript
// ✅ 正确：复用连接
const db1 = await getDB()
const db2 = await getDB()  // 同一个连接
const db3 = await getDB()  // 同一个连接

// ❌ 错误：每次创建
const db1 = await openDB(...)
const db2 = await openDB(...)  // 浪费资源
```

### 全局配置

```typescript
let config: AppConfig | null = null

export function getConfig(): AppConfig {
  if (!config) {
    config = loadConfigFromFile()
  }
  return config
}
```

### 状态管理

```typescript
const store = {
  state: {},
  getState() {
    return this.state
  },
  setState(newState) {
    this.state = { ...this.state, ...newState }
  }
}
```

---

## 🎯 核心要点

### 优势

- **资源复用**: 避免重复创建昂贵对象
- **状态一致**: 全局唯一实例，状态统一
- **性能优化**: 减少初始化开销

### 注意事项

- **测试困难**: 单例在单元测试中可能需要重置
- **隐式依赖**: 使用方不知道单例的创建时机
- **并发安全**: 多线程环境下需要考虑加锁（JS 单线程无需）

### TypeScript 实现

| 方式 | 优点 | 缺点 |
|------|------|--------|
| **Class 单例** | 严格、经典 | 代码冗长 |
| **模块变量** | 简洁、自然 | 框架依赖 |
| **闭包单例** | 可封装 | 代码稍复杂 |

---

## 🔗 相关模式

- [[工厂模式]] - 控制对象创建
- [[依赖注入]] - 替代单例的现代方案
- [[观察者模式]] - 单例数据变化通知

---

**Created**: 2025-02-11
**Status**: ✅ 完成总结
