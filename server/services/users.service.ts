import db from '../utils/db'

/**
 * 用户数据模型
 */
export interface User {
  id?: number
  github_id?: string
  google_id?: string
  email?: string
  username?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

/**
 * OAuth 用户信息
 */
export interface OAuthUserInfo {
  provider: 'github' | 'google'
  providerAccountId: string
  email?: string | null
  username?: string | null
  avatarUrl?: string | null
}

/**
 * 用户服务层
 * 处理用户相关的数据库操作
 */
export const usersService = {
  /**
   * 通过 GitHub ID 查找用户
   */
  findByGithubId(githubId: string): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE github_id = ?')
    return stmt.get(githubId) as User | undefined
  },

  /**
   * 通过 Google ID 查找用户
   */
  findByGoogleId(googleId: string): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE google_id = ?')
    return stmt.get(googleId) as User | undefined
  },

  /**
   * 通过用户 ID 查找用户
   */
  findById(userId: number): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
    return stmt.get(userId) as User | undefined
  },

  /**
   * 创建或更新 OAuth 用户
   */
  upsertOAuthUser(userInfo: OAuthUserInfo): User {
    let user: User | undefined

    if (userInfo.provider === 'github') {
      // 检查用户是否已存在
      user = this.findByGithubId(userInfo.providerAccountId)

      if (user) {
        // 更新用户信息
        const stmt = db.prepare(`
          UPDATE users
          SET email = ?,
              username = ?,
              avatar_url = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE github_id = ?
        `)
        stmt.run(userInfo.email, userInfo.username, userInfo.avatarUrl, userInfo.providerAccountId)
      } else {
        // 创建新用户
        const stmt = db.prepare(`
          INSERT INTO users (github_id, email, username, avatar_url)
          VALUES (?, ?, ?, ?)
        `)
        const result = stmt.run(userInfo.providerAccountId, userInfo.email, userInfo.username, userInfo.avatarUrl)
        user = { id: result.lastInsertRowid as number }
      }
    } else if (userInfo.provider === 'google') {
      // 检查用户是否已存在
      user = this.findByGoogleId(userInfo.providerAccountId)

      if (user) {
        // 更新用户信息
        const stmt = db.prepare(`
          UPDATE users
          SET email = ?,
              username = ?,
              avatar_url = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE google_id = ?
        `)
        stmt.run(userInfo.email, userInfo.username, userInfo.avatarUrl, userInfo.providerAccountId)
      } else {
        // 创建新用户
        const stmt = db.prepare(`
          INSERT INTO users (google_id, email, username, avatar_url)
          VALUES (?, ?, ?, ?)
        `)
        const result = stmt.run(userInfo.providerAccountId, userInfo.email, userInfo.username, userInfo.avatarUrl)
        user = { id: result.lastInsertRowid as number }
      }
    }

    // 返回完整的用户信息
    if (user?.id) {
      return this.findById(user.id) as User
    }

    throw new Error('创建或更新用户失败')
  },

  /**
   * 根据 OAuth 提供商的用户 ID 查找数据库用户 ID
   */
  findUserIdByProvider(provider: 'github' | 'google', providerAccountId: string): number | undefined {
    let user: User | undefined

    if (provider === 'github') {
      user = this.findByGithubId(providerAccountId)
    } else if (provider === 'google') {
      user = this.findByGoogleId(providerAccountId)
    }

    return user?.id
  },
}
