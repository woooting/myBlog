<template>
  <div class="floating-bar">
    <!-- 左侧：Logo -->
    <div class="bar-left">
      <span class="logo">MyBlog</span>
    </div>

    <!-- 中间：搜索框 -->
    <div class="bar-center">
      <input type="text" placeholder="搜索文章..." class="search-input" />
    </div>

    <!-- 右侧：图标 -->
    <div class="bar-right">
      <button class="icon-btn">🌙</button>
      <button class="icon-btn">🔔</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// 后续可以添加搜索、主题切换等功能
</script>

<style lang="scss" scoped>
.floating-bar {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);

  display: flex;
  align-items: center;
  gap: 1.5rem;

  width: 90%;
  max-width: 600px;
  padding: 0.75rem 1.5rem;

  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 999px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

  z-index: 1000;
}

.bar-left {
  .logo {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    letter-spacing: -0.5px;
  }
}

.bar-center {
  flex: 1;

  .search-input {
    width: 100%;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 999px;
    background: #f5f5f5;
    font-size: 0.9rem;
    outline: none;
    transition: all 0.2s;

    &:focus {
      background: #ebebeb;
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05);
    }

    &::placeholder {
      color: #999;
    }
  }
}

.bar-right {
  display: flex;
  gap: 0.5rem;

  .icon-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: #f5f5f5;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #ebebeb;
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.95);
    }
  }
}
</style>
