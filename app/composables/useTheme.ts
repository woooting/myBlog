export type Theme = 'light' | 'dark'

export const useTheme = () => {
  const theme = useState<Theme>('theme', () => 'light')

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme.value === 'dark')
    }
  }

  onMounted(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme.value === 'dark')
    }
  })

  return {
    theme: readonly(theme),
    toggleTheme,
    isDark: computed(() => theme.value === 'dark')
  }
}
