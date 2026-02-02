<template>
  <AppFloatingBar />
  <div class="default-layout">
    <div class="box-border content">
      <div class="layoutNav">
        <div class="nav-area">
          <NavList></NavList>
        </div>
      </div>
      <div class="unkonwn">unkonwn</div>
      <div class="pagerouter"><NuxtPage /></div>
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
  margin: 0 200px;
  padding-top: 90px;
  flex: 1;
  display: flex;

  .layoutNav {
    width: 10rem;
    order: 1;
    position: relative;

    .nav-area {
      position: fixed;
      width: 10rem;
    }
  }

  .pagerouter {
    flex: 1;
    order: 2;
    border: 1px solid black;
  }

  .unkonwn {
    width: 15rem;
    order: 3;
    border: 1px solid black;
  }
}
</style>
