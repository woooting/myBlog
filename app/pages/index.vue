<template>
  <div class="index-container">
    <!-- 轮播图区域 -->
    <div class="carousel-wrapper">
      <CarouselSwiper :items="carouselItems" :autoplay-delay="5000" />
    </div>
    <!-- 卡片列表 -->
    <div class="card-area">
      <div class="card-item" v-for="item in mockCards" :key="item.id">
        <!-- 图片区域：真实图片，高度自适应 -->
        <div class="img-area">
          <img :src="item.image" :alt="item.title" loading="lazy" />
        </div>
        <div class="text-area">
          <h3 class="text-ellipsis">{{ item.title }}</h3>
          <p class="text-clamp-3">{{ item.content }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { postsApi } from '../api/posts.api'

// 轮播图数据
const carouselItems = [
  {
    image: 'https://picsum.photos/1200/400?random=1',
    title: '第一张幻灯片',
    description: '这是第一张幻灯片的描述文字',
    link: '/post/1',
  },
  {
    image: 'https://picsum.photos/1200/400?random=2',
    title: '第二张幻灯片',
    description: '这是第二张幻灯片的描述文字',
  },
  {
    image: 'https://picsum.photos/1200/400?random=3',
    title: '第三张幻灯片',
  },
]

// 静态卡片数据 - 使用不同尺寸图片测试自适应
const mockCards = [
  {
    id: 1,
    title: '正方形图片测试',
    content: '这是一张 1:1 比例的正方形图片，卡片高度会根据图片自动调整。',
    image: 'https://picsum.photos/400/400?random=10',
  },
  {
    id: 2,
    title: '竖版图片测试',
    content: '这是一张 3:4 比例的竖版图片，比正方形更高一些。',
    image: 'https://picsum.photos/400/533?random=11',
  },
  {
    id: 3,
    title: '横版图片测试',
    content: '这是一张 16:9 比例的横版图片，高度较低但宽度很宽。',
    image: 'https://picsum.photos/400/225?random=12',
  },
  {
    id: 4,
    title: '超长竖版图片',
    content: '这是一张 9:16 比例的超长竖版图片，会形成很长的卡片。',
    image: 'https://picsum.photos/400/711?random=13',
  },
  {
    id: 5,
    title: '短横版图片',
    content: '这是一张较矮的横版图片，卡片会比较紧凑。',
    image: 'https://picsum.photos/400/200?random=14',
  },
  {
    id: 6,
    title: '中等高度图片',
    content: '这是一张中等高度的图片，展示不同比例的自适应效果。',
    image: 'https://picsum.photos/400/300?random=15',
  },
]
</script>
<style lang="scss">
.carousel-wrapper {
  width: 100%;
  margin: 0 auto;
  aspect-ratio: 16 / 5;
  border-radius: 12px;
  overflow: hidden;
}

.index-container {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;

  .card-area {
    margin-top: 10px;
    width: 100%;
    // 瀑布流核心：使用 CSS 列布局
    column-count: 2; // 列数
    column-gap: 10px; // 列间距

    .card-item {
      width: 100%;
      // 最小尺寸限制
      min-width: 280px;
      min-height: 200px;
      // 防止元素跨列断裂
      break-inside: avoid;
      // 确保整个卡片在同一列
      page-break-inside: avoid;
      margin-bottom: 10px; // 卡片垂直间距
      border: 1px solid #ccc;
      display: inline-block; // 必须是 inline-block 或 block
      background: var(--bg-primary);
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      .img-area {
        width: 100%;
        // 移除固定高度，让图片自然撑开
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

        img {
          width: 100%;
          height: auto; // 高度自适应，保持图片原始比例
          display: block;
          object-fit: cover;
        }
      }

      .text-area {
        padding: 12px;

        h3 {
          margin-bottom: 8px;
          font-size: 16px;
          color: var(--text-primary);
        }

        p {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
        }
      }
    }
  }
}

// 响应式：不同屏幕调整列数
@media (max-width: 768px) {
  .index-container .card-area {
    column-count: 1;
  }
}

// @media (max-width: 480px) {
//   .index-container .card-area {
//     column-count: 1;
//   }
// }
</style>
