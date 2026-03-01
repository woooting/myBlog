import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  // JWT 加密密钥 - 生产环境必须使用环境变量
  secret: (useRuntimeConfig().authSecret as string) || 'your-secret-key-change-in-production',

  // 认证提供商配置
  providers: [
    // @ts-expect-error 使用 .default 确保 SSR 兼容性
    GoogleProvider.default({
      clientId: process.env.NUXT_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.NUXT_GOOGLE_CLIENT_SECRET || '',
    }),

    // @ts-expect-error 使用 .default 确保 SSR 兼容性
    GitHubProvider.default({
      clientId: process.env.NUXT_GITHUB_CLIENT_ID || '',
      clientSecret: process.env.NUXT_GITHUB_CLIENT_SECRET || '',
    }),
  ],

  // 自定义页面路径
  pages: {
    signIn: '/login', // 登录页面
    error: '/login',  // 错误时返回登录页
  },

  // 回调函数配置
  callbacks: {
    // JWT 回调 - 将用户信息添加到 token
    async jwt({ token, user, account, profile }) {
      // 首次登录时，user 对象存在
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
      }

      // account 对象包含登录提供商信息
      if (account && profile) {
        token.provider = account.provider
        // 保存 OAuth 提供商的用户 ID（GitHub: profile.id, Google: profile.sub）
        token.providerAccountId = String((profile as any).id || (profile as any).sub)
        token.accessToken = account.access_token
      }

      return token
    },

    // Session 回调 - 将 token 信息传递给客户端 session
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string
        // 添加用户标识到 session
        ;(session.user as any).id = token.providerAccountId
        ;(session.user as any).provider = token.provider
      }
      return session
    },

    // 登录时保存用户到数据库
    async signIn({ user, account, profile }) {
      if (!account || !profile) return true

      const { usersService } = await import('@server/services/users.service')

      if (account.provider === 'github') {
        usersService.upsertOAuthUser({
          provider: 'github',
          providerAccountId: String((profile as any).id),
          email: user.email,
          username: (profile as any).login,
          avatarUrl: user.image,
        })
      } else if (account.provider === 'google') {
        usersService.upsertOAuthUser({
          provider: 'google',
          providerAccountId: String((profile as any).sub),
          email: user.email,
          username: (profile as any).name,
          avatarUrl: (user as any).picture,
        })
      }

      return true
    },

    // 重定向回调 - 控制登录/退出后的跳转
    async redirect({ url, baseUrl }) {
      // 如果 URL 是相对路径，直接返回
      if (url.startsWith('/')) {
        return url
      }
      // 登录成功后跳转到首页，带上登录成功标记
      return `${baseUrl}?login=success`
    },
  },

  // Session 配置
  session: {
    strategy: 'jwt', // 使用 JWT 策略
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },

  // JWT 配置
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },
})
