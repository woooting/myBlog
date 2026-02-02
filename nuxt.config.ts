// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/icon'],
  devtools: { enabled: true },
  compatibilityDate: '2024-04-03',
  css: ['~/assets/styles/main.scss'],
  // Nitro 服务器配置
  nitro: {
    // Server 端路径别名（使用绝对路径）
    alias: {
      '@server': fileURLToPath(new URL('./server', import.meta.url)),
    },
  },

  // Vite 配置
  vite: {
    optimizeDeps: {
      exclude: [
        '@nuxtjs/mdc',
        'remark-gfm',
        'remark-emoji',
        'remark-mdc',
        'remark-rehype',
        'rehype-raw',
        'parse5',
        'unist-util-visit',
      ],
    },
  },
})
