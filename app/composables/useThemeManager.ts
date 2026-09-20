// app/composables/useThemeManager.ts
import type { ThemeName, ThemeManager } from '~/types/theme'
import type { Database } from '~/types/database.types'

const STORAGE_KEY = 'app-theme-preference'

export const useThemeManager = (): ThemeManager => {
  const { $vuetify } = useNuxtApp()
  const supabase = useSupabaseClient<Database>()

  // We use useProfile but without causing recursive reactivity issues
  const { profile } = useProfile()

  const current = useState<ThemeName>('theme-manager:current', () => {
    return (import.meta.client ? (localStorage.getItem(STORAGE_KEY) as ThemeName) : null) ?? 'light'
  })

  const isDark = computed(() => {
    return current.value === 'dark'
  })

  // Watcher to apply profile theme automatically upon login/loading
  if (import.meta.client) {
    watch(
      () => profile.value?.theme,
      (newTheme) => {
        if (
          newTheme &&
          newTheme !== current.value &&
          (newTheme === 'light' || newTheme === 'dark')
        ) {
          setTheme(newTheme as ThemeName, false)
        }
      },
    )
  }

  const persist = async (theme: ThemeName, updateDb: boolean = true) => {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, theme)
    }

    if (updateDb && profile.value?.id) {
      // Otimistic local update to avoid jumping
      if (profile.value.theme !== theme) {
        profile.value.theme = theme
        // Fire and forget DB update
        supabase.from('profiles').update({ theme }).eq('id', profile.value.id).then()
      }
    }
  }

  const setTheme = (theme: ThemeName, updateDb: boolean = true) => {
    current.value = theme
    $vuetify.theme.change(theme)
    persist(theme, updateDb)
  }

  const toggle = () => {
    const next: ThemeName = isDark.value ? 'light' : 'dark'
    setTheme(next, true)
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
