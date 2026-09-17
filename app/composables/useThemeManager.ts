// app/composables/useThemeManager.ts
import type { ThemeName, ThemeManager } from '~/types/theme'

const STORAGE_KEY = 'app-theme-preference'

export const useThemeManager = (): ThemeManager => {
  // ✅ Trocar useTheme() por $vuetify do Nuxt
  const { $vuetify } = useNuxtApp()

  const current = useState<ThemeName>('theme-manager:current', () => {
    return (import.meta.client ? (localStorage.getItem(STORAGE_KEY) as ThemeName) : null) ?? 'light'
  })

  const isDark = computed(() => {
    return current.value === 'dark'
  })

  const persist = (theme: ThemeName) => {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, theme)
    }
  }

  const setTheme = (theme: ThemeName) => {
    current.value = theme
    $vuetify.theme.change(theme)
    persist(theme)
  }

  const toggle = () => {
    const next: ThemeName = isDark.value ? 'light' : 'dark'
    setTheme(next)
  }

  const init = () => {
    $vuetify.theme.change(current.value)
  }

  return {
    current,
    isDark,
    setTheme,
    toggle,
    init,
  }
}
