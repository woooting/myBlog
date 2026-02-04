<script setup lang="ts">
/**
 * CarouselSwiper - 带倒计时 Pagination 的轮播组件
 *
 * 功能特性：
 * - 自动播放，可配置切换时间
 * - 倒计时 Pagination：激活的点变成长条，进度条动画填充
 * - 支持手动切换（点击 Pagination、拖拽、箭头）
 * - 响应式设计
 */
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Autoplay, Pagination, Navigation } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'

import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

// ============================================================================
// Props 定义
// ============================================================================

interface Props {
  /** 轮播项内容（可以是图片 URL、HTML 字符串或组件） */
  items: Array<{
    /** 图片地址 */
    image?: string
    /** 标题 */
    title?: string
    /** 描述 */
    description?: string
    /** 链接地址 */
    link?: string
  }>
  /** 自动播放延迟时间（毫秒），默认 5000 */
  autoplayDelay?: number
  /** 是否显示导航箭头，默认 true */
  showArrows?: boolean
  /** 是否循环播放，默认 true */
  loop?: boolean
  /** Pagination 位置，默认 'bottom' */
  paginationPosition?: 'top' | 'bottom'
  /** TODO(human): 添加更多配置选项，如:
   * - 懒加载配置
   * - 视差效果
   * - 自定义过渡效果
   */
}

const props = withDefaults(defineProps<Props>(), {
  autoplayDelay: 5000,
  showArrows: false,
  loop: true,
  paginationPosition: 'bottom',
})

// ============================================================================
// Swiper 配置
// ============================================================================

const modules = [Autoplay, Pagination, Navigation]

// Swiper 实例引用
const swiperRef = ref<SwiperType>()

// 当前激活的索引
const activeIndex = ref(0)

// 分页配置 - 渲染自定义 HTML
const pagination = {
  clickable: true,
  renderBullet: (index: number, className: string) => {
    // 每个 bullet 包含一个进度条元素
    return `<span class="${className}">
      <span class="swiper-pagination-progress"></span>
    </span>`
  },
}

// 自动播放配置
const autoplay = computed(() => ({
  delay: props.autoplayDelay,
  disableOnInteraction: false, // 用户交互后不停止自动播放
  pauseOnMouseEnter: true, // 鼠标悬停时暂停
}))

// 导航配置
const navigation = computed(() => ({
  nextEl: '.swiper-button-next',
  prevEl: '.swiper-button-prev',
}))

// ============================================================================
// 事件处理
// ============================================================================

/** 幻灯片切换时更新索引 */
const onSlideChange = (swiper: SwiperType) => {
  activeIndex.value = swiper.realIndex
}

/** 鼠标进入时暂停自动播放 */
const onMouseEnter = () => {
  swiperRef.value?.autoplay.stop()
}

/** 鼠标离开时恢复自动播放 */
const onMouseLeave = () => {
  swiperRef.value?.autoplay.start()
}

// ============================================================================
// 渲染辅助函数
// ============================================================================</script>

<template>
  <div
    class="carousel-swiper-container"
    :class="`pagination-${paginationPosition}`"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <Swiper
      ref="swiperRef"
      :modules="modules"
      :autoplay="autoplay"
      :loop="loop"
      :pagination="pagination"
      :navigation="showArrows ? navigation : false"
      :slides-per-view="1"
      :space-between="0"
      :speed="600"
      :grab-cursor="true"
      :resistance-ratio="0.85"
      class="carousel-swiper"
      @slide-change="onSlideChange"
    >
      <SwiperSlide v-for="(item, index) in items" :key="index" class="carousel-slide">
        <!-- 如果有链接，包裹整个内容 -->
        <a v-if="item.link" :href="item.link" class="carousel-link">
          <div class="carousel-slide-content">
            <img
              v-if="item.image"
              :src="item.image"
              :alt="item.title || `Slide ${index + 1}`"
              class="carousel-image"
              draggable="false"
            />
            <div v-if="item.title || item.description" class="carousel-text">
              <h2 v-if="item.title" class="carousel-title">{{ item.title }}</h2>
              <p v-if="item.description" class="carousel-description">{{ item.description }}</p>
            </div>
          </div>
        </a>
        <!-- 没有链接，直接显示内容 -->
        <div v-else class="carousel-slide-content">
          <img
            v-if="item.image"
            :src="item.image"
            :alt="item.title || `Slide ${index + 1}`"
            class="carousel-image"
            draggable="false"
          />
          <div v-if="item.title || item.description" class="carousel-text">
            <h2 v-if="item.title" class="carousel-title">{{ item.title }}</h2>
            <p v-if="item.description" class="carousel-description">{{ item.description }}</p>
          </div>
        </div>
      </SwiperSlide>

      <!-- 导航箭头 -->
      <template v-if="showArrows" #container-end>
        <div class="swiper-button-prev">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </div>
        <div class="swiper-button-next">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </template>
    </Swiper>
  </div>
</template>

<style scoped>
/* ============================================================================
 * 容器样式
 * ============================================================================ */

.carousel-swiper-container {
  position: relative;
  width: 100%;
  background: #000;
  overflow: hidden;
}

/* Pagination 位置 */
.pagination-top .swiper-pagination {
  top: 16px;
  bottom: auto;
}

.pagination-bottom .swiper-pagination {
  bottom: 16px;
}

/* ============================================================================
 * Swiper 样式覆盖
 * ============================================================================ */

.carousel-swiper {
  width: 100%;
  height: 100%;
}

.carousel-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
}

/* 幻灯片内容 */
.carousel-slide-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel-link {
  text-decoration: none;
  color: inherit;
  display: block;
  width: 100%;
  height: 100%;
}

/* 图片样式 */
.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  -webkit-user-drag: none;
}

/* 文字覆盖层 */
.carousel-text {
  position: absolute;
  bottom: 80px;
  left: 40px;
  right: 40px;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.carousel-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.carousel-description {
  font-size: 1rem;
  margin: 0;
  opacity: 0.9;
}

/* ============================================================================
 * Pagination 自定义样式（核心：倒计时效果）
 * ============================================================================ */

/* Pagination 容器 */
.carousel-swiper :deep(.swiper-pagination) {
  display: flex;
  justify-content: center; /* 居中对齐 */
  gap: 8px;
  z-index: 10;
}

/* 每个 Pagination 点 */
.carousel-swiper :deep(.swiper-pagination-bullet) {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  opacity: 1;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden; /* 隐藏溢出的进度条 */
  margin: 0 !important;
}

/* 激活状态：变成长条 */
.carousel-swiper :deep(.swiper-pagination-bullet-active) {
  width: 32px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
}

/* 进度条元素 */
.carousel-swiper :deep(.swiper-pagination-progress) {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  transform: scaleX(0); /* 初始状态：宽度为 0 */
  transform-origin: left; /* 从左边开始扩展 */
}

/* 激活时播放倒计时动画 */
.carousel-swiper :deep(.swiper-pagination-bullet-active .swiper-pagination-progress) {
  /* 使用 CSS 变量动态设置动画时长 */
  animation: progress-fill v-bind('autoplayDelay + "ms"') linear forwards;
}

/* 倒计时动画：从左到右填充 */
@keyframes progress-fill {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

/* ============================================================================
 * 导航箭头样式
 * ============================================================================ */

.swiper-button-prev,
.swiper-button-next {
  width: 44px;
  height: 44px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.swiper-button-prev:hover,
.swiper-button-next:hover {
  background: rgba(0, 0, 0, 0.6);
  transform: scale(1.1);
}

.swiper-button-prev::after,
.swiper-button-next::after {
  display: none; /* 隐藏默认箭头 */
}

.swiper-button-prev svg,
.swiper-button-next svg {
  width: 20px;
  height: 20px;
  color: white;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.swiper-button-prev {
  left: 16px;
}

.swiper-button-next {
  right: 16px;
}

/* ============================================================================
 * 响应式设计
 * ============================================================================ */

@media (max-width: 768px) {
  .carousel-text {
    bottom: 60px;
    left: 20px;
    right: 20px;
  }

  .carousel-title {
    font-size: 1.5rem;
  }

  .carousel-description {
    font-size: 0.875rem;
  }

  .swiper-button-prev,
  .swiper-button-next {
    width: 36px;
    height: 36px;
  }

  .swiper-button-prev svg,
  .swiper-button-next svg {
    width: 16px;
    height: 16px;
  }
}
</style>
