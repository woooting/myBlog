<template>
  <div class="floating-bar">
    <!-- 左侧：Logo -->
    <div class="bar-left">
      <span class="logo">MyBlog</span>
    </div>

    <!-- 右侧：图标 -->
    <div class="bar-right">
      <button class="icon-btn">
        <Icon name="lucide:search" />
      </button>
      <button class="icon-btn theme-btn" @click="toggleTheme">
        <Icon :name="isDark ? 'lucide:moon' : 'lucide:sun'" />
      </button>
      <button class="icon-btn">
        <Icon name="lucide:bell" />
      </button>
      <button class="icon-btn">
        <Icon name="lucide:user" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { theme, toggleTheme, isDark } = useTheme()
</script>

<style lang="scss" scoped>
.floating-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  display: flex;
  align-items: center;
  justify-content: space-between;

  width: 100%;
  height: 60px;
  padding: 0 2rem;

  background: rgba(218, 217, 217, 0.7);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-color);

  z-index: 1000;
}

.dark .floating-bar {
  background: rgba(24, 24, 24, 0.7);
}

.bar-left {
  .logo {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.5px;
  }
}

.bar-right {
  display: flex;
  gap: 0.5rem;

  .icon-btn {
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);

    &:hover {
      background: var(--bg-tertiary);
    }

    &:active {
      transform: scale(0.95);
    }
  }
}
</style>
