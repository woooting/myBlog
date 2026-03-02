/**
 * 修复 messages 表结构
 * 添加 user_id 字段和外键约束
 */
import Database from 'better-sqlite3'

const db = new Database('./data/blog.db')

try {
  // 开启外键支持
  db.pragma('foreign_keys = ON')

  // 检查 messages 表结构
  const tableInfo = db.prepare('PRAGMA table_info(messages)').all() as any[]
  console.log('当前 messages 表结构:')
  console.table(tableInfo)

  // 检查是否有 user_id 列
  const hasUserIdColumn = tableInfo.some(col => col.name === 'user_id')

  if (!hasUserIdColumn) {
    console.log('\n❌ messages 表缺少 user_id 列，需要重建表')

    // 备份现有数据
    const messages = db.prepare('SELECT * FROM messages').all()
    console.log(`✓ 备份了 ${messages.length} 条留言数据`)

    // 删除旧表
    db.prepare('DROP TABLE IF EXISTS messages').run()
    console.log('✓ 删除旧的 messages 表')

    // 创建新表（包含 user_id）
    db.exec(`
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        visitor_id TEXT,
        content TEXT NOT NULL,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ 创建新的 messages 表（包含 user_id 字段）')

    // 恢复数据（所有旧数据都会变成访客留言）
    const insertStmt = db.prepare(`
      INSERT INTO messages (visitor_id, content, image_url, created_at)
      VALUES (?, ?, ?, ?)
    `)

    let restoredCount = 0
    for (const msg of messages as any[]) {
      insertStmt.run(msg.visitor_id, msg.content, msg.image_url, msg.created_at)
      restoredCount++
    }
    console.log(`✓ 恢复了 ${restoredCount} 条留言数据（全部标记为访客留言）`)

    // 重新创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at
      ON messages(created_at DESC)
    `)

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_user_id
      ON messages(user_id)
    `)
    console.log('✓ 重新创建索引')

  } else {
    console.log('\n✅ messages 表结构正确，已包含 user_id 列')
  }

  // 检查 users 表是否存在
  const usersTableInfo = db.prepare('PRAGMA table_info(users)').all()
  if (usersTableInfo.length === 0) {
    console.log('\n⚠️  users 表不存在，正在创建...')
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        github_id TEXT UNIQUE,
        google_id TEXT UNIQUE,
        email TEXT,
        username TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_github_id
      ON users(github_id)
    `)

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id
      ON users(google_id)
    `)
    console.log('✓ users 表创建成功')
  } else {
    console.log('\n✅ users 表已存在')
  }

  console.log('\n🎉 数据库结构修复完成！')

} catch (error) {
  console.error('修复失败:', error)
  process.exit(1)
} finally {
  db.close()
}
