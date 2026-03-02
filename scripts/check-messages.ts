/**
 * 验证 messages 表状态
 */
import Database from 'better-sqlite3'

const db = new Database('./data/blog.db')

try {
  // 查看记录数
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM messages')
  const { count } = countStmt.get() as { count: number }
  console.log(`📊 当前记录数: ${count}`)

  // 查看自增 ID 的当前值
  const seqStmt = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'messages'")
  const seqResult = seqStmt.get() as { seq: number } | undefined

  if (seqResult) {
    console.log(`🔢 下一条记录的 ID 将从: ${seqResult.seq + 1} 开始`)
  } else {
    console.log(`🔢 下一条记录的 ID 将从: 1 开始（已重置）`)
  }

  // 查看表结构
  console.log('\n📋 表结构:')
  const schemaStmt = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='messages'")
  const { sql } = schemaStmt.get() as { sql: string }
  console.log(sql)
} catch (error) {
  console.error('查询失败:', error)
} finally {
  db.close()
}
