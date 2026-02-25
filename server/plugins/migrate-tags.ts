import db from '../utils/db'

/**
 * 数据迁移插件
 * 将 posts.tags 字段中的 JSON 数据迁移到 tags 表和 post_tags 关联表
 */
export default defineNitroPlugin(() => {
  // 检查 tags 表是否存在
  const tagsTableCheck = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='tags'"
  ).get()

  if (!tagsTableCheck) {
    console.log('⚠️ Tags table not found, skipping migration')
    return
  }

  // 检查是否已经有迁移记录（有标签数据则跳过）
  try {
    const existingTags = db.prepare('SELECT COUNT(*) as count FROM tags').get() as {
      count: number
    }
    if (existingTags.count > 0) {
      console.log(`✓ Tags migration already completed (${existingTags.count} tags found)`)
      return
    }
  } catch (e) {
    console.log('ℹ️ Unable to check existing tags, continuing with migration...')
  }

  console.log('🔄 Starting tags migration...')

  try {
    // 1. 检查 posts 表是否有 tags 列
    const postsTableInfo = db
      .prepare('PRAGMA table_info(posts)')
      .all() as Array<{ cid: number; name: string }>

    const hasTagsColumn = postsTableInfo.some((col) => col.name === 'tags')

    if (!hasTagsColumn) {
      console.log('⚠️ Posts table missing tags column, adding it...')
      try {
        db.exec('ALTER TABLE posts ADD COLUMN tags TEXT')
        console.log('✓ Added tags column to posts table')
      } catch (e) {
        console.log('ℹ️ Could not add tags column (may already exist)')
      }
    }

    // 2. 读取所有 posts 的 tags 字段（先检查列是否存在）
    let posts: Array<{ id: number; tags: string }> = []
    try {
      posts = db
        .prepare('SELECT id, tags FROM posts WHERE tags IS NOT NULL AND tags != ?')
        .all('') as Array<{ id: number; tags: string }>
    } catch (e) {
      console.log('ℹ️ Unable to read posts tags column, skipping migration')
      return
    }

    console.log(`📦 Found ${posts.length} posts with tags`)

    if (posts.length === 0) {
      console.log('ℹ️ No posts with tags found, skipping migration')
      return
    }

    // 3. 收集所有唯一的标签
    const tagMap = new Map<string, number>() // name -> id
    const tagCounts = new Map<string, number>() // name -> count

    for (const post of posts) {
      let tagNames: string[] = []
      try {
        // 尝试解析 JSON
        tagNames = JSON.parse(post.tags)
        if (!Array.isArray(tagNames)) {
          tagNames = []
        }
      } catch {
        // 如果解析失败，尝试按逗号分割
        tagNames = post.tags.split(/,|，/).filter((t) => t.trim())
      }

      for (const name of tagNames) {
        const trimmedName = name.trim()
        if (trimmedName) {
          tagCounts.set(trimmedName, (tagCounts.get(trimmedName) || 0) + 1)
        }
      }
    }

    console.log(`📋 Found ${tagCounts.size} unique tags`)

    if (tagCounts.size === 0) {
      console.log('ℹ️ No valid tags found, skipping migration')
      return
    }

    // 4. 批量插入标签到 tags 表
    const insertTag = db.prepare('INSERT INTO tags (name, slug, count) VALUES (?, ?, ?)')

    const insertMany = db.transaction((tags: Array<{ name: string; count: number }>) => {
      for (const tag of tags) {
        const slug = tag.name.toLowerCase().replace(/\s+/g, '-')
        const result = insertTag.run(tag.name, slug, tag.count)
        tagMap.set(tag.name, result.lastInsertRowid as number)
      }
    })

    const tagsToInsert = Array.from(tagCounts.entries()).map(([name, count]) => ({
      name,
      count,
    }))

    insertMany(tagsToInsert)
    console.log(`✓ Inserted ${tagMap.size} tags`)

    // 5. 建立 post_tags 关联
    const insertPostTag = db.prepare(
      'INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)'
    )

    const insertManyPostTags = db.transaction(
      (relations: Array<{ postId: number; tagId: number }>) => {
        for (const rel of relations) {
          insertPostTag.run(rel.postId, rel.tagId)
        }
      }
    )

    const postTagRelations: Array<{ postId: number; tagId: number }> = []

    for (const post of posts) {
      let tagNames: string[] = []
      try {
        tagNames = JSON.parse(post.tags)
        if (!Array.isArray(tagNames)) {
          tagNames = []
        }
      } catch {
        tagNames = post.tags.split(/,|，/).filter((t) => t.trim())
      }

      for (const name of tagNames) {
        const trimmedName = name.trim()
        const tagId = tagMap.get(trimmedName)
        if (tagId) {
          postTagRelations.push({ postId: post.id, tagId })
        }
      }
    }

    insertManyPostTags(postTagRelations)
    console.log(`✓ Created ${postTagRelations.length} post-tag relations`)

    console.log('✅ Tags migration completed successfully!')
  } catch (error) {
    console.error('❌ Tags migration failed:', error)
  }
})
