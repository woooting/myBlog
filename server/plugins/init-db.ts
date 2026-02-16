import db from '../utils/db'

/**
 * 数据库初始化插件
 * 在服务器启动时创建必要的表结构
 */
export default defineNitroPlugin(() => {
  // 创建 messages 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_id TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 创建索引以优化查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_created_at
    ON messages(created_at DESC)
  `)

  console.log('✓ Database initialized: messages table')
})
