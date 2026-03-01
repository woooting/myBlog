import db from '../utils/db'

/**
 * 留言数据模型
 */
export interface Message {
  id?: number
  user_id?: number
  visitor_id?: string
  content: string
  image_url?: string
  created_at?: string
}

/**
 * 留言列表项（包含用户信息）
 */
export interface MessageWithUser extends Message {
  username?: string
  user_avatar?: string
  is_guest?: boolean
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
      INSERT INTO messages (user_id, visitor_id, content, image_url)
      VALUES (?, ?, ?, ?)
    `)
    return stmt.run(message.user_id || null, message.visitor_id || null, message.content, message.image_url || null)
  },

  /**
   * 分页获取留言（按时间倒序，包含用户信息）
   */
  getPaginated(options: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 15 } = options
    const offset = (page - 1) * pageSize

    const stmt = db.prepare(`
      SELECT
        m.id,
        m.user_id,
        m.visitor_id,
        m.content,
        m.image_url,
        m.created_at,
        u.username,
        u.avatar_url as user_avatar,
        CASE
          WHEN m.user_id IS NOT NULL THEN 0
          ELSE 1
        END as is_guest
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `)
    const messages = stmt.all(pageSize, offset) as MessageWithUser[]

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
