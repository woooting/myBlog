import db from '../utils/db'

/**
 * 数据库初始化插件
 * 在服务器启动时创建必要的表结构
 */
export default defineNitroPlugin(() => {
  // 创建 posts 表（如果不存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      category TEXT,
      tags TEXT,
      cover_image TEXT,
      view_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME
    )
  `)

  // 创建 tags 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      desc TEXT,
      count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 创建 post_tags 关联表
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
      UNIQUE(post_id, tag_id)
    )
  `)

  // 创建 users 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
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

  // 创建 messages 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      visitor_id TEXT,
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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_user_id
    ON messages(user_id)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_github_id
    ON users(github_id)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_google_id
    ON users(google_id)
  `)

  // tags 表索引
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name
    ON tags(name COLLATE NOCASE)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tags_count
    ON tags(count DESC)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tags_slug
    ON tags(slug)
  `)

  // post_tags 表索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_post_tags_post_id
    ON post_tags(post_id)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id
    ON post_tags(tag_id)
  `)

  // posts 表索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_posts_status
    ON posts(status)
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_posts_created_at
    ON posts(created_at DESC)
  `)

  console.log('✓ Database initialized: posts, tags, post_tags, users, messages tables')
})
