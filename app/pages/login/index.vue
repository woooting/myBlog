<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Logo 区域 -->
      <div class="login-header">
        <h1 class="logo">MyBlog</h1>
        <p class="subtitle">欢迎回来，请登录您的账号</p>
      </div>

      <!-- 登录按钮列表 -->
      <div class="login-buttons">
        <button
          v-for="provider in providers"
          :key="provider.id"
          @click="handleLogin(provider.id)"
          class="login-btn"
          :class="`provider-${provider.id}`"
        >
          <Icon :name="provider.id === 'google' ? 'lucide:chrome' : 'lucide:github'" />
          <span>使用 {{ provider.name }} 登录</span>
        </button>
      </div>

      <!-- 提示信息 -->
      <div class="login-footer">
        <p>登录即表示您同意我们的服务条款和隐私政策</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 获取认证状态和提供商
const { signIn, getProviders } = useAuth()
const toast = useToastNotification()

// 响应式存储 providers 数据
const providers = ref()

// 页面元数据
definePageMeta({
  layout: 'login',
  auth: false, // 登录页面不需要认证
})

// 组件挂载后获取 providers
onMounted(async () => {
  providers.value = await getProviders()
})

// 处理登录
const handleLogin = (providerId: string) => {
  const providerName = providerId === 'github' ? 'GitHub' : 'Google'
  toast.info(`正在跳转到 ${providerName} 授权页面...`)
  // 在 callbackUrl 中添加标志参数
  signIn(providerId, { callbackUrl: '/?login=success' })
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 2rem;
}

.login-container {
  width: 100%;
  max-width: 420px;
  padding: 3rem 2.5rem;
  border-radius: 24px;
  background: var(--bg-secondary);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08),
              0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  text-align: center;
}

.dark .login-container {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
              0 2px 8px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.08);
}

.login-header {
  margin-bottom: 2.5rem;

  .logo {
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--accent-color) 0%, #0051d5 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.75rem;
  }

  .subtitle {
    font-size: 1rem;
    color: var(--text-secondary);
    font-weight: 400;
  }
}

.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    border-color: var(--accent-color);
  }

  &:active {
    transform: translateY(0);
  }
}

.dark .login-btn {
  background: var(--bg-tertiary);
  border-color: rgba(255, 255, 255, 0.08);
}

.login-footer {
  padding-top: 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);

  p {
    font-size: 0.875rem;
    color: var(--text-tertiary);
    line-height: 1.6;
  }
}

.dark .login-footer {
  border-top-color: rgba(255, 255, 255, 0.08);
}
</style>
