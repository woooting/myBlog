import db from '../utils/db'

/**
 * 留言数据模型
 */
export interface Message {
  id?: number
  visitor_id: string
  content: string
  image_url?: string
  created_at?: string
}

/**
 * 留言服务层
 * 处理留言相关的数据库操作
 */
export const messagesService = {
  /**
   * 创建留言
   */
  create(message: Omit<Message, 'id' | 'created_at'>) {
    const stmt = db.prepare(`
      INSERT INTO messages (visitor_id, content, image_url)
      VALUES (?, ?, ?)
    `)
    return stmt.run(message.visitor_id, message.content, message.image_url || null)
  },

  /**
   * 分页获取留言（按时间倒序）
   */
  getPaginated(options: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 15 } = options
    const offset = (page - 1) * pageSize

    const stmt = db.prepare(`
      SELECT * FROM messages
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    const messages = stmt.all(pageSize, offset)

    // 获取总数
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM messages')
    const { count } = countStmt.get() as { count: number }

    return {
      data: messages,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    }
  },

  /**
   * 获取留言总数
   */
  getCount() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM messages')
    const { count } = stmt.get() as { count: number }
    return count
  },
}
