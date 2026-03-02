<template>
  <AppFloatingBar />
  <div class="default-layout">
    <div class="box-border content">
      <div class="layoutNav">
        <div class="nav-area">
          <NavList :nav-list="navList"></NavList>
        </div>
      </div>
      <div class="pagerouter"><NuxtPage /></div>
      <div class="sidebar-area">
        <!-- <Sidebar /> -->123
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { NavItem } from '@app/components/NavList.vue'

const navList: NavItem[] = [
  {
    name: 'Home',
    path: '/',
    iconname: 'lucide:home',
  },
  {
    name: 'admin',
    path: '/admin',
    iconname: 'lucide:user',
  },
  {
    name: 'messgae',
    path: '/message',
    iconname: 'lucide:message-circle',
  },
]
</script>

<style lang="scss" scoped>
.default-layout {
  height: 100vh;
  display: flex;
  background: var(--bg-page-gradient);
}

.content {
  gap: 10px;
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  padding-top: 90px;
  max-width: 1200px;
  display: flex;

  .layoutNav {
    width: 10rem;
    order: 1;
    position: relative;
    transition: width 0.3s ease; // 添加宽度过渡动画

    .nav-area {
      position: fixed;
      width: 10rem;
      transition: width 0.3s ease; // 添加宽度过渡动画
    }
  }

  .pagerouter {
    flex: 1;
    order: 2;
    min-width: 320px;
    min-height: 0; // 关键：允许 flex 子项正确收缩
    overflow-y: auto; // 关键：创建内部滚动

    // 隐藏滚动条（兼容所有浏览器）
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */

    &::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Opera */
    }
  }

  .sidebar-area {
    width: 15rem;
    order: 3;
    overflow-y: auto;

    // 隐藏滚动条
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */

    &::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Opera */
    }
  }

  // 响应式：收缩导航栏
  @media (max-width: 980px) {
    .layoutNav {
      width: 4rem; // 64px，给图标足够空间

      .nav-area {
        width: 4rem;
      }
    }

    // 小屏幕隐藏右侧栏
    .sidebar-area {
      display: none;
    }
  }

  // 中等屏幕调整右侧栏宽度
  @media (max-width: 1200px) {
    .sidebar-area {
      width: 12rem;
    }
  }
}
</style>
