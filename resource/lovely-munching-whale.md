# localStorage → IndexedDB 迁移计划

## Context

将 TipTap 编辑器的自动保存功能从 localStorage 迁移到 IndexedDB，解决存储容量限制问题（localStorage 5-10MB → IndexedDB 几百 MB），更好地支持包含 Base64 图片的富文本内容。

**关键约束**：
- API 兼容性：保持 `useAutoSave` 接口不变，组件无需修改
- 仅基础功能：保存/恢复/清除，不需要草稿管理功能
- 不处理旧数据迁移

---

## 实现步骤

### 第一步：安装依赖

```bash
pnpm add idb
```

使用轻量级的 `idb` 库（~3KB gzipped），提供 Promise-based API，比原生 IndexedDB 更简洁。

---

### 第二步：创建数据库封装层

**新建文件**：`app/utils/draftDB.ts`

```typescript
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// 数据库 Schema 定义
interface DraftDB extends DBSchema {
  drafts: {
    key: string
    value: {
      content: any       // TipTap JSON 内容
      timestamp: number  // 保存时间戳
    }
  }
}

const DB_NAME = 'myblog-drafts'
const DB_VERSION = 1
const STORE_NAME = 'drafts'

let dbPromise: Promise<IDBPDatabase<DraftDB>> | null = null

// 获取数据库连接（单例模式）
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DraftDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      },
    })
  }
  return dbPromise
}

// 导出的 API
export const draftDB = {
  async get(key: string): Promise<any | null> {
    const db = await getDB()
    const result = await db.get(STORE_NAME, key)
    return result?.content ?? null
  },

  async set(key: string, value: any): Promise<void> {
    const db = await getDB()
    await db.put(STORE_NAME, {
      content: value,
      timestamp: Date.now()
    }, key)
  },

  async delete(key: string): Promise<void> {
    const db = await getDB()
    await db.delete(STORE_NAME, key)
  },
}
```

---

### 第三步：重构 useAutoSave composable

**修改文件**：`app/composables/useAutoSave.ts`

**核心改动**：
1. 添加响应式缓存（`cachedDraft`, `isDbReady`）
2. 在 `onMounted` 中异步加载草稿
3. 修改 `getDraft` 从缓存读取（保持同步 API）
4. 修改 `clearDraft` 为异步
5. 修改 `watchDebounced` 回调为异步
6. 修改 `onBeforeUnmount` 为异步

**关键代码变更**：

```typescript
// 新增：响应式缓存状态
const cachedDraft = ref<T | null>(null)
const isDbReady = ref(false)

// 新增：异步初始化
onMounted(async () => {
  try {
    const draft = await draftDB.get(storageKey)
    if (draft !== null && isEmpty) {
      cachedDraft.value = isEmpty(draft) ? null : draft
    } else {
      cachedDraft.value = draft
    }
  } catch (error) {
    console.error('加载草稿失败:', error)
  } finally {
    isDbReady.value = true
  }
})

// 修改：hasDraft 从缓存读取
const hasDraft = computed(() => {
  if (unref(enabled) === false) return false
  if (!isDbReady.value) return false
  return cachedDraft.value !== null
})

// 修改：getDraft 从缓存读取
const getDraft = (): T | null => {
  if (unref(enabled) === false) return null
  return cachedDraft.value
}

// 修改：clearDraft 为异步
const clearDraft = async () => {
  cachedDraft.value = null
  try {
    await draftDB.delete(storageKey)
  } catch (error) {
    console.error('清除草稿失败:', error)
  }
}

// 修改：watchDebounced 回调为异步
const { stop } = watchDebounced(
  () => { /* ... */ },
  async (newValue) => {
    // ...
    cachedDraft.value = newValue
    try {
      await draftDB.set(storageKey, newValue)
    } catch (error) {
      console.error('保存草稿失败:', error)
    }
  },
  { deep: true, debounce: delay }
)

// 修改：onBeforeUnmount 为异步
onBeforeUnmount(async () => {
  // ...
  try {
    await draftDB.set(storageKey, value)
  } catch (error) {
    console.error('保存草稿失败:', error)
  }
})
```

---

## 文件修改清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `app/utils/draftDB.ts` | IndexedDB 封装层 |
| 修改 | `app/composables/useAutoSave.ts` | 添加缓存机制，改为异步 |
| 修改 | `package.json` | 添加 `idb` 依赖 |

---

## 验证测试

### 功能测试
1. **保存测试**：在编辑器中输入内容，等待 1 秒后刷新页面
2. **恢复测试**：刷新后点击"恢复草稿"按钮，内容应正确恢复
3. **清除测试**：点击"放弃草稿"按钮，草稿应被清除
4. **图片测试**：插入 Base64 图片后刷新，图片应完整恢复

### 开发者工具验证
打开浏览器 DevTools → Application → IndexedDB：
- 数据库 `myblog-drafts` 应存在
- 对象存储 `drafts` 应存在
- 记录应包含 `content` 和 `timestamp` 字段

### 边界测试
- 空内容不应保存草稿
- 编辑器已有内容时不显示恢复提示
- `modelValue` 有值时不显示恢复提示

---

## 数据结构

**IndexedDB 数据库**：
- 名称：`myblog-drafts`
- 版本：`1`
- 对象存储：`drafts`
- 主键：`storageKey`（如 `'markdown-editor-draft'`）

**存储记录格式**：
```typescript
{
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '文字内容' },
          {
            type: 'image',
            attrs: {
              src: 'data:image/jpeg;base64,...',
              alt: '图片描述'
            }
          }
        ]
      }
    ]
  },
  timestamp: 1739203200000
}
```

---

## 架构说明

```
┌─────────────────────────────────────────────────────┐
│           组件层（同步 API）                         │
│  MarkDownEditor.client.vue                          │
│    ↓ uses                                           │
│  hasDraft: ComputedRef<boolean>                    │
│  getDraft(): T | null                              │
│  clearDraft(): void                                 │
│  restoreDraft(): boolean                            │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│         Composable 层（缓存 + 异步）                  │
│  useAutoSave.ts                                     │
│    ↓ 维护                                           │
│  cachedDraft: Ref<T | null>  ← 响应式缓存           │
│  isDbReady: Ref<boolean>     ← 初始化状态           │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│           IndexedDB 层（异步）                        │
│  draftDB.ts                                          │
│    ↓ 封装                                           │
│  draftDB.get() / set() / delete()                   │
└─────────────────────────────────────────────────────┘
```

**关键设计**：外部 API 保持同步，内部通过响应式缓存处理异步加载，组件无需感知 IndexedDB 的异步特性。
