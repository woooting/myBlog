<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout></NuxtLayout>
</template>
<script setup lang="ts">
const clickTexts = ['干嘛~', '还点!', '差不多得了！', '嗯？', '闹够了没有']
let currentIndex = 0

onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    // 排除按钮、链接、输入框等
    if (
      target.tagName === 'DIV' ||
      target.tagName === 'BODY' ||
      target.classList.contains('content')
    ) {
      createFloatingText(e.clientX, e.clientY)
    }
  })
})

function createFloatingText(x: number, y: number) {
  const text = clickTexts[currentIndex]!
  currentIndex = (currentIndex + 1) % clickTexts.length

  const el = document.createElement('div')
  el.textContent = text
  el.className = 'click-effect'
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  document.body.appendChild(el)

  // 动画结束后移除元素
  setTimeout(() => {
    el.remove()
  }, 1000)
}
</script>

<style>
.click-effect {
  position: fixed;
  pointer-events: none;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--accent-color);
  animation: floatUp 1s ease-out forwards;
  z-index: 9999;
}

@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translate(-50%, -150%) scale(0.8);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -750%) scale(1.2);
  }
}
</style>
