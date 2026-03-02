/**
 * 修复标签计数脚本
 * 重新计算所有标签的 count 字段，基于 post_tags 表的实际关联数
 */

import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'blog.db')
const db = new Database(dbPath)

console.log('🔧 开始修复标签计数...')

try {
  // 1. 重置所有标签的 count 为 0
  const resetStmt = db.prepare('UPDATE tags SET count = 0')
  resetStmt.run()
  console.log('✅ 已重置所有标签计数为 0')

  // 2. 从 post_tags 表统计每个标签的实际关联数
  const countStmt = db.prepare(`
    UPDATE tags
    SET count = (
      SELECT COUNT(*)
      FROM post_tags
      WHERE post_tags.tag_id = tags.id
    )
  `)
  countStmt.run()
  console.log('✅ 已重新计算所有标签计数')

  // 3. 验证修复结果
  const verifyStmt = db.prepare(`
    SELECT
      t.id,
      t.name,
      t.count as tag_count,
      (SELECT COUNT(*) FROM post_tags WHERE post_tags.tag_id = t.id) as actual_count
    FROM tags t
    ORDER BY t.count DESC
  `)

  const results = verifyStmt.all() as Array<{
    id: number
    name: string
    tag_count: number
    actual_count: number
  }>

  console.log('\n📊 修复后的标签统计：')
  console.log('┌────┬────────────┬─────────┬──────────────┐')
  console.log('│ ID │ 标签名称    │ 计数值   │ 实际关联数   │')
  console.log('├────┼────────────┼─────────┼──────────────┤')

  for (const row of results) {
    const status = row.tag_count === row.actual_count ? '✅' : '❌'
    console.log(`│ ${row.id.toString().padEnd(2)} │ ${row.name.padEnd(10)} │ ${row.tag_count.toString().padEnd(7)} │ ${row.actual_count.toString().padEnd(10)} │ ${status}`)
  }

  console.log('└────┴────────────┴─────────┴──────────────┘')

  const totalTags = results.length
  const totalPosts = db.prepare('SELECT COUNT(*) as count FROM post_tags').get() as { count: number }
  console.log(`\n✨ 修复完成！共 ${totalTags} 个标签，${totalPosts.count} 个文章-标签关联`)

} catch (error) {
  console.error('❌ 修复失败:', error)
  process.exit(1)
} finally {
  db.close()
}
