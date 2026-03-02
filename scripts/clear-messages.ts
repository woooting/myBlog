/**
 * 临时脚本：清空 messages 表的所有数据
 * 运行方式: npx tsx scripts/clear-messages.ts
 */
import Database from 'better-sqlite3'

const db = new Database('./data/blog.db')

try {
  // 先查看当前有多少条数据
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM messages')
  const { count } = countStmt.get() as { count: number }
  console.log(`当前 messages 表中有 ${count} 条记录`)

  // 确认是否要删除
  if (count > 0) {
    // 删除所有数据
    const deleteStmt = db.prepare('DELETE FROM messages')
    const result = deleteStmt.run()
    console.log(`✓ 已删除 ${result.changes} 条留言记录`)

    // 重置自增 ID（可选）
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'messages'").run()
    console.log('✓ 已重置自增 ID')
  } else {
    console.log('messages 表已经是空的')
  }
} catch (error) {
  console.error('清空数据失败:', error)
  process.exit(1)
} finally {
  db.close()
}
