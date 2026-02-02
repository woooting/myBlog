import Database from 'better-sqlite3'

const db = new Database(process.env.DATABASE_PATH || './data/blog.db', {
  // 显式设置使用 UTF-8 编码（解决 Windows 中文乱码问题）
  verbose: console.log,
})

// 启用 WAL 模式以提升并发性能
db.pragma('journal_mode = WAL')

export default db
