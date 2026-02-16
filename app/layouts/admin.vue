<template>
  <div class="admin-layout">
    <div class="admin-sidebar">
      <NavList :nav-list="adminNavList" />
    </div>
    <div class="admin-content">
      <NuxtPage />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NavItem } from '@app/components/NavList.vue'

const adminNavList: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/admin',
    iconname: 'lucide:layout-dashboard',
  },
  {
    name: '文章管理',
    path: '/admin/system/articles',
    iconname: 'lucide:file-text',
  },
  {
    name: 'editor',
    path: '/admin/system/editor',
    iconname: 'lucide:edit-3',
  }
]
</script>

<style lang="scss" scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}

.admin-sidebar {
  width: 10rem;
  border-right: 1px solid var(--border-color);


  @media(max-width: 980px) {
    width : 4rem;

  }
}

.admin-content {
  flex: 1;
  padding: 20px;
}
</style>
