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
