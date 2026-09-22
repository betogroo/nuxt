// app/types/theme.ts
export type ThemeName = 'light' | 'dark'

export interface ThemeManager {
  current: Ref<ThemeName>
  isDark: ComputedRef<boolean>
  setTheme: (theme: ThemeName) => void
  toggle: () => void
  init: () => void
}
