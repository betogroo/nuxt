import type { ThemeName } from '~/types/theme'

interface VuetifyThemeInstance {
  change?: (name: string) => void
}

interface VuetifyPluginInstance {
  theme?: VuetifyThemeInstance
}

interface NuxtAppWithVuetify {
  $vuetify?: VuetifyPluginInstance
}

/**
 * Aplica o tema visual no framework de UI de forma desacoplada e segura contra falhas.
 */
export function applyUiTheme(theme: ThemeName): void {
  try {
    const nuxtApp = useNuxtApp() as unknown as NuxtAppWithVuetify
    if (nuxtApp?.$vuetify?.theme?.change) {
      nuxtApp.$vuetify.theme.change(theme)
    }
  } catch {
    // No-op quando executado fora do contexto do Nuxt/Vuetify (e.g. testes unitários puros)
  }
}
