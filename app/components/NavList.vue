<template>
  <div class="navlist">
    <NuxtLink :to="item.path" class="navlist-item" v-for="item in navList" :key="item.path">
      <Icon :name="item.iconname" class="itemicon" />
      <span class="itemname">{{ item.name }}</span>
    </NuxtLink>
  </div>
</template>
<script setup lang="ts">
const navList = [
  {
    name: 'Home',
    path: '/',
    iconname: 'lucide:home',
  },
  {
    name: 'code Article',
    path: '/category/codearticle',
    iconname: 'lucide:code-xml',
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
    transition: background 0.2s ease;
    overflow: hidden; // 隐藏收缩后的文字

    &:hover {
      background: var(--bg-tertiary);
    }

    .itemicon {
      width: 24px;
      height: 24px;
      margin: 0 13px;
      flex-shrink: 0;
      transition: margin 0.3s ease;
    }

    .itemname {
      flex-shrink: 0;
      white-space: nowrap;
      transition: opacity 0.2s ease, width 0.2s ease;
    }
  }

  // 收缩状态
  @media (max-width: 980px) {
    .navlist-item {
      justify-content: center;

      .itemicon {
        margin: 0;
      }

      .itemname {
        opacity: 0;
        width: 0;
      }
    }
  }
}
</style>
