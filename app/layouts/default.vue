<template>
  <AppFloatingBar />
  <div class="default-layout">
    <div class="box-border content">
      <div class="layoutNav">
        <div class="nav-area">
          <NavList></NavList>
        </div>
      </div>
      <div class="pagerouter"><NuxtPage /></div>
      <div class="unkonwn">unkonwn</div>
    </div>
  </div>
</template>
<script setup lang="ts"></script>

<style lang="scss" scoped>
.default-layout {
  height: 100vh;
  display: flex;
}

.content {
  gap: 10px;
  position: relative;
  width: 100%;
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
  }

  .unkonwn {
    width: 15rem;
    order: 3;
    border: 1px solid black;
  }

  // 响应式：收缩导航栏
  @media (max-width: 980px) {
    .layoutNav {
      width: 4rem; // 64px，给图标足够空间

      .nav-area {
        width: 4rem;
      }
    }
  }
}
</style>
