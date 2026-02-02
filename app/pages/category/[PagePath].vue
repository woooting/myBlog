<template>
  <div>{{ currentCategory }}</div>
</template>
<script setup lang="ts">
type Path = 'codearticle' | 'tool' | 'lifeinsights'

const route = useRoute()
const pagePath = route.params.PagePath as Path

const categoryMap: Record<string, string> = {
  codearticle: 'Code Article',
  tool: 'Tool',
  lifeinsights: 'Life Insights',
}

const currentCategory = categoryMap[pagePath] || 'Unknown'
</script>
<style lang="scss"></style>
