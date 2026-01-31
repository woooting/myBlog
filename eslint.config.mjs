import withNuxt from './.nuxt/eslint.config.mjs'

// https://nuxt.com/docs/guide/concepts/eslint
export default withNuxt(
  // 你的自定义规则会覆盖 Nuxt 默认配置
  {
    rules: {
      // 在这里添加自定义规则
      'no-console': 'off',
      'vue/multi-word-component-names': 'off',
    },
  }
)
