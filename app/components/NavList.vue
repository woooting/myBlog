<template>
  <div class="navlist">
    <NuxtLink :to="item.path" class="navlist-item" v-for="item in navList" :key="item.path">
      <Icon :name="item.iconname" class="itemicon" />
      {{ item.name }}
    </NuxtLink>
  </div>
</template>
<script setup lang="ts">
const navList = [
  {
    name: 'code Article',
    path: '/category/codearticle',
    iconname: 'lucide:code-xml',
  },
  {
    name: 'Tool',
    path: '/category/tool',
    iconname: 'lucide:wrench',
  },
  {
    name: 'Life Insights',
    path: '/category/lifeinsights',
    iconname: 'lucide:lightbulb',
  },
]
</script>
<style lang="scss">
.navlist {
  display: flex;
  flex-direction: column;
  width: 100%;

  .navlist-item {
    display: flex;
    align-items: center;
    text-decoration: none;
    text-align: center;
    color: var(--text-secondary);
    line-height: 50px;
    cursor: pointer;
    height: 50px;
    background-color: var(--bg-secondary);
    &:hover {
      background: var(--bg-tertiary);
    }

    .itemicon {
      height: 100%;
      width: 25px;
      margin: 0 10px;
    }
  }
}
</style>
