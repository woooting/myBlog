<script setup lang="ts">
/**
 * 响应式图片卡片组件
 * 支持多种比例，完全响应式适配
 */

interface Props {
  src: string
  alt?: string
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'story'
  rounded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  alt: '图片',
  aspectRatio: 'square',
  rounded: true,
})

// 比例映射
const ratioMap = {
  square: '1 / 1', // 正方形 1:1
  portrait: '3 / 4', // 竖版 3:4
  landscape: '16 / 9', // 横版 16:9
  story: '9 / 16', // 竖屏 9:16
}

// 图片加载失败处理
const imgError = (event: Event) => {
  const img = event.target as HTMLImageElement
  // 设置占位图
  img.src =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E'
}
</script>

<template>
  <div
    class="image-card"
    :class="{
      rounded: rounded,
      [`aspect-${aspectRatio}`]: aspectRatio,
    }"
  >
    <!-- 响应式图片：aspect-ratio 控制容器比例，object-fit 控制图片填充 -->
    <img :src="src" :alt="alt" loading="lazy" decoding="async" @error="imgError" />
  </div>
</template>

<style scoped lang="scss">
.image-card {
  width: 100%;
  overflow: hidden;
  background: #f5f5f5;
  position: relative;
  &.aspect-square {
    aspect-ratio: 1 / 1;
  }
  &.aspect-portrait {
    aspect-ratio: 3 / 4;
  }
  &.aspect-landscape {
    aspect-ratio: 16 / 9;
  }
  &.aspect-story {
    aspect-ratio: 9 / 16;
  }

  // 圆角变体
  &.rounded {
    border-radius: 8px;
  }

  // 图片样式
  img {
    transition: transform 0.3s ease;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  // 悬停效果
  &:hover {
    img {
      transform: scale(1.05);
    }
  }
}
</style>
