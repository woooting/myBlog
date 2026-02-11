// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/icon', '@nuxt/ui', '@vueuse/nuxt'],
  devtools: { enabled: true },
  compatibilityDate: '2024-04-03',
  css: ['~/assets/styles/main.scss'],
  // 前端路径别名（app 目录）
  alias: {
    '@app': fileURLToPath(new URL('./app', import.meta.url)),
  },
  // Nitro 服务器配置
  nitro: {
    // Server 端路径别名（使用绝对路径）
    alias: {
      '@server': fileURLToPath(new URL('./server', import.meta.url)),
    },
  },
  ui: {
    fonts: false,
  },
  // Vite 配置
  ssr: {
    // 跳过这些纯客户端包的 SSR 处理
    noExternal: [],
  },
  vite: {
    optimizeDeps: {
      // 禁用自动依赖扫描（由 @nuxt/content 等模块手动配置 include）
      // 明确包含 TipTap 相关包用于客户端预构建
      include: [
        '@tiptap/vue-3',
        '@tiptap/starter-kit',
        '@tiptap/extension-placeholder',
        '@tiptap/extension-link',
        '@tiptap/extension-image',
        '@tiptap/extension-code-block-lowlight',
        'lowlight',
        'tiptap-markdown',
      ],
    },
  },

  // 扩展 Vite 配置，移除 @nuxt/content 中不需要客户端预构建的依赖
  hooks: {
    'vite:extendConfig': (config) => {
      // 从 include 中移除只在服务端使用的依赖
      if (config.optimizeDeps?.include) {
        const serverOnlyDeps = [
          'remark-gfm',
          'remark-emoji',
          'remark-mdc',
          'remark-rehype',
          'rehype-raw',
          'parse5',
          'unist-util-visit',
          'unified',
          'debug',
          'micromark',
          'micromark-extension-gfm',
          'micromark-extension-gfm-autolink-literal',
          'micromark-extension-gfm-footnote',
          'micromark-extension-gfm-strikethrough',
          'micromark-extension-gfm-table',
          'micromark-util-types',
          'micromark-factory-destination',
          'micromark-factory-label',
          'micromark-factory-space',
          'micromark-factory-title',
          'micromark-factory-whitespace',
          'micromark-util-character',
          'micromark-util-chunked',
          'micromark-util-combine-extensions',
          'micromark-util-decode-numeric-character-reference',
          'micromark-util-decode-string',
          'micromark-util-normalize-identifier',
          'micromark-util-resolve-all',
          'micromark-util-subtokenize',
          'micromark-util-symbol',
          'micromark-util-sanitize-uri',
        ]
        config.optimizeDeps.include = config.optimizeDeps.include.filter(
          (dep: string) =>
            !serverOnlyDeps.some((d) => dep === d || dep.startsWith('@nuxtjs/mdc > '))
        )
      }
    },
  },
})
