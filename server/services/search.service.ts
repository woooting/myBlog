import db from '../utils/db'

export interface SearchPostsOptions {
  q: string
  page?: number
  pageSize?: number
}

export interface PostSearchResult {
  id: number
  title: string
  tagIds: number[]
  tagNames: string[]
}

export const searchService = {
  /**
   * 搜索文章（标题或标签匹配）
   * @param options 搜索选项
   * @returns 搜索结果和分页信息
   */
  searchPosts(options: SearchPostsOptions) {
    const { q, page = 1, pageSize = 10 } = options
    const offset = (page - 1) * pageSize
    const pattern = `%${q}%`

    // 搜索文章（标题或标签匹配）
    const sql = `
      SELECT DISTINCT
        p.id, p.title,
        GROUP_CONCAT(t.id) as tag_ids,
        GROUP_CONCAT(t.name) as tag_names
      FROM posts p
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.status = 'published'
        AND (p.title LIKE ? OR t.name = ?)
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `

    const stmt = db.prepare(sql)
    const posts = stmt.all(pattern, q, pageSize, offset) as any[]

    // 处理结果：解析 tag_ids 和 tag_names
    const processedPosts: PostSearchResult[] = posts.map((post) => ({
      id: post.id,
      title: post.title,
      tagIds: post.tag_ids ? post.tag_ids.split(',').map(Number) : [],
      tagNames: post.tag_names ? post.tag_names.split(',') : [],
    }))

    // 获取总数
    const countSql = `
      SELECT COUNT(DISTINCT p.id) as count
      FROM posts p
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.status = 'published'
        AND (p.title LIKE ? OR t.name = ?)
    `

    const countStmt = db.prepare(countSql)
    const countResult = countStmt.get(pattern, q) as { count: number }
    const total = countResult?.count || 0

    return {
      data: processedPosts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  },

  /**
   * 搜索标签（名称匹配）
   * @param keyword 搜索关键词
   * @param limit 返回数量限制
   * @returns 匹配的标签列表
   */
  searchTags(keyword: string, limit = 10) {
    const pattern = `%${keyword}%`

    const sql = `
      SELECT id, name, desc
      FROM tags
      WHERE name LIKE ?
      ORDER BY
        CASE WHEN name = ? THEN 0 ELSE 1 END,
        name ASC
      LIMIT ?
    `

    const stmt = db.prepare(sql)
    return stmt.all(pattern, keyword, limit)
  },
}
