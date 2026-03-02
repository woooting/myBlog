/**
 * 重置 messages 表的自增 ID
 */
import Database from 'better-sqlite3'

const db = new Database('./data/blog.db')

try {
  // 删除 sqlite_sequence 中的记录，这样下次插入会从 1 开始
  const stmt = db.prepare("DELETE FROM sqlite_sequence WHERE name = 'messages'")
  const result = stmt.run()

  if (result.changes > 0) {
    console.log('✓ 自增 ID 已重置，下一条记录将从 ID = 1 开始')
  } else {
    console.log('✓ 自增 ID 已经是初始状态，下一条记录将从 ID = 1 开始')
  }

  // 验证
  const checkStmt = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'messages'")
  const seqResult = checkStmt.get()

  if (!seqResult) {
    console.log('✅ 验证成功：sqlite_sequence 中没有 messages 的记录')
  }
} catch (error) {
  console.error('重置失败:', error)
} finally {
  db.close()
}
