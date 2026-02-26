<template>
  <div class="navlist">
    <NuxtLink :to="item.path" class="navlist-item" v-for="item in navList" :key="item.path">
      <Icon :name="item.iconname" class="itemicon" />
      <span class="itemname">{{ item.name }}</span>
    </NuxtLink>
  </div>
</template>
<script setup lang="ts">
// TODO(human): 可以扩展此接口，如添加 disabled、badge 等属性
export interface NavItem {
  name: string
  path: string
  iconname: string
}

defineProps<{
  navList: NavItem[]
}>()
</script>
<style lang="scss">
.navlist {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 12px;
  gap: 8px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);

  .navlist-item {
    display: flex;
    align-items: center;
    text-decoration: none;
    text-align: center;
    color: var(--text-secondary);
    line-height: 44px;
    cursor: pointer;
    height: 44px;
    background-color: transparent;
    border-radius: 10px;
    transition: all 0.2s ease;
    overflow: hidden; // 隐藏收缩后的文字

    &:hover {
      background: rgba(0, 0, 0, 0.06);
      transform: translateX(4px);
    }

    // NuxtLink 激活状态
    &.router-link-active {
      background: var(--accent-color);
      color: white;
      font-weight: 500;

      .itemicon {
        color: white;
      }
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

  // 深色模式适配
  .dark & {
    background: rgba(26, 26, 26, 0.7);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);

    .navlist-item {
      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    }
  }

  // 收缩状态
  @media (max-width: 980px) {
    padding: 8px;

    .navlist-item {
      justify-content: center;
      height: 40px;
      line-height: 40px;

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
