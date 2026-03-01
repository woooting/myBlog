import db from '../utils/db'
import { errors } from '@server/utils/response'

export interface Tag {
  id?: number
  name: string
  slug: string
  desc?: string
  count?: number
  created_at?: string
  updated_at?: string
}

export interface TagWithPostIds extends Tag {
  postIds?: number[]
}

/**
 * 标签服务
 */
export const tagsService = {
  /**
   * 获取标签列表（分页、排序）
   */
  getList(options: {
    page?: number
    pageSize?: number
    sort?: 'count' | 'name' | 'created_at'
    order?: 'asc' | 'desc'
  }) {
    const { page = 1, pageSize = 20, sort = 'count', order = 'desc' } = options

    const offset = (page - 1) * pageSize

    // 验证排序字段，防止 SQL 注入
    const validSortFields = ['count', 'name', 'created_at']
    const sortField = validSortFields.includes(sort) ? sort : 'count'
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC'

    const sql = `
      SELECT * FROM tags
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `

    const stmt = db.prepare(sql)
    const tags = stmt.all(pageSize, offset)

    // 获取总数
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM tags')
    const result = countStmt.get() as { count: number }
    const total = result?.count || 0

    return {
      data: tags,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  },

  /**
   * 根据 ID 获取标签
   */
  getById(id: number) {
    const stmt = db.prepare('SELECT * FROM tags WHERE id = ?')
    const tag = stmt.get(id)
    if (!tag) {
      errors.notFound('标签不存在')
    }
    return tag
  },

  /**
   * 根据 slug 获取标签
   */
  getBySlug(slug: string) {
    const stmt = db.prepare('SELECT * FROM tags WHERE slug = ?')
    const tag = stmt.get(slug)
    return tag || null
  },

  /**
   * 创建标签
   */
  create(data: Omit<Tag, 'id' | 'created_at' | 'updated_at'>) {
    // 检查名称是否已存在
    const existing = db
      .prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE')
      .get(data.name)
    if (existing) {
      errors.badRequest('标签名称已存在')
    }

    // 生成 slug（小写 + 连字符）
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-')

    const stmt = db.prepare(
      'INSERT INTO tags (name, slug, desc, count) VALUES (?, ?, ?, 0)'
    )
    return stmt.run(data.name, slug, data.desc || null)
  },

  /**
   * 更新标签
   */
  update(id: number, data: Partial<Omit<Tag, 'id' | 'created_at' | 'updated_at'>>) {
    const existing = db.prepare(`SELECT * FROM tags WHERE id = ?`).get(id)
    if (!existing) {
      errors.notFound('标签不存在')
    }

    const fields: string[] = []
    const values: any[] = []

    if (data.name) {
      // 检查名称是否与其他标签冲突
      const nameConflict = db
        .prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE AND id != ?')
        .get(data.name, id)
      if (nameConflict) {
        errors.badRequest('标签名称已存在')
      }
      fields.push('name = ?')
      values.push(data.name)
    }

    if (data.slug) {
      fields.push('slug = ?')
      values.push(data.slug)
    }

    if (data.desc !== undefined) {
      fields.push('desc = ?')
      values.push(data.desc)
    }

    if (fields.length === 0) {
      return { changes: 0 }
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`)
    return stmt.run(...values)
  },

  /**
   * 删除标签（级联删除 post_tags 关联）
   */
  delete(id: number) {
    const existing = db.prepare(`SELECT * FROM tags WHERE id = ?`).get(id)
    if (!existing) {
      errors.notFound('标签不存在')
    }

    const stmt = db.prepare(`DELETE FROM tags WHERE id = ?`)
    return stmt.run(id)
  },

  /**
   * 模糊搜索标签（不区分大小写，精确匹配优先）
   */
  searchByName(keyword: string, limit: number = 10) {
    const pattern = `%${keyword}%`

    const stmt = db.prepare(`
      SELECT id, name, slug, desc, count
      FROM tags
      WHERE name LIKE ? COLLATE NOCASE
      ORDER BY
        CASE WHEN name = ? THEN 0 ELSE 1 END,
        count DESC,
        name ASC
      LIMIT ?
    `)

    return stmt.all(pattern, keyword, limit)
  },

  /**
   * 更新标签统计数量
   */
  updateCount(tagId: number, delta: number = 1) {
    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        UPDATE tags
        SET count = count + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      const result = stmt.run(delta, tagId)

      // 确保 count 不会小于 0
      if (delta < 0) {
        db.prepare('UPDATE tags SET count = 0 WHERE id = ? AND count < 0').run(tagId)
      }

      return result
    })

    return transaction()
  },

  /**
   * 建立文章与标签的关联
   */
  linkPostToTags(postId: number, tagIds: number[]) {
    // 获取旧的关联标签 ID
    const oldPostTags = db
      .prepare('SELECT tag_id FROM post_tags WHERE post_id = ?')
      .all(postId) as Array<{ tag_id: number }>

    const oldTagIds = oldPostTags.map((pt) => pt.tag_id)

    const transaction = db.transaction((ids: number[]) => {
      // 先删除旧的关联
      db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(postId)

      // 插入新的关联
      const stmt = db.prepare(
        'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)'
      )

      for (const tagId of ids) {
        stmt.run(postId, tagId)
      }

      // 更新标签统计：对旧标签减少计数，对新标签增加计数
      const oldTagSet = new Set(oldTagIds)
      const newTagSet = new Set(ids)

      // 旧标签中被移除的：减少计数
      for (const tagId of oldTagIds) {
        if (!newTagSet.has(tagId)) {
          this.updateCount(tagId, -1)
        }
      }

      // 新标签中新添加的：增加计数
      for (const tagId of ids) {
        if (!oldTagSet.has(tagId)) {
          this.updateCount(tagId, 1)
        }
      }

      return ids.length
    })

    return transaction(tagIds)
  },

  /**
   * 移除文章的所有标签关联
   */
  unlinkPostFromTags(postId: number) {
    // 获取关联的标签 ID
    const postTags = db
      .prepare('SELECT tag_id FROM post_tags WHERE post_id = ?')
      .all(postId) as Array<{ tag_id: number }>

    const tagIds = postTags.map((pt) => pt.tag_id)

    // 删除关联
    const stmt = db.prepare('DELETE FROM post_tags WHERE post_id = ?')
    const result = stmt.run(postId)

    // 更新标签统计
    for (const tagId of tagIds) {
      this.updateCount(tagId, -1)
    }

    return result
  },

  /**
   * 获取文章的所有标签
   */
  getTagsByPostId(postId: number) {
    const stmt = db.prepare(`
      SELECT t.id, t.name, t.slug, t.desc, t.count
      FROM tags t
      INNER JOIN post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = ?
      ORDER BY t.name ASC
    `)

    return stmt.all(postId)
  },

  /**
   * 获取标签关联的文章 ID 列表
   */
  getPostIdsByTagId(tagId: number, options?: { status?: string }) {
    let sql = `
      SELECT p.id
      FROM posts p
      INNER JOIN post_tags pt ON p.id = pt.post_id
      WHERE pt.tag_id = ?
    `
    const params: any[] = [tagId]

    if (options?.status) {
      sql += ' AND p.status = ?'
      params.push(options.status)
    }

    sql += ' ORDER BY p.created_at DESC'

    const stmt = db.prepare(sql)
    return stmt.all(...params) as Array<{ id: number }>
  },

  /**
   * 获取热门标签
   */
  getPopularTags(limit: number = 10) {
    const stmt = db.prepare(`
      SELECT id, name, slug, desc, count
      FROM tags
      WHERE count > 0
      ORDER BY count DESC, name ASC
      LIMIT ?
    `)

    return stmt.all(limit)
  },
}
