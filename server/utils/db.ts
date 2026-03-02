import Database from 'better-sqlite3'

// 数据库连接：仅在开发环境开启 verbose 模式用于调试
const db = new Database(process.env.DATABASE_PATH || './data/blog.db', {
  // 仅在需要调试 SQL 时开启，否则会大幅降低性能
  // verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
})

// 启用 WAL 模式以提升并发性能
db.pragma('journal_mode = WAL')

export default db
