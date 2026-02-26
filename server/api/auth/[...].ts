import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  // JWT 加密密钥 - 生产环境必须使用环境变量
  secret: useRuntimeConfig().authSecret || 'your-secret-key-change-in-production',

  // 认证提供商配置
  providers: [
    // @ts-expect-error 使用 .default 确保 SSR 兼容性
    GoogleProvider.default({
      clientId: process.env.NUXT_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.NUXT_GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
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
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
      }
      if (account) {
        token.provider = account.provider
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
      }
      return session
    },

    // 登录/注册时保存用户到数据库（可选）
    async signIn({ user, account, profile }) {
      // 这里可以添加逻辑将用户保存到数据库
      // 例如：检查用户是否存在，不存在则创建
      return true
    },

    // 重定向回调 - 控制登录/退出后的跳转
    async redirect({ url, baseUrl }) {
      // 如果 URL 是相对路径，直接返回
      if (url.startsWith('/')) {
        return url
      }
      // 否则返回首页
      return baseUrl
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
