import db from '../utils/db'
import { errors } from '@server/utils/response'

export interface Post {
  id?: number
  title: string
  content: string
  summary?: string
  status?: 'draft' | 'published'
  category?: string
  tags?: string
  cover_image?: string
  view_count?: number
  created_at?: string
  updated_at?: string
  published_at?: string
}

export const postsService = {
  create(post: Omit<Post, 'id' | 'created_at' | 'updated_at'>) {
    const stmt = db.prepare(
      `INSERT INTO posts (title, content, summary, status, category, tags, cover_image, published_at)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    return stmt.run(
      post.title,
      post.content,
      post.summary || null,
      post.status || 'draft',
      post.category || null,
      post.tags || null,
      post.cover_image || null,
      post.published_at || null
    )
  },

  getList(options?: { status?: string; category?: string }) {
    let sql = 'SELECT * FROM posts WHERE 1=1'
    const params: any[] = []

    if (options?.status) {
      sql += ' AND status = ?'
      params.push(options.status)
    }

    if (options?.category) {
      sql += ' AND category = ?'
      params.push(options.category)
    }

    sql += ' ORDER BY created_at DESC'
    const stmt = db.prepare(sql)
    return stmt.all(...params)
  },

  // 获取总数（用于分页）
  getCount(options?: { status?: string; category?: string }) {
    let sql = 'SELECT COUNT(*) as count FROM posts WHERE 1=1'
    const params: any[] = []

    if (options?.status) {
      sql += ' AND status = ?'
      params.push(options.status)
    }

    if (options?.category) {
      sql += ' AND category = ?'
      params.push(options.category)
    }

    const stmt = db.prepare(sql)
    const result = stmt.get(...params) as { count: number }
    return result?.count || 0
  },

  // 分页查询
  getPaginated(options: {
    page?: number
    pageSize?: number
    status?: string
    category?: string
  }) {
    const { page = 1, pageSize = 10 } = options

    // 计算偏移量
    const offset = (page - 1) * pageSize

    let sql = 'SELECT * FROM posts WHERE 1=1'
    const params: any[] = []

    if (options?.status) {
      sql += ' AND status = ?'
      params.push(options.status)
    }

    if (options?.category) {
      sql += ' AND category = ?'
      params.push(options.category)
    }

    // 添加排序和分页
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(pageSize, offset)

    const stmt = db.prepare(sql)
    const posts = stmt.all(...params)

    // 获取总数
    const total = this.getCount(options)

    return {
      data: posts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  },

  getById(id: number) {
    const stmt = db.prepare('SELECT * FROM posts WHERE id = ?')
    const post = stmt.get(id)
    if (!post) {
      errors.notFound('文章不存在')
    }
    return post
  },

  update(id: number, post: Partial<Post>) {
    const existing = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(id)
    if (!existing) {
      errors.notFound('文章不存在')
    }

    const fields = Object.keys(post)
      .filter((key) => key !== 'id')
      .map((key) => `${key} = ?`)
      .join(', ')

    const values = Object.entries(post)
      .filter(([key]) => key !== 'id')
      .map(([, value]) => value)

    const stmt = db.prepare(`UPDATE posts SET ${fields} WHERE id = ?`)
    return stmt.run(...values, id)
  },

  delete(id: number) {
    const existing = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(id)
    if (!existing) {
      errors.notFound('文章不存在')
    }
    const stmt = db.prepare(`DELETE FROM posts WHERE id = ?`)
    return stmt.run(id)
  },

  batchDelete(ids: number[]) {
    if (!ids || ids.length === 0) {
      return { count: 0 }
    }

    // 使用 IN 子句批量删除
    const placeholders = ids.map(() => '?').join(',')
    const stmt = db.prepare(`DELETE FROM posts WHERE id IN (${placeholders})`)
    const result = stmt.run(...ids)

    return { count: result.changes }
  },

  publish(id:number) {
    const stmt = db.prepare(
      `UPDATE posts
      SET status = 'published'
      WHERE id = ?
      `
    )
    return stmt.run(id)
  },

  unpublish(id:number) {
    const stmt = db.prepare(
      `UPDATE posts
      SET status = 'draft'
      WHERE id = ?
      `
    )
    return stmt.run(id)
  },
}
